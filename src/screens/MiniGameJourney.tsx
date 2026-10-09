import { useEffect, useMemo, useRef, useState } from "react";
import { initialWalk, stepWalk } from "../games/walking";
import {
  pelvicTraumaContentV4 as content,
  v4CaseTitles,
  v4ResourceText,
} from "../content/content.v4";
import type { LearningEvent } from "../domain/types";
import { deriveProgress, nextClientSequence } from "../domain/engine";
import { computeRewards } from "../domain/rewards";
import { useLanguage } from "../i18n";
import { MiniGameStation } from "../games/MiniGameStation";
import { RewardPodium } from "../games/RewardPodium";
import { starsFor } from "../games/evaluate";
import { createBaseEvent } from "../utils/events";
import { miniReferences } from "../content/reference.v4";
import { ClinicalArt } from "../art/ClinicalArt";
import { retrievalEvidence, testEvidence, POST_TEST_PASS_MARK } from "../domain/assessment";
const anchors = [
  { x: 16, y: 76 },
  { x: 16, y: 39 },
  { x: 50, y: 39 },
  { x: 84, y: 39 },
  { x: 84, y: 76 },
];
const safetyLabels = {
  S1: ["Escalate", "เรียกทีม", "team", 2],
  S2: ["Trochanters", "ระดับ greater trochanter", "binder", 3],
  S3: ["Safe imaging", "ส่งภาพอย่างปลอดภัย", "ct", 4],
  S4: ["Binder plan", "แผน binder", "binder", 3],
  S5: ["GU warning", "ระวังทางเดินปัสสาวะ", "foley", 5],
  S6: ["Open injury", "กระดูกหักแบบเปิด", "wound", 5],
} as const;
const directionThai: Record<string, string> = { up: "ขึ้น", down: "ลง", left: "ซ้าย", right: "ขวา" };
export function MiniGameJourney({
  events,
  addEvent,
  attemptId,
  partition,
  avatar,
  view,
  navSignal = 0,
  hubFooter,
}: {
  events: LearningEvent[];
  addEvent(e: LearningEvent): Promise<boolean>;
  attemptId: string;
  partition: string;
  avatar: { path: string; reactionSet: number };
  view: string;
  /** Increments on every main-nav tap, so tapping the current tab still resets the screen. */
  navSignal?: number;
  /** Shown only on the room (hub) screen, never under a station. */
  hubFooter?: React.ReactNode;
}) {
  const { language } = useLanguage();
  const t = (en: string, th: string) => (language === "th" ? th : en);
  const [nodeId, setNodeId] = useState<string | null>(null),
    [position, setPosition] = useState(initialWalk),
    [walking, setWalking] = useState(false),
    [panel, setPanel] = useState("hub");
  const held = useRef(new Set<string>()),
    room = useRef<HTMLDivElement>(null);
  const motion = useRef(initialWalk);
  const taps = useRef(new Map<string, number>());
  const movementActive = !nodeId && panel === "hub";
  const startWalking = (key: string) => {
    held.current.add(key);
    taps.current.set(key, performance.now() + 85);
  };
  const stopWalking = () => {
    held.current.clear(); taps.current.clear();
    motion.current = { ...motion.current, vx: 0, vy: 0 };
    setWalking(false);
  };
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [nodeId, panel]);
  const p = useMemo(() => deriveProgress(content, events), [events]);
  const reward = useMemo(() => computeRewards(content, events, p), [events, p]);
  const retrieval = useMemo(() => retrievalEvidence(content, events), [events]);
  const tests = useMemo(() => testEvidence(content, events), [events]);
  // The pre-test is not a room bay; the five bays are the four cases plus the final shift.
  const cases = content.missions.filter((m) => m.id !== "mission-pre");
  const pretest = content.missions.find((m) => m.id === "mission-pre")!;
  const pretestDone = Boolean(p.missionReviewed["mission-pre"]);
  const emit = (data: Record<string, unknown>) =>
    addEvent({
      ...createBaseEvent(attemptId, nextClientSequence(events)),
      ...data,
    } as LearningEvent);
  useEffect(() => {
    setNodeId(null);
    setPanel(
      view === "resources"
        ? "resources"
        : view === "progress"
          ? "summary"
          : "hub",
    );
  }, [view, navSignal]);
  useEffect(() => {
    if (!movementActive) { stopWalking(); return; }
    let frame = 0,
      last = 0;
    const move = (time: number) => {
      const dt = time - last || 16;
      last = time;
      const keys = new Set(held.current);
      for (const [key, until] of taps.current) {
        if (time < until) keys.add(key); else taps.current.delete(key);
      }
      const bounds = room.current?.getBoundingClientRect();
      const before = motion.current;
      const next = stepWalk(before, keys, dt, bounds?.width ?? 0, bounds?.height ?? 0);
      motion.current = next;
      const moving = Math.hypot(next.vx, next.vy) > 2;
      setWalking(moving);
      if (next.x !== before.x || next.y !== before.y || next.facing !== before.facing) setPosition(next);
      frame = requestAnimationFrame(move);
    };
    frame = requestAnimationFrame(move);
    const release = (e: KeyboardEvent) =>
        held.current.delete(e.key.toLowerCase()),
      stop = () => stopWalking();
    const visibility = () => { if (document.hidden) stop(); last = 0; };
    window.addEventListener("keyup", release);
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keyup", release);
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", visibility);
      held.current.clear(); taps.current.clear();
    };
  }, [movementActive]);
  const near = anchors
    .map((a, i) => ({
      i,
      d: Math.hypot(a.x - position.x, (a.y - position.y) * 0.75),
    }))
    .sort((a, b) => a.d - b.d)[0];
  const unlocked = (index: number) =>
    !pretestDone ? false :
    index === 0 ||
    (index < 4
      ? p.missionReviewed["mission-0"]
      : [0, 1, 2, 3].every((i) => p.missionReviewed[`mission-${i}`]));
  const lockReason = (index: number) =>
    !pretestDone
      ? { en: "Do the 8-item pre-test first.", th: "ทำแบบทดสอบก่อนเรียน 8 ข้อก่อน" }
      : index < 4
      ? { en: `Finish ${v4CaseTitles[0].en} to unlock.`, th: `ทำ ${v4CaseTitles[0].th} ให้ครบเพื่อปลดล็อก` }
      : { en: "Finish all four cases to unlock the final shift.", th: "ทำครบทั้ง 4 เคสเพื่อปลดล็อกเวรสุดท้าย" };
  const enter = (index: number) => {
    if (!unlocked(index)) return;
    const mission = cases[index];
    setNodeId(
      mission.nodeIds.find((id) => !p.clearedNodeIds.includes(id)) ??
        mission.nodeIds[0],
    );
    held.current.clear();
  };
  const advance = () => {
    const node = content.nodes.find((n) => n.id === nodeId)!;
    if (node.nextNodeId) setNodeId(node.nextNodeId);
    else {
      setNodeId(null);
      setPanel(node.missionId === "mission-4" ? "summary" : node.missionId === "mission-pre" ? "pretest-done" : "hub");
    }
  };
  if (nodeId)
    return (
      <>
        <button
          className="quiet"
          onClick={() => {
            setNodeId(null);
            held.current.clear();
          }}
        >
          {t(
            "← Emergency room (work saved)",
            "← ห้องฉุกเฉิน (บันทึกคำตอบแล้ว)",
          )}
        </button>
        <MiniGameStation
          character={avatar.reactionSet}
          key={nodeId}
          node={content.nodes.find((n) => n.id === nodeId)!}
          events={events}
          emit={emit}
          onNext={advance}
          partition={`${partition}:${attemptId}`}
        />
      </>
    );
  if (panel === "pretest-done")
    return (
      <section className="stack">
        <h1>{t("Pre-test complete", "ทำแบบทดสอบก่อนเรียนครบแล้ว")}</h1>
        <article className="panel test-score">
          <strong className="big-score">{tests.pre.firstCorrect}/{tests.pre.expected}</strong>
          <p>
            {t(
              "This is your starting point, not a grade. Every topic returns in the cases, and the same kind of 8 items come back at the end of the shift so you can see how much you learned.",
              "นี่คือจุดเริ่มต้น ไม่ใช่เกรด ทุกหัวข้อจะได้ฝึกในเคส และจะมีแบบทดสอบแบบเดียวกัน 8 ข้อท้ายเวรเพื่อดูว่าเรียนรู้เพิ่มขึ้นเท่าไร",
            )}
          </p>
        </article>
        <button className="primary" onClick={() => setPanel("hub")}>
          {t("Go to the emergency room", "ไปห้องฉุกเฉิน")}
        </button>
      </section>
    );
  if (panel === "resources")
    return (
      <section className="stack">
        <button className="quiet" onClick={() => setPanel("hub")}>
          {t("← Emergency room", "← ห้องฉุกเฉิน")}
        </button>
        <h1>{t("Illustrated reference inventory", "คลังบัตรอ้างอิงภาพ")}</h1>
        {content.resources
          .filter((r) => r.id !== "ORIENTATION")
          .map((r, i) => (
            <article key={r.id} className="panel">
              <h2>{v4ResourceText[i][language]}</h2>
              <ClinicalArt
                kind={
                  ["ligament", "blood", "binder", "beam", "organ", "team"][i]
                }
                ariaLabel={v4ResourceText[i][language]}
              />
              {miniReferences
                .filter((card) => card.group === i + 1)
                .map((card) => (
                  <details key={card.title.en}>
                    <summary>{card.title[language]}</summary>
                    <p>{card.text[language]}</p>
                    <a
                      href={`/resources/${card.doc === "H" ? "pelvic-fracture-teaching-handout-th.pdf" : "pelvic-fracture-medical-student-2024.pdf"}#page=${card.page}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {card.doc} p{card.page} ↗
                    </a>
                  </details>
                ))}
              {content.nodes
                .filter(
                  (n) => n.stage === "practice" && n.resourceIds.includes(r.id),
                )
                .map((n) => (
                  <details key={n.id}>
                    <summary>{n.translation!.title[language]}</summary>
                    <p>{n.translation!.key[language]}</p>
                    {n.sourceRefs?.map((ref) => (
                      <a
                        key={ref.doc + ref.page}
                        href={`${content.sourceDocuments.find((d) => d.href.includes(ref.doc === "H" ? "handout" : "2024"))?.href}#page=${ref.page}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {ref.doc} p{ref.page}
                      </a>
                    ))}
                  </details>
                ))}
              <button
                className="secondary"
                onClick={() =>
                  void emit({ type: "resource_viewed", resourceId: r.id })
                }
              >
                {t("Record that I reviewed this card", "บันทึกการอ่านบัตรนี้")}
              </button>
            </article>
          ))}
      </section>
    );
  if (panel === "summary")
    return (
      <section className="stack">
        <button className="quiet" onClick={() => setPanel("hub")}>
          {t("← Emergency room", "← ห้องฉุกเฉิน")}
        </button>
        <h1>{t("Your shift learning evidence", "หลักฐานการเรียนรู้ในเวร")}</h1>
        <p>
          {t(
            "Learning evidence, not proven competence. First responses are never replaced.",
            "หลักฐานการเรียน ไม่ใช่การรับรอง competence คำตอบแรกไม่ถูกแทนที่",
          )}
        </p>
        <div className="metrics">
          <article className="metric">
            <span>{t("First-correct", "ถูกครั้งแรก")}</span>
            <strong>
              {p.firstCorrectNodeIds.length}/{content.nodes.length}
            </strong>
          </article>
          <article className="metric">
            <span>{t("Corrected", "แก้ไขแล้ว")}</span>
            <strong>{p.correctedNodeIds.length}</strong>
          </article>
          <article className="metric">
            <span>{t("Reward", "รางวัล")}</span>
            <strong>
              {reward.total}/{reward.maximum}
            </strong>
          </article>
        </div>
        <article className="panel test-score">
          <h2>{t("Pre-test → post-test", "ก่อนเรียน → หลังเรียน")}</h2>
          <p>
            {t("Pre-test", "ก่อนเรียน")}: <strong>{tests.pre.complete ? `${tests.pre.firstCorrect}/8` : t("not done", "ยังไม่ทำ")}</strong>
            {" → "}
            {t("Post-test", "หลังเรียน")}: <strong>{tests.post.complete ? `${tests.post.firstCorrect}/8` : `${tests.post.answered}/8 ${t("answered", "ข้อที่ตอบ")}`}</strong>
          </p>
          {tests.passed !== null && (
            <p className={tests.passed ? "result-line ok" : "result-line retry"}>
              {tests.passed
                ? t("Pass standard met.", "ผ่านเกณฑ์แล้ว")
                : t(
                    `Not yet: the standard is ${POST_TEST_PASS_MARK}/8 first try and both safety items (binder level, no Foley) correct. Review your corrections and discuss with your teacher.`,
                    `ยังไม่ผ่าน: เกณฑ์คือถูกครั้งแรก ${POST_TEST_PASS_MARK}/8 และข้อความปลอดภัยทั้ง 2 ข้อ (ตำแหน่ง binder, ห้ามใส่ Foley) ต้องถูก ทบทวนรอบแก้ไขและปรึกษาอาจารย์`,
                  )}
            </p>
          )}
        </article>
        <article className="panel">
          <h2>{t("Final retrieval evidence", "หลักฐานทบทวนท้ายเวร")}</h2>
          <p>
            {retrieval.firstScore === null
              ? t(
                  `${retrieval.observed}/8 received; missing evidence is not incorrect.`,
                  `รับ ${retrieval.observed}/8 ข้อมูลที่ขาดไม่ใช่คำตอบผิด`,
                )
              : t(
                  `First response: ${retrieval.firstScore}/8. Teaching target: 6/8; review every correction.`,
                  `คำตอบแรก ${retrieval.firstScore}/8 เป้าหมายการเรียน 6/8 ต้องทบทวนทุก correction`,
                )}
          </p>
          <p>
            {t("Resolved after review: ", "แก้ไขและทบทวนแล้ว: ")}
            {retrieval.resolvedScore ?? 0}/8
          </p>
          <small>
            {t(
              "This guides class discussion, not a competence grade.",
              "ใช้กำหนดการอภิปราย ไม่ใช่ grade competence",
            )}
          </small>
        </article>
        <div className="badge-collection">
          {p.concepts.map((c) => (
            <button
              className="secondary"
              key={c.conceptId}
              onClick={() => {
                void emit({
                  type: "resource_viewed",
                  resourceId: `R${safetyLabels[c.conceptId][3]}`,
                });
                setPanel("resources");
              }}
            >
              <ClinicalArt
                kind={safetyLabels[c.conceptId][2]}
                size={42}
                ariaLabel={t(
                  safetyLabels[c.conceptId][0],
                  safetyLabels[c.conceptId][1],
                )}
              />
              {c.resolved ? "✓" : "○"}{" "}
              {t(safetyLabels[c.conceptId][0], safetyLabels[c.conceptId][1])}
            </button>
          ))}
        </div>
        {cases
          .filter((m) => m.id !== "mission-4")
          .map((m, i) => (
            <p key={m.id}>
              {p.missionReviewed[m.id] ? "✦" : "○"} {v4CaseTitles[i][language]}
            </p>
          ))}
        <RewardPodium complete={p.locallyComplete} reward={reward.total} />
        <h2>{t("Review your handovers", "ทบทวน handovers")}</h2>
        {p.handoverNotes.map((n) => (
          <blockquote key={n.nodeId}>
            <strong>{content.nodes.find((node) => node.id === n.nodeId)?.translation?.title[language] ?? n.nodeId}</strong>
            {": "}
            {n.text || t("Not yet recorded", "ยังไม่ได้บันทึก")}
          </blockquote>
        ))}
        <h2>{t("Discuss in class", "อภิปรายในชั้นเรียน")}</h2>
        {content.nodes
          .filter(
            (n) =>
              p.correctedNodeIds.includes(n.id) ||
              (p.answeredNodeIds.includes(n.id) &&
                !p.clearedNodeIds.includes(n.id)),
          )
          .map((n) => (
            <p key={n.id}>
              {n.translation!.title[language]}: {n.translation!.key[language]}
            </p>
          ))}
        {!p.reflection && !Object.values(p.missionReviewed).every(Boolean) && (
          <p className="hint-line">
            {t("To finish the shift, complete: ", "เพื่อจบเวร ต้องทำให้ครบ: ")}
            {cases
              .map((m, i) => (p.missionReviewed[m.id] ? null : v4CaseTitles[i][language]))
              .filter(Boolean)
              .join(", ")}
          </p>
        )}
        <button
          className="primary"
          disabled={
            !Object.values(p.missionReviewed).every(Boolean) ||
            Boolean(p.reflection)
          }
          onClick={() =>
            void emit({
              type: "reflection_submitted",
              text: p.handoverNotes
                .map((n) => `${n.nodeId}: ${n.text}`)
                .join("\n")
                .slice(0, 1500),
            })
          }
        >
          {p.reflection
            ? t(
                "Shift finished — sync for institutional receipt",
                "จบเวรแล้ว — sync เพื่อยืนยันจากสถาบัน",
              )
            : t("Finish shift", "จบเวร")}
        </button>
        {p.reflection && !events.some((e) => e.type === "course_feedback") && (
          <CourseFeedback emit={emit} />
        )}
        {events.some((e) => e.type === "course_feedback") && (
          <p className="hint-line">{t("Thank you — your feedback was saved.", "ขอบคุณ — บันทึกความคิดเห็นแล้ว")}</p>
        )}
        <button className="secondary" onClick={() => setPanel("hub")}>
          {t("Return to the room", "กลับห้องฉุกเฉิน")}
        </button>
      </section>
    );
  return (
    <section className="stack minigame-hub">
      <span className="eyebrow">
        {t("PRE-CLASS • LEARN BY DOING", "ก่อนเรียน • ลงมือทำ")}
      </span>
      <h1>
        {t("A new shift. A different challenge.", "เวรใหม่ ความท้าทายใหม่")}
      </h1>
      {!pretestDone && (
        <article className="panel pretest-gate">
          <h2>{t("Start with the 8-item pre-test", "เริ่มด้วยแบบทดสอบก่อนเรียน 8 ข้อ")}</h2>
          <p>
            {t(
              "About 5 minutes. No hints, no penalty — it shows your teacher (and you) where you start.",
              "ประมาณ 5 นาที ไม่มีคำใบ้ ไม่มีการหักคะแนน ช่วยให้อาจารย์ (และคุณ) เห็นจุดเริ่มต้น",
            )}
          </p>
          <button
            className="primary"
            onClick={() => setNodeId(pretest.nodeIds.find((id) => !p.answeredNodeIds.includes(id)) ?? pretest.nodeIds[0])}
          >
            {p.answeredNodeIds.some((id) => pretest.nodeIds.includes(id))
              ? t("Continue the pre-test", "ทำแบบทดสอบก่อนเรียนต่อ")
              : t("Start the pre-test", "เริ่มแบบทดสอบก่อนเรียน")}
          </button>
        </article>
      )}
      <p>
        {t(
          "8-item pre-test → 24 practice stations + four 3-card boss rounds → 8-item post-test. Begin with the pre-test, then Pelvis Academy.",
          "แบบทดสอบก่อนเรียน 8 ข้อ → 24 สถานีฝึก + boss 4 รอบ → แบบทดสอบหลังเรียน 8 ข้อ เริ่มจากแบบทดสอบก่อนเรียน แล้วไป Pelvis Academy",
        )}
      </p>
      <p className="draft-label">
        {t(
          "Draft: clinical and image approval required before student delivery.",
          "ฉบับร่าง: ต้องอนุมัติเนื้อหาและภาพก่อนใช้กับนักศึกษา",
        )}
      </p>
      <div className="mini-hud">
        <strong>
          {reward.total}/{reward.maximum} {t("reward", "รางวัล")}
        </strong>
        <span>
          {t("Outfit", "ชุด")} {reward.level}/5
        </span>
        <progress
          aria-label={t("Next outfit progress", "ความก้าวหน้าสู่ชุดถัดไป")}
          max={reward.nextThreshold ?? reward.maximum}
          value={reward.total}
        />
        <span>
          {reward.nextThreshold
            ? t(
                `Next outfit at ${reward.nextThreshold}`,
                `ชุดถัดไปที่ ${reward.nextThreshold}`,
              )
            : t("Top outfit unlocked", "ปลดล็อกชุดสูงสุดแล้ว")}
        </span>
      </div>
      <h2>
        {t(
          "Approach a patient to open a case",
          "เดินเข้าใกล้ผู้ป่วยเพื่อเปิดเคส",
        )}
      </h2>
      <div
        ref={room}
        className="mini-room"
        tabIndex={0}
        aria-label={t(
          "Emergency room: arrow keys or WASD to walk; Enter to open nearby case.",
          "ห้องฉุกเฉิน: ลูกศรหรือ WASD เดิน Enter เปิดเคสที่อยู่ใกล้",
        )}
        onKeyDown={(e) => {
          if (
            [
              "arrowleft",
              "arrowright",
              "arrowup",
              "arrowdown",
              "w",
              "a",
              "s",
              "d",
            ].includes(e.key.toLowerCase())
          ) {
            e.preventDefault();
            if (!e.repeat) startWalking(e.key.toLowerCase());
          }
          if (e.key === "Enter" && near.d < 19) enter(near.i);
        }}
      >
        <img
          className="mini-room-background"
          src="/assets/emergency-room.jpg"
          alt={t(
            "Illustrated emergency room, no real patient data",
            "ห้องฉุกเฉินจำลอง ไม่มีข้อมูลผู้ป่วยจริง",
          )}
        />
        {cases.map((m, i) => (
          <div
            key={m.id}
            className={`mini-bay ${near.i === i && near.d < 19 ? "near" : ""}`}
            style={{ left: `${anchors[i].x}%`, top: `${anchors[i].y}%` }}
          >
            {i > 0 && i < 4 ? (
              <img
                src={`/assets/patients-v2/patient-${i}.png`}
                alt={t(
                  "Fictional covered patient supported on the bed",
                  "ผู้ป่วยจำลองมีผ้าคลุมและนอนบนเตียง",
                )}
              />
            ) : (
              <ClinicalArt
                kind={i === 0 ? "pelvis" : "team"}
                size={65}
                ariaLabel={v4CaseTitles[i][language]}
              />
            )}
            <span>
              {unlocked(i) ? (p.missionReviewed[m.id] ? "✓" : "○") : <span aria-label={t("locked", "ล็อกอยู่")}>🔒</span>}{" "}
              {v4CaseTitles[i][language]}
            </span>
          </div>
        ))}
        <div
          className={`mini-walker ${walking ? "walking" : ""} facing-${position.facing}`}
          style={{ left: `${position.x}%`, top: `${position.y}%`, "--walk-depth": 0.91 + (position.y - 45) / 440 } as React.CSSProperties}
        >
          <span className="walk-shadow" aria-hidden="true" />
          <div className="walk-facing">
            <img
              src={`/assets/upgrades/character-${avatar.reactionSet}-level-${reward.level}.png`}
              alt={t("Your walking learner character", "ตัวละครผู้เรียนกำลังเดิน")}
            />
          </div>
        </div>
      </div>
      <p className="sr-status" role="status" aria-live="polite">
        {near.d < 19
          ? unlocked(near.i)
            ? t(`Near ${v4CaseTitles[near.i].en} — press Enter to open.`, `อยู่ใกล้ ${v4CaseTitles[near.i].th} — กด Enter เพื่อเปิด`)
            : t(lockReason(near.i).en, lockReason(near.i).th)
          : t("Walk to a patient bay.", "เดินไปที่เตียงผู้ป่วย")}
      </p>
      <div className="mini-controls">
        <div className="dpad">
          {[
            ["up", 0, -5, "↑"],
            ["left", -5, 0, "←"],
            ["down", 0, 5, "↓"],
            ["right", 5, 0, "→"],
          ].map(([direction, , , symbol]) => (
            <button
              key={direction}
              className={`secondary ${direction}`}
              aria-label={t(`Move ${direction}`, `เดิน${directionThai[direction as string]}`)}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                startWalking(`arrow${direction}`);
              }}
              onPointerUp={() => held.current.delete(`arrow${direction}`)}
              onPointerCancel={() => { held.current.delete(`arrow${direction}`); taps.current.delete(`arrow${direction}`); }}
              onLostPointerCapture={() =>
                held.current.delete(`arrow${direction}`)
              }
              onClick={(e) => {
                if (e.detail === 0) taps.current.set(`arrow${direction}`, performance.now() + 140);
              }}
            >
              {symbol}
            </button>
          ))}
        </div>
        <button
          className="primary"
          disabled={near.d >= 19 || !unlocked(near.i)}
          onClick={() => enter(near.i)}
        >
          {t("Enter case", "เข้าเคส")} · {v4CaseTitles[near.i][language]}
        </button>
      </div>
      <div className="mission-grid">
        {cases.map((m, i) => (
          <article key={m.id} className="panel">
            <h3>{v4CaseTitles[i][language]}</h3>
            <p>
              {p.clearedNodeIds.filter((id) => m.nodeIds.includes(id)).length}/
              {m.nodeIds.length}
            </p>
            <p className="station-stars">
              {events
                .filter(
                  (e) =>
                    e.type === "core_response" && m.nodeIds.includes(e.nodeId),
                )
                .map((e) =>
                  e.type === "core_response" ? starsFor(e.gameScore ?? 0) : 0,
                )
                .reduce((a, b) => a + b, 0)}{" "}
              ★
            </p>
            {unlocked(i) ? (
              <button className="secondary" onClick={() => enter(i)}>
                {t(`Open ${v4CaseTitles[i].en}`, `เปิด ${v4CaseTitles[i].th}`)}
              </button>
            ) : (
              <p className="hint-line">🔒 {t(lockReason(i).en, lockReason(i).th)}</p>
            )}
          </article>
        ))}
      </div>
      <button className="secondary" onClick={() => setPanel("summary")}>
        {t("Review learning evidence", "ทบทวนหลักฐานการเรียน")}
      </button>
      {hubFooter}
    </section>
  );
}

/** Three 1–5 ratings and an optional comment (Kirkpatrick level 1). Does not change any score. */
function CourseFeedback({ emit }: { emit(data: Record<string, unknown>): Promise<boolean> }) {
  const { language } = useLanguage();
  const t = (en: string, th: string) => (language === "th" ? th : en);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const items: Array<[string, string, string]> = [
    ["usefulness", "This game helped me learn pelvic trauma care", "เกมนี้ช่วยให้เรียนรู้การดูแลผู้บาดเจ็บเชิงกราน"],
    ["enjoyment", "I enjoyed playing it", "สนุกกับการเล่น"],
    ["confidence", "I feel more confident for the class and the ward", "มั่นใจมากขึ้นสำหรับชั้นเรียนและการขึ้นวอร์ด"],
  ];
  const complete = items.every(([id]) => ratings[id]);
  return (
    <article className="panel course-feedback">
      <h2>{t("Quick feedback (1 minute, optional)", "ความคิดเห็นสั้นๆ (1 นาที ไม่บังคับ)")}</h2>
      <p className="hint-line">{t("1 = strongly disagree … 5 = strongly agree. This never changes your score.", "1 = ไม่เห็นด้วยอย่างยิ่ง … 5 = เห็นด้วยอย่างยิ่ง ไม่มีผลต่อคะแนน")}</p>
      {items.map(([id, en, th]) => (
        <fieldset key={id} className="likert">
          <legend>{t(en, th)}</legend>
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value}>
              <input type="radio" name={id} checked={ratings[id] === value} onChange={() => setRatings((current) => ({ ...current, [id]: value }))} />
              {value}
            </label>
          ))}
        </fieldset>
      ))}
      <label>
        {t("Anything to improve? (optional)", "มีอะไรควรปรับปรุง? (ไม่บังคับ)")}
        <textarea maxLength={800} value={comment} onChange={(event) => setComment(event.target.value)} />
      </label>
      <button
        className="primary"
        disabled={!complete || busy}
        onClick={async () => {
          setBusy(true);
          await emit({ type: "course_feedback", usefulness: ratings.usefulness, enjoyment: ratings.enjoyment, confidence: ratings.confidence, ...(comment.trim() ? { comment: comment.trim() } : {}) });
          setBusy(false);
        }}
      >
        {t("Send feedback", "ส่งความคิดเห็น")}
      </button>
    </article>
  );
}
