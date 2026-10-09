import { describe, it, expect } from "vitest";
import { evaluate, outcomeId } from "./evaluate";
import { parseSpec, MINIGAME_VERSION, type MiniGameSpec, kinds } from "./spec";
import {
  pelvicTraumaContentV4 as content,
  practiceRows,
} from "../content/content.v4";
import { deriveProgress } from "../domain/engine";
import { computeRewards } from "../domain/rewards";
import {
  validateLearnerEvent,
  recomputeServerSummary,
} from "../domain/serverRules";
import { validateLearningSequence } from "../domain/learningRules";
import { contentVersionSchema, validateContentLinks } from "../domain/schema";
import type { LearningEvent, BaseEvent } from "../domain/types";
import { miniGameEvidence } from "../domain/assessment";
export function correctAnswer(spec: MiniGameSpec): unknown {
  if (spec.variants)
    return { form: "A", answer: correctAnswer(spec.variants.A) };
  if (spec.rounds) return spec.rounds.map(correctAnswer);
  if (["card_sort", "handover_builder"].includes(spec.kind))
    return Object.fromEntries(
      spec.cards
        .filter((c) => c.target !== undefined)
        .map((c) => [c.id, c.target]),
    );
  if (spec.kind === "sequence") return spec.order;
  if (spec.kind === "ring_trace")
    return { visited: spec.cards.map((card) => card.id), breaks: spec.targets };
  if (["hotspot", "card_pick"].includes(spec.kind)) return spec.targets;
  if (spec.kind === "image_pick" || spec.kind === "mcq")
    return spec.targets?.[0];
  if (spec.kind === "gauge") return (spec.band![0] + spec.band![1]) / 2;
  const pairs = [...new Set(spec.cards.map((c) => c.target))].map((target) =>
    spec.cards.filter((c) => c.target === target).map((c) => c.id),
  );
  return { pairs, moves: pairs.length };
}
export function journey(wrong = false): LearningEvent[] {
  let sequence = 0;
  const events: LearningEvent[] = [];
  const base = (): BaseEvent => ({
    eventId: `event-${++sequence}`,
    attemptId: "mini-attempt",
    learnerId: "learner",
    contentVersion: MINIGAME_VERSION,
    clientSequence: sequence,
    clientTimestamp: "2026-10-07T12:00:00Z",
    serverReceiptTimestamp: null,
  });
  for (const mission of content.missions)
    for (const id of mission.nodeIds) {
      const node = content.nodes.find((n) => n.id === id)!,
        answer = correctAnswer(node.game!);
      if (node.rationaleRequired)
        events.push({
          ...base(),
          type: "handover_prepared",
          nodeId: id,
          text: "Findings, priorities and uncertainty.",
        });
      const raw = wrong ? null : answer;
      events.push({
        ...base(),
        type: "core_response",
        nodeId: id,
        selectedOptionIds: [outcomeId(id, node.game!, raw)],
        presentationOrder: [],
        gameAnswer: raw,
        gameScore: evaluate(node.game!, raw).score,
        ...(node.rationaleRequired
          ? { rationale: "Findings, priorities and uncertainty." }
          : {}),
      });
      events.push({ ...base(), type: "feedback_ack", nodeId: id });
      if (wrong) {
        const b = base();
        events.push({
          ...b,
          type: "correction_response",
          correctionId: node.retryId,
          selectedOptionId: outcomeId(node.retryId, node.game!, answer),
          gameAnswer: answer,
          gameScore: evaluate(node.game!, answer).score,
          feedbackAcknowledged: false,
        });
        events.push({
          ...base(),
          type: "correction_feedback_ack",
          correctionId: node.retryId,
          responseEventId: b.eventId,
        });
      }
    }
  events.push({
    ...base(),
    type: "reflection_submitted",
    text: "Shift handovers reviewed.",
  });
  return events;
}
describe("mini-game draft", () => {
  it("patient cases clear before final retrieval, preventing a badge unlock deadlock", () => {
    const events = journey().filter(
      (event) =>
        !("nodeId" in event && String(event.nodeId).startsWith("FS")) &&
        event.type !== "reflection_submitted",
    );
    const progress = deriveProgress(content, events);
    for (let i = 0; i < 4; i++)
      expect(progress.missionReviewed[`mission-${i}`]).toBe(true);
    expect(progress.missionReviewed["mission-4"]).toBe(false);
  });
  it("both parallel retrieval forms evaluate using the same server rules", () => {
    for (const node of content.nodes.filter(
      (node) => node.stage === "gauntlet",
    ))
      for (const form of ["A", "B"] as const) {
        const answer = {
          form,
          answer: correctAnswer(node.game!.variants![form]),
        };
        expect(evaluate(node.game!, answer).correct).toBe(true);
      }
  });
  it("a forged PASS without a matching raw answer cannot clear a station", () => {
    const events = journey();
    const forged = events.map((event) =>
      event.type === "core_response" && event.nodeId === "C0S1"
        ? { ...event, gameAnswer: null }
        : event,
    );
    expect(deriveProgress(content, forged).clearedNodeIds).not.toContain(
      "C0S1",
    );
  });

  for (const node of content.nodes) {
    it(`${node.id}: authored answer clears, malformed answer misses, schema and EN/TH sources exist`, () => {
      expect(parseSpec(node.game!)).toBeTruthy();
      expect(evaluate(node.game!, correctAnswer(node.game!))).toMatchObject({
        correct: true,
        score: 1,
        mistakes: [],
      });
      expect(evaluate(node.game!, null).correct).toBe(false);
      expect(node.sourceRefs?.length).toBeGreaterThan(0);
      for (const key of ["title", "story", "key", "why"] as const) {
        expect(node.translation![key].en.length).toBeGreaterThan(0);
        expect(node.translation![key].th.length).toBeGreaterThan(0);
      }
      expect(
        content.corrections.find((c) => c.id === node.retryId)?.game,
      ).toEqual(node.game);
    });
  }
  it("validates content links, unique IDs and two or more stations per objective", () => {
    expect(content.nodes).toHaveLength(52);
    expect(practiceRows).toHaveLength(24);
    expect(validateContentLinks(contentVersionSchema.parse(content))).toEqual(
      [],
    );
    expect(new Set(content.nodes.map((n) => n.id)).size).toBe(52);
    for (let i = 1; i <= 7; i++)
      expect(
        content.nodes.filter((n) => n.objectiveIds?.includes(`LO${i}` as never))
          .length,
      ).toBeGreaterThanOrEqual(2);
    expect(content.governance.status).toBe("draft");
  });
  for (const wrong of [false, true])
    it(`${wrong ? "all-corrected" : "all-first-correct"}: resume, explicit review, rewards and client/server agree`, () => {
      const events = journey(wrong);
      const progress = deriveProgress(content, events);
      expect(progress.locallyComplete).toBe(true);
      const rewards = computeRewards(content, events, progress);
      expect(rewards.total).toBe(wrong ? 307 : 355);
      expect(rewards.level).toBe(5);
      expect(rewards.maximum).toBe(355);
      expect(computeRewards(content, [...events, ...events]).total).toBe(
        rewards.total,
      );
      expect(deriveProgress(content, events.slice(0, 20)).locallyComplete).toBe(
        false,
      );
      for (let i = 0; i < events.length; i++) {
        expect(
          validateLearnerEvent(events[i] as unknown as Record<string, unknown>),
        ).toBeNull();
        expect(
          validateLearningSequence(events[i], events.slice(0, i)),
        ).toBeNull();
      }
      expect(recomputeServerSummary(events, MINIGAME_VERSION)).toMatchObject({
        completed: true,
        reward_total: rewards.total,
        first_final_score: wrong ? 0 : 8,
        latest_final_score: 8,
        reward_maximum: 355,
      });
    });
  it("cannot forge PASS, score or count the correction without explicit review", () => {
    const events = journey(true);
    const response = events.find((e) => e.type === "core_response")!;
    expect(
      validateLearnerEvent({ ...response, selectedOptionIds: ["C0S1_PASS"] }),
    ).toMatch(/outcome/);
    expect(validateLearnerEvent({ ...response, gameScore: 1 })).toMatch(
      /score/,
    );
    expect(
      deriveProgress(
        content,
        events.filter((e) => e.type !== "correction_feedback_ack"),
      ).correctedNodeIds,
    ).toHaveLength(0);
    expect(validateLearningSequence(response, [response])).toMatch(/immutable/);
  });
  it("reports real raw-answer misconceptions and separates missing evidence", () => {
    const events = journey(true);
    const evidence = miniGameEvidence(content, events);
    expect(evidence.objectives).toHaveLength(7);
    expect(evidence.mistakes.C0S1.length).toBeGreaterThan(0);
    expect(
      miniGameEvidence(content, []).objectives.every(
        (row) => row.observed === 0,
      ),
    ).toBe(true);
  });
  it("all ten kinds have an evaluator, malformed and duplicate answers cannot pass", () => {
    for (const kind of kinds) {
      const spec: MiniGameSpec = {
        kind,
        instruction: { en: "Test", th: "ทดสอบ" },
        art: "pelvis",
        alt: { en: "Test", th: "ทดสอบ" },
        cards: [
          {
            id: "a",
            label: { en: "A", th: "A" },
            icon: "pelvis",
            target: "bin",
          },
          {
            id: "b",
            label: { en: "B", th: "B" },
            icon: "pelvis",
            target: "bin",
          },
        ],
        bins: [{ id: "bin", label: { en: "Bin", th: "กลุ่ม" } }],
        targets: ["a"],
        order: ["a", "b"],
        range: [0, 100],
        band: [40, 60],
        mistake: "test_misconception",
      };
      expect(evaluate(spec, correctAnswer(spec)).correct).toBe(true);
      expect(evaluate(spec, null).correct).toBe(false);
    }
    const spec = content.nodes.find((n) => n.id === "C1S3")!.game!;
    expect(evaluate(spec, [...spec.targets!, spec.targets![0]]).correct).toBe(
      false,
    );
  });
});
