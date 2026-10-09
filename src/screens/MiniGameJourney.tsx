import { useEffect, useMemo, useRef, useState } from "react";
import { initialWalk, stepWalk } from "../games/walking";
import { Joystick } from "../games/Joystick";
import {
  v4CaseTitles,
  v4ResourceText,
} from "../content/content.v4";
import type { ContentVersion, LearningEvent } from "../domain/types";
import { FOCUSED_VERSION } from "../games/spec";
import { deriveProgress, nextClientSequence } from "../domain/engine";
import { computeRewards } from "../domain/rewards";
import { useLanguage } from "../i18n";
import { MiniGameStation } from "../games/MiniGameStation";
import { RewardPodium } from "../games/RewardPodium";
import { starsFor } from "../games/evaluate";
import { createBaseEvent } from "../utils/events";
import { miniReferences } from "../content/reference.v4";
import { ClinicalArt } from "../art/ClinicalArt";
import { retrievalEvidence } from "../domain/assessment";
const anchors = [
  { x: 16, y: 76 },
  { x: 16, y: 39 },
  { x: 50, y: 39 },
  { x: 84, y: 39 },
  { x: 84, y: 76 },
];
const safetyLabels = {
  S1: ["Escalate", "เรียกทีม", "team", 2],
  S2: ["Trochanters", "Trochanters", "binder", 3],
  S3: ["Safe imaging", "ภาพอย่างปลอดภัย", "ct", 4],
  S4: ["Binder plan", "แผน binder", "binder", 3],
  S5: ["GU warning", "GU warning", "foley", 5],
  S6: ["Open injury", "Open injury", "wound", 5],
} as const;
export function MiniGameJourney({
  content,
  events,
  addEvent,
  attemptId,
  partition,
  avatar,
  view,
  navigationRevision = 0,
}: {
  content: ContentVersion;
  events: LearningEvent[];
  addEvent(e: LearningEvent): Promise<boolean>;
  attemptId: string;
  partition: string;
  avatar: { path: string; reactionSet: number };
  view: string;
  navigationRevision?: number;
}) {
  const { language } = useLanguage();
  const t = (en: string, th: string) => (language === "th" ? th : en);
  const focused = content.id === FOCUSED_VERSION;
  const roomAnchors = focused ? [anchors[1], anchors[2], anchors[3]] : anchors;
  const caseTitle = (index: number) => v4CaseTitles[focused ? index + 1 : index][language];
  const [nodeId, setNodeId] = useState<string | null>(null),
    [position, setPosition] = useState(initialWalk),
    [walking, setWalking] = useState(false),
    [panel, setPanel] = useState("hub");
  const held = useRef(new Set<string>()),
    room = useRef<HTMLDivElement>(null);
  const motion = useRef(initialWalk);
  const analog=useRef({x:0,y:0});
  const taps = useRef(new Map<string, number>());
  const movementActive = !nodeId && panel === "hub";
  const startWalking = (key: string) => {
    held.current.add(key);
    taps.current.set(key, performance.now() + 85);
  };
  const stopWalking = () => {
    held.current.clear(); taps.current.clear();analog.current={x:0,y:0};
    motion.current = { ...motion.current, vx: 0, vy: 0 };
    setWalking(false);
  };
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [nodeId, panel]);
  const p = useMemo(() => deriveProgress(content, events), [content, events]);
  const reward = useMemo(() => computeRewards(content, events, p), [content, events, p]);
  const retrieval = useMemo(() => retrievalEvidence(content, events), [content, events]);
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
  }, [view, navigationRevision]);
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
      const next = stepWalk(before, keys, dt, bounds?.width ?? 0, bounds?.height ?? 0,analog.current);
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
  const near = roomAnchors
    .map((a, i) => ({
      i,
      d: Math.hypot(a.x - position.x, (a.y - position.y) * 0.75),
    }))
    .sort((a, b) => a.d - b.d)[0];
  const unlocked = (index: number) =>
    (focused ? index === 0 || p.missionReviewed[content.missions[index - 1].id] : index === 0 ||
    (index < 4
      ? p.missionReviewed["mission-0"]
      : [0, 1, 2, 3].every((i) => p.missionReviewed[`mission-${i}`])));
  const enter = (index: number) => {
    if (!unlocked(index)) return;
    const mission = content.missions[index];
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
      setPanel(node.missionId === content.missions.at(-1)?.id ? "summary" : "hub");
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
          step={content.missions.find(m => m.id === content.nodes.find(n => n.id === nodeId)!.missionId)!.nodeIds.indexOf(nodeId) + 1}
          totalSteps={content.missions.find(m => m.id === content.nodes.find(n => n.id === nodeId)!.missionId)!.nodeIds.length}
          events={events}
          emit={emit}
          onNext={advance}
          partition={`${partition}:${attemptId}`}
        />
      </>
    );
  if (panel === "resources")
    return (
      <section className="stack">
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
            <span>Reward</span>
            <strong>
              {reward.total}/{reward.maximum}
            </strong>
          </article>
        </div>
        {!focused&&<article className="panel">
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
        </article>}
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
        {content.missions
          .filter((m) => m.id !== "mission-4")
          .map((m, i) => (
            <p key={m.id}>
              {p.missionReviewed[m.id] ? "✦" : "○"} {caseTitle(i)}
            </p>
          ))}
        <RewardPodium contentVersion={content.id} complete={p.locallyComplete} reward={reward.total} />
        <h2>{t("Review your handovers", "ทบทวน handovers")}</h2>
        {p.handoverNotes.map((n) => (
          <blockquote key={n.nodeId}>
            {n.nodeId}: {n.text || t("Not yet recorded", "ยังไม่ได้บันทึก")}
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
      <p>
        {t(
          focused ? "3 patients. 15 team decisions. Choose an action, review feedback, then continue." : "24 practice stations + four 3-card boss rounds + eight final retrieval stations. Begin at Pelvis Academy.",
          focused ? "ผู้ป่วย 3 เคส ตัดสินใจร่วมทีม 15 ครั้ง เลือก action อ่าน feedback แล้วไปต่อ" : "24 สถานีฝึก + boss 4 รอบ รอบละ 3 สถานี + ทบทวนท้ายเวร 8 สถานี เริ่มที่ Pelvis Academy",
        )}
      </p>
      <p className="draft-label">
        {t(
          content.governance.status === "approved" ? "Educator-approved learning activity. Work with your senior team; not a treatment order." : "Draft: clinical and image approval required before student delivery.",
          content.governance.status === "approved" ? "กิจกรรมการเรียนที่อาจารย์อนุมัติ ทำงานร่วมทีมอาวุโส ไม่ใช่คำสั่งรักษา" : "ฉบับร่าง: ต้องอนุมัติเนื้อหาและภาพก่อนใช้กับนักศึกษา",
        )}
      </p>
      {focused && <article className="next-task panel"><strong>{t("Next task", "ทำต่อไป")}</strong><p>{Object.values(p.missionReviewed).every(Boolean) ? t("Review your three handovers, then finish shift.", "ทบทวน handover ทั้ง 3 เคส แล้วจบเวร") : caseTitle(Math.max(0, content.missions.findIndex(m => !p.missionReviewed[m.id])))}</p><button className="primary" onClick={() => {const index=content.missions.findIndex(m=>!p.missionReviewed[m.id]);if(index<0)setPanel("summary");else enter(index);}}>{t(p.answeredNodeIds.length ? "Continue your shift" : "Start first patient", p.answeredNodeIds.length ? "เล่นเวรต่อ" : "เริ่มผู้ป่วยรายแรก")}</button></article>}
      <div className="mini-hud">
        <strong>
          {reward.total}/{reward.maximum} reward
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
        {content.missions.map((m, i) => (
          <div
            key={m.id}
            className={`mini-bay ${near.i === i && near.d < 19 ? "near" : ""}`}
            style={{ left: `${roomAnchors[i].x}%`, top: `${roomAnchors[i].y}%` }}
          >
            {focused || (i > 0 && i < 4) ? (
              <img
                src={`/assets/patients-v2/patient-${focused ? i + 1 : i}.png`}
                alt={t(
                  "Fictional covered patient supported on the bed",
                  "ผู้ป่วยจำลองมีผ้าคลุมและนอนบนเตียง",
                )}
              />
            ) : (
              <ClinicalArt
                kind={i === 0 ? "pelvis" : "team"}
                size={65}
                ariaLabel={caseTitle(i)}
              />
            )}
            <span>
              {unlocked(i) ? (p.missionReviewed[m.id] ? "✓" : "○") : "🔒"}{" "}
              {caseTitle(i)}
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
      <div className="mini-controls">
        <Joystick label={t("Movement joystick. Arrow keys or WASD also move.","จอยสติ๊กเดิน ใช้ปุ่มลูกศรหรือ WASD ได้เช่นกัน")} onMove={vector=>{analog.current=vector;if(!vector.x&&!vector.y)stopWalking();}} />
        <button
          className="primary"
          disabled={near.d >= 19 || !unlocked(near.i)}
          onClick={() => enter(near.i)}
        >
          {t("Enter case", "เข้าเคส")} · {caseTitle(near.i)}
        </button>
      </div>
      <div className="mission-grid">
        {content.missions.map((m, i) => (
          <article key={m.id} className="panel">
            <h3>{caseTitle(i)}</h3>
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
            <button
              className="secondary"
              disabled={!unlocked(i)}
              onClick={() => enter(i)}
            >
              {focused ? t(p.missionReviewed[m.id] ? "Review case" : "Continue case", p.missionReviewed[m.id] ? "ทบทวนเคส" : "เล่นเคสต่อ") : t("Accessible case shortcut", "ทางลัดสำหรับการเข้าถึง")}
            </button>
          </article>
        ))}
      </div>
      <button className="secondary" onClick={() => setPanel("summary")}>
        {t("Review learning evidence", "ทบทวนหลักฐานการเรียน")}
      </button>
    </section>
  );
}
