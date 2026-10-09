import { useEffect, useRef, useState } from "react";
import { GameBoard } from "./GameBoard";
import { evaluate, outcomeId, starsFor } from "./evaluate";
import type { Node, LearningEvent } from "../domain/types";
import { correctionReviewed } from "../domain/learningRules";
import { ClinicalArt } from "../art/ClinicalArt";
import { useLanguage } from "../i18n";
import { getDb } from "../storage/db";
import { getContent } from "../content/registry";
const sourcePath = {
  S: "/resources/pelvic-fracture-medical-student-2024.pdf",
  H: "/resources/pelvic-fracture-teaching-handout-th.pdf",
  LP: "/resources/pelvic-injury-teaching-plan-th.pdf",
};
export function MiniGameStation({
  node,
  events,
  emit,
  onNext,
  partition,
  character = 1,
  step,
  totalSteps,
}: {
  node: Node;
  character?: number;
  step?: number;
  totalSteps?: number;
  events: LearningEvent[];
  emit(data: Record<string, unknown>): Promise<boolean>;
  onNext(): void;
  partition: string;
}) {
  const { language } = useLanguage();
  const t = (en: string, th: string) => (language === "th" ? th : en);
  const first = events.find(
    (e) => e.type === "core_response" && e.nodeId === node.id,
  ) as Extract<LearningEvent, { type: "core_response" }> | undefined;
  const feedback = events.some(
    (e) => e.type === "feedback_ack" && e.nodeId === node.id,
  );
  const retries = events.filter(
    (e) => e.type === "correction_response" && e.correctionId === node.retryId,
  ) as Extract<LearningEvent, { type: "correction_response" }>[];
  const last = retries.at(-1),
    reviewed = last && correctionReviewed(events, last);
  const correct = Boolean(
      first && evaluate(node.game!, first.gameAnswer).correct,
    ),
    fixed = Boolean(
      last && evaluate(node.game!, last.gameAnswer).correct && reviewed,
    );
  const pendingReview = Boolean(last && !reviewed);
  const [answer, setAnswer] = useState<unknown>(null),
    [round, setRound] = useState(0),
    [roundAnswers, setRoundAnswers] = useState<unknown[]>([]),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState(""),
    [confidence, setConfidence] = useState(""),
    [loaded, setLoaded] = useState(false),
    [loadedKey, setLoadedKey] = useState(""),
    [sound, setSound] = useState(false),
    [rush, setRush] = useState(false),
    [elapsed, setElapsed] = useState(0);
  const saving = useRef(false);
  // Time on task and hint use are recorded for the teacher's analysis; they never change the score.
  const startedAt = useRef(Date.now());
  const hintsUsed = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    startedAt.current = Date.now();
    hintsUsed.current = 0;
  }, [node.id]);
  const draftKey = `minigame:${partition}:${node.contentVersion}:${node.id}:${retries.length}:${feedback ? "correction" : "initial"}`;
  const prepared = events.find(
    (e) => e.type === "handover_prepared" && e.nodeId === node.id,
  ) as Extract<LearningEvent, { type: "handover_prepared" }> | undefined;
  useEffect(() => {
    let active = true;
    setLoaded(false);
    void getDb()
      .then((db) => db.get("settings", draftKey))
      .then((saved) => {
        if (active) {
          const v = saved?.value as
            | {
                answer?: unknown;
                round?: number;
                roundAnswers?: unknown[];
                reason?: string;
                confidence?: string;
              }
            | undefined;
          if (v) {
            setAnswer(v.answer);
            setRound(v.round ?? 0);
            setRoundAnswers(v.roundAnswers ?? []);
            setReason(v.reason ?? "");
            setConfidence(v.confidence ?? "");
          }
          setLoadedKey(draftKey);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) {
          setLoadedKey(draftKey);
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [draftKey]);
  useEffect(() => {
    if (
      loaded &&
      loadedKey === draftKey &&
      (!first || (feedback && !correct && !pendingReview && !fixed))
    )
      void getDb()
        .then((db) =>
          db.put("settings", {
            key: draftKey,
            value: { answer, round, roundAnswers, reason, confidence },
          }),
        )
        .catch(() => undefined); // A draft is a convenience; the learner can still submit.
  }, [
    answer,
    round,
    roundAnswers,
    reason,
    confidence,
    loaded,
    first,
    feedback,
    correct,
    pendingReview,
    fixed,
    draftKey,
    loadedKey,
  ]);
  useEffect(() => {
    if (!rush || first) return;
    const timer = window.setInterval(
      () => setElapsed((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [rush, first]);
  // Post-test form alternates by learner; the pre-test always uses the other form.
  const postForm =
    [...partition].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2
      ? "B"
      : "A";
  const isPretest = node.stage === "pretest";
  // Test items show no source pages or review notes before the first answer (pre-test: never).
  const form = isPretest ? (postForm === "A" ? "B" : "A") : postForm;
  const authored = node.game!,
    spec = authored.variants?.[form] ?? authored,
    parts = spec.rounds ?? [spec],
    current = parts[round];
  const makeAnswer = () => {
    const raw = spec.rounds ? [...roundAnswers, answer] : answer;
    return authored.variants ? { form, answer: raw } : raw;
  };
  const check = async () => {
    if (saving.current) return;
    if (round < parts.length - 1) {
      setRoundAnswers((p) => [...p, answer]);
      setRound((r) => r + 1);
      setAnswer(null);
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
    const raw = makeAnswer(),
      result = evaluate(authored, raw);
    const timing = {
      elapsedMs: Math.max(0, Date.now() - startedAt.current),
      hintsUsed: hintsUsed.current,
    };
    await emit(
      first
        ? {
            type: "correction_response",
            correctionId: node.retryId,
            selectedOptionId: outcomeId(node.retryId, authored, raw),
            gameAnswer: raw,
            gameScore: result.score,
            feedbackAcknowledged: false,
            ...timing,
          }
        : {
            type: "core_response",
            nodeId: node.id,
            selectedOptionIds: [outcomeId(node.id, authored, raw)],
            presentationOrder: spec.cards.map((c) => c.id),
            gameAnswer: raw,
            gameScore: result.score,
            ...(node.rationaleRequired
              ? { rationale: prepared?.text ?? reason.trim() }
              : reason.trim()
                ? { rationale: reason.trim() }
                : {}),
            ...(confidence ? { confidence } : {}),
            ...timing,
          },
    );
    startedAt.current = Date.now();
    if (sound) {
      try {
      const audio = new AudioContext();
      const oscillator = audio.createOscillator(),
        gain = audio.createGain();
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.frequency.value = result.correct ? 660 : 330;
      gain.gain.setValueAtTime(0.06, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.18);
      oscillator.onended = () => void audio.close();
      } catch {
        // Sound is optional; a blocked audio device must never lock the station.
      }
    }
    requestAnimationFrame(() => heading.current?.focus());
    } finally {
      setBusy(false);
      saving.current = false;
    }
  };
  const reset = () => {
    setRound(0);
    setRoundAnswers([]);
    setAnswer(null);
  };
  const key = node.translation!.key[language],
    why = node.translation!.why[language];
  const showFeedback = Boolean(first && !isPretest && (!feedback || pendingReview));
  const testLocked = isPretest || (node.stage === "gauntlet" && !first);
  // Name the cards the learner got wrong, so feedback is about their answer, not generic.
  const wrongCards = (() => {
    const response = pendingReview ? last : first;
    if (!response || !node.game) return [] as string[];
    const result = evaluate(node.game, response.gameAnswer);
    if (result.correct) return [];
    const allCards = (spec: typeof node.game): typeof node.game.cards => [
      ...spec.cards,
      ...(spec.rounds ?? []).flatMap(allCards),
      ...(spec.variants ? [...allCards(spec.variants.A), ...allCards(spec.variants.B)] : []),
    ];
    const labels = new Map(allCards(node.game).map((card) => [`misplaced_${card.id}`, card.label[language]]));
    return [...new Set(result.mistakes.map((code) => labels.get(code)).filter(Boolean) as string[])];
  })();
  const figures = (node.visuals ?? []).filter(visual => visual.placement === (showFeedback ? "feedback" : "question")).map(visual => getContent(node.contentVersion).assets.find(asset => asset.id === visual.assetId)).filter(asset => Boolean(asset?.path));
  return (
    <section className="mini-station stack">
      <div className="mini-story">
        <img
          src={
            node.missionId === "mission-0" || node.missionId === "mission-pre"
              ? `/assets/upgrades/character-${character}-level-1.png`
              : `/assets/patients-v2/patient-${Math.min(3, Number(node.missionId.split("-")[1]) || 1)}.png`
          }
          alt={t("Fictional teaching character", "ตัวละครจำลองเพื่อเรียน")}
        />
        <div>
          <small>
            {node.stage === "practice"
              ? t("STATION", "สถานี")
              : node.stage === "boss"
                ? t("BOSS RECALL", "BOSS ทบทวน")
                : node.stage === "pretest"
                  ? t("PRE-TEST", "แบบทดสอบก่อนเรียน")
                  : t("TRAUMA SHIFT · POST-TEST", "เวรสุดท้าย · แบบทดสอบหลังเรียน")}{" "}
            · {node.id}
          </small>
          <p>{node.translation!.story[language]}</p>
        </div>
      </div>
      <h1>{node.translation!.title[language]}</h1>
      {figures.map(asset => <figure className="case-figure" key={asset!.id}><a href={asset!.path!} target="_blank" rel="noreferrer"><img src={asset!.path!} alt={asset!.altText} loading="lazy" /></a><figcaption>{t("Teaching example, not this patient's image. Tap to enlarge.", "ภาพตัวอย่าง ไม่ใช่ภาพผู้ป่วยเคสนี้ แตะเพื่อขยาย")} <a href={asset!.sourceUrl ?? undefined} target="_blank" rel="noreferrer">{t("Source page", "หน้าเอกสาร")}</a></figcaption></figure>)}
      {step !== undefined && <p className="task-guide">{t(`Decision ${step} of ${totalSteps} in this case`, `การตัดสินใจ ${step} จาก ${totalSteps} ในเคสนี้`)} · {t("1 Choose → 2 Confirm → 3 Review", "1 เลือก → 2 ยืนยัน → 3 ทบทวน")}</p>}
      <div className="learner-reaction">
        <img
          src={`/assets/reactions/character-${character}-${showFeedback ? (correct ? "celebrate" : "reconsider") : first && (correct || fixed) ? "celebrate" : node.rationaleRequired ? "communicate" : node.missionId === "mission-1" ? "urgent" : "inspect"}.png`}
          alt={t(
            "Learner expression reflects the learning task, not a patient outcome",
            "สีหน้าผู้เรียนตามกิจกรรม ไม่ใช่ผลลัพธ์ผู้ป่วย",
          )}
        />
        <span>
          {t(
            "Think • act with the team • review",
            "คิด • ทำงานร่วมทีม • ทบทวน",
          )}
        </span>
      </div>
      <details className="source-note">
        <summary>
          {t(
            "Patient chart / earlier evidence",
            "Patient chart / ข้อมูลก่อนหน้า",
          )}
        </summary>
        <p>{node.translation!.story[language]}</p>
        {events
          .filter(
            (e) =>
              e.type === "core_response" &&
              e.nodeId.startsWith(node.id.slice(0, 2)),
          )
          .map((e) => {
            if (e.type !== "core_response" || e.nodeId === node.id) return null;
            const earlier = getContent(node.contentVersion).nodes.find(item => item.id === e.nodeId);
            return <p key={e.eventId}>{earlier?.translation?.story[language] ?? earlier?.stem}</p>;
          })}
      </details>
      <p className="draft-label">
        {t(
          getContent(node.contentVersion).governance.status === "approved" ? "Educator-approved teaching • supervised student role • not a treatment order" : "Draft teaching content • supervised student role • not a treatment order",
          getContent(node.contentVersion).governance.status === "approved" ? "เนื้อหาที่อาจารย์อนุมัติ • นักศึกษาภายใต้การกำกับ • ไม่ใช่คำสั่งรักษา" : "เนื้อหาฉบับร่าง • นักศึกษาภายใต้การกำกับ • ไม่ใช่คำสั่งรักษา",
        )}
      </p>
      {node.reviewNote && !testLocked && (
        <aside className="draft-label">
          {t(
            "Source comparison — not a bedside order. Review the source discrepancy before playing.",
            "เปรียบเทียบเอกสาร ไม่ใช่คำสั่งรักษา ทบทวนข้อแตกต่างก่อนเล่น",
          )}
          <details>
            <summary>
              {t(
                "Educator review note (English)",
                "หมายเหตุสำหรับอาจารย์ (English)",
              )}
            </summary>
            <p>{node.reviewNote}</p>
          </details>
        </aside>
      )}
      {!first && node.rationaleRequired && !prepared ? (
        <>
          <label>
            {t(
              "Before the handover: one short reason connecting findings, priorities and uncertainty.",
              "ก่อน handover: เหตุผลสั้น ๆ เชื่อมข้อมูล ลำดับสำคัญ และความไม่แน่ชัด",
            )}
            <textarea
              maxLength={360}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            className="primary"
            disabled={!reason.trim() || busy}
            onClick={async () => {
              setBusy(true);
              await emit({
                type: "handover_prepared",
                nodeId: node.id,
                text: reason.trim(),
              });
              setBusy(false);
            }}
          >
            {t("Save reason; build handover", "บันทึกเหตุผล แล้วจัด handover")}
          </button>
        </>
      ) : showFeedback ? (
        <article className="game-feedback" role="status">
          <ClinicalArt
            kind={spec.art}
            state={
              correct ||
              (pendingReview && last?.selectedOptionId.endsWith("PASS"))
                ? "reward"
                : "review"
            }
            ariaLabel={t(
              "Learning feedback; patient condition has not changed",
              "Feedback การเรียน อาการผู้ป่วยไม่ได้เปลี่ยน",
            )}
          />
          {(() => {
            const passed = pendingReview
              ? Boolean(last?.selectedOptionId.endsWith("PASS"))
              : correct;
            return (
              <p className={passed ? "result-line ok" : "result-line retry"}>
                <span aria-hidden="true">{passed ? "✓" : "↻"}</span>{" "}
                {passed
                  ? pendingReview
                    ? t("Correct on the correction round.", "รอบแก้ไขถูกต้องแล้ว")
                    : t("Correct on your first try!", "ถูกต้องตั้งแต่ครั้งแรก!")
                  : pendingReview
                    ? t("Not yet — read the explanation, then try the correction round again.", "ยังไม่ถูก — อ่านคำอธิบาย แล้วลองรอบแก้ไขอีกครั้ง")
                    : t("Not yet — read why, then a correction round opens.", "ยังไม่ถูก — อ่านเหตุผล แล้วจะเปิดรอบแก้ไข")}
              </p>
            );
          })()}
          {wrongCards.length > 0 && (
            <div className="wrong-cards">
              <strong>{t("Look again at:", "ลองดูอีกครั้ง:")}</strong>
              <ul>
                {wrongCards.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </div>
          )}
          <h2 ref={heading} tabIndex={-1}>
            {t(
              "Key evidence → meaning → supervised action",
              "หลักฐาน → ความหมาย → การดำเนินการภายใต้การกำกับ",
            )}
          </h2>
          <p>{key}</p>
          <details>
            <summary>{t("Why?", "เพราะอะไร?")}</summary>
            <p>{why}</p>
            {node.reviewNote && (
              <p className="draft-label">
                {t(
                  "Source discrepancy: discuss with your educator.",
                  "เอกสารมีข้อแตกต่าง ให้อภิปรายกับอาจารย์",
                )}
              </p>
            )}
          </details>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await emit(
                pendingReview
                  ? {
                      type: "correction_feedback_ack",
                      correctionId: node.retryId,
                      responseEventId: last!.eventId,
                    }
                  : { type: "feedback_ack", nodeId: node.id },
              );
              reset();
              setBusy(false);
            }}
          >
            {pendingReview
              ? t(
                  "I reviewed the correction explanation",
                  "อ่านคำอธิบายการแก้ไขแล้ว",
                )
              : t("I reviewed the evidence", "อ่านหลักฐานแล้ว")}
          </button>
        </article>
      ) : first && isPretest ? (
        <article className="game-feedback">
          <h2 ref={heading} tabIndex={-1}>{t("Answer saved", "บันทึกคำตอบแล้ว")}</h2>
          <p>
            {t(
              "Pre-test answers are not marked now. You will see your score after the last item, and every topic comes back in the cases.",
              "คำตอบแบบทดสอบก่อนเรียนยังไม่เฉลยตอนนี้ จะเห็นคะแนนหลังข้อสุดท้าย และทุกหัวข้อจะได้ฝึกในเคส",
            )}
          </p>
          <button className="primary" onClick={onNext}>
            {node.nextNodeId ? t("Next item", "ข้อถัดไป") : t("See my pre-test score", "ดูคะแนนก่อนเรียน")}
          </button>
        </article>
      ) : first && (correct || fixed) ? (
        <article className="game-feedback reward-pop">
          <h2 ref={heading} tabIndex={-1}>{t("Station cleared!", "ผ่านสถานีแล้ว!")}</h2>
          <div
            className="station-stars"
            aria-label={t(`${starsFor(first.gameScore ?? 0)} of 3 stars`, `${starsFor(first.gameScore ?? 0)} จาก 3 ดาว`)}
          >
            {"★".repeat(starsFor(first.gameScore ?? 0))}
          </div>
          <p>{key}</p>
          <p>
            {node.stage === "practice"
              ? correct
                ? t("10 reward collected", "เก็บ 10 reward แล้ว")
                : t(
                    "8 corrected reward collected",
                    "เก็บ 8 reward จากการแก้ไขแล้ว",
                  )
              : t(
                  "Recall stamp collected; no extra reward farming.",
                  "เก็บตราทบทวนแล้ว ไม่มี reward ซ้ำ",
                )}
          </p>
          <small>
            {t(
              "This celebrates your learning, not a change in the patient's condition.",
              "ฉลองการเรียนรู้ ไม่ใช่การเปลี่ยนอาการผู้ป่วย",
            )}
          </small>
          <button className="primary" onClick={onNext}>
            {t("Continue", "ต่อไป")}
          </button>
        </article>
      ) : loaded ? (
        <>
          <p>
            {first
              ? t(
                  "Correction round — same skill, new card order",
                  "รอบแก้ไข — ทักษะเดิม สลับลำดับการ์ด",
                )
              : ""}
            {parts.length > 1 ? ` ${round + 1}/${parts.length}` : ""}
          </p>
          <GameBoard
            key={`${node.id}-${round}-${retries.length}-${loaded}`}
            spec={current}
            initialAnswer={answer}
            language={language}
            onChange={setAnswer}
            seed={retries.length + (node.stage === "gauntlet" ? 1 : 0)}
          />
          {!first && (
            <details>
              <summary>
                {t(
                  "Optional note / confidence",
                  "บันทึก / confidence (ไม่บังคับ)",
                )}
              </summary>
              {!node.rationaleRequired && (
                <label>
                  {t("My note", "บันทึกของฉัน")}
                  <textarea
                    maxLength={360}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
              )}
              <label>
                {t(
                  "Confidence (never affects reward)",
                  "Confidence (ไม่เปลี่ยน reward)",
                )}
                <select
                  value={confidence}
                  onChange={(event) => setConfidence(event.target.value)}
                >
                  <option value="">{t("Not recorded", "ไม่บันทึก")}</option>
                  <option value="low">{t("Low", "น้อย")}</option>
                  <option value="medium">{t("Medium", "ปานกลาง")}</option>
                  <option value="high">{t("High", "มาก")}</option>
                </select>
              </label>
            </details>
          )}
          <button
            className="primary game-check"
            disabled={busy || answer === null}
            onClick={check}
          >
            {round < parts.length - 1
              ? t("Next activity", "กิจกรรมถัดไป")
              : t("Check my work", "ตรวจคำตอบ")}
          </button>
        </>
      ) : (
        <p role="status">{t("Restoring your work…", "กำลังกู้คำตอบ…")}</p>
      )}
      {!isPretest && node.stage !== "gauntlet" && <details
        onToggle={(event) => {
          if (event.currentTarget.open) {
            hintsUsed.current += 1;
            void emit({
              type: "resource_viewed",
              resourceId: node.resourceIds[0],
              nodeId: node.id,
              stage: first ? "correction" : "question",
            });
          }
        }}
      >
        <summary>{t("Hint / reference card", "คำใบ้ / บัตรอ้างอิง")}</summary>
        <p>{key}</p>
      </details>}
      {showFeedback && <FeedbackFigure node={node} />}
      <div className="source-chips">
        {!testLocked && node.sourceRefs?.map((ref) => (
          <a
            key={ref.doc + ref.page}
            href={`${sourcePath[ref.doc]}#page=${ref.page}`}
            target="_blank"
            rel="noreferrer"
          >
            {ref.doc} p{ref.page} ↗
          </a>
        ))}
      </div>
      <details>
        <summary>
          {t(
            "Play settings (cosmetic only)",
            "ตั้งค่าการเล่น (ไม่เปลี่ยนคะแนน)",
          )}
        </summary>
        <label>
          <input
            type="checkbox"
            checked={sound}
            onChange={(e) => setSound(e.target.checked)}
          />
          {t("Sound (off by default)", "เสียง (ปิดเริ่มต้น)")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={rush}
            onChange={(e) => setRush(e.target.checked)}
          />
          {t("Rush practice — no score penalty", "Rush practice — ไม่หักคะแนน")}
        </label>
        {rush && (
          <p>
            <output>
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
            </output>{" "}
            {t(
              "Optional self-paced challenge. No deadline or learning-score effect.",
              "ท้าทายตนเองได้ ไม่มี deadline และไม่เปลี่ยนคะแนนการเรียน",
            )}
          </p>
        )}
      </details>
    </section>
  );
}

function FeedbackFigure({ node }: { node: Node }) {
  const { language } = useLanguage();
  const page = node.sourceRefs?.[0]?.page;
  const figure =
    node.sourceRefs?.[0]?.doc === "H" && page === 17
      ? "binder-manikin-page17.jpg"
      : node.sourceRefs?.[0]?.doc === "S" && page && [5, 11, 16, 38, 41, 44, 50].includes(page)
        ? `slide-${page}.jpg`
        : null;
  if (!figure) return null;
  return (
    <figure className="source-figure">
      <a href={`/assets/teaching/${figure}`} target="_blank" rel="noreferrer">
        <img
          src={`/assets/teaching/${figure}`}
          alt={
            language === "th"
              ? "ตัวอย่างภาพพร้อม annotation จากเอกสาร ใช้ประกอบ feedback ไม่ใช่ภาพใหม่ของผู้ป่วย"
              : "Supplied annotated teaching example for feedback, not a new patient image"
          }
        />
      </a>
      <figcaption>
        {language === "th"
          ? "ภาพจากเอกสาร แตะขยาย ต้องให้อาจารย์ยืนยันเนื้อหาและสิทธิใช้ภาพ"
          : "Supplied teaching figure. Tap to enlarge. Content and reuse rights require educator approval."}
      </figcaption>
    </figure>
  );
}
