import { describe, expect, it } from "vitest";
import { pelvicTraumaContentV5 as content } from "./content.v5";
import { pelvicTraumaContentV4 } from "./content.v4";
import { deriveProgress } from "../domain/engine";
import { computeRewards } from "../domain/rewards";
import { recomputeServerSummary, validateLearnerEvent } from "../domain/serverRules";
import { validateLearningSequence } from "../domain/learningRules";
import { contentVersionSchema, validateContentLinks } from "../domain/schema";
import { evaluate, outcomeId } from "../games/evaluate";
import { resolveSession, saveSession } from "../storage/session";
import type { LearningEvent } from "../domain/types";

export function focusedJourney(wrong = false) {
  const events: LearningEvent[] = [];
  const push = (data: Record<string, unknown>) => {
    const event = { eventId: `focused-${events.length}`, attemptId: "focused", learnerId: "learner", contentVersion: content.id, clientSequence: events.length + 1, clientTimestamp: "2026-10-08T00:00:00Z", serverReceiptTimestamp: "2026-10-08T00:00:01Z", ...data } as LearningEvent;
    expect(validateLearnerEvent(event as unknown as Record<string, unknown>)).toBeNull();
    expect(validateLearningSequence(event, events)).toBeNull(); events.push(event); return event;
  };
  for (const mission of content.missions) for (const id of mission.nodeIds) {
    const node = content.nodes.find(n => n.id === id)!, correct = node.game!.targets![0], answer = wrong ? node.game!.cards.find(c => c.id !== correct)!.id : correct;
    if (node.rationaleRequired) push({ type: "handover_prepared", nodeId: id, text: "Findings, priorities and uncertainty." });
    push({ type: "core_response", nodeId: id, selectedOptionIds: [outcomeId(id, node.game!, answer)], presentationOrder: [], gameAnswer: answer, gameScore: evaluate(node.game!, answer).score, ...(node.rationaleRequired ? { rationale: "Findings, priorities and uncertainty." } : {}) });
    push({ type: "feedback_ack", nodeId: id });
    if (wrong) { const response = push({ type: "correction_response", correctionId: node.retryId, selectedOptionId: outcomeId(node.retryId, node.game!, correct), gameAnswer: correct, gameScore: 1, feedbackAcknowledged: false }); push({ type: "correction_feedback_ack", correctionId: node.retryId, responseEventId: response.eventId }); }
  }
  push({ type: "reflection_submitted", text: "Three handovers reviewed." }); return events;
}
describe("focused 15-decision edition", () => {
  it("is linked, bilingual and preserves the 6/5/4 flow with all seven objectives", () => {
    expect(contentVersionSchema.safeParse(content).success).toBe(true); expect(validateContentLinks(content)).toEqual([]);
    expect(content.missions.map(m => m.nodeIds.length)).toEqual([6, 5, 4]);
    expect(content.missions[0].nodeIds.indexOf("M1N5")).toBeLessThan(content.missions[0].nodeIds.indexOf("M1N4"));
    expect(new Set(content.nodes.flatMap(n => n.objectiveIds))).toEqual(new Set(["LO1", "LO2", "LO3", "LO4", "LO5", "LO6", "LO7"]));
    expect(content.nodes.filter(n => n.rationaleRequired)).toHaveLength(3);
    for (const node of content.nodes) { expect(node.game!.cards).toHaveLength(3); expect(node.translation!.story.th).toBeTruthy(); expect(node.teaching!.sources.length).toBeGreaterThan(0); }
  });
  for (const wrong of [false, true]) it(`completes all paths ${wrong ? "through correction" : "first-correct"} with shared rewards`, () => {
    const events = focusedJourney(wrong), p = deriveProgress(content, events), reward = computeRewards(content, events);
    expect(p.locallyComplete).toBe(true); expect(p.handoverNotes).toHaveLength(3); expect(reward.total).toBe(wrong ? 220 : 250); expect(reward.level).toBe(5);
    expect(recomputeServerSummary(events, content.id)).toMatchObject({ completed: true, answered_nodes: 15, reward_total: reward.total, reward_maximum: 250 });
    expect(computeRewards(content, [...events, ...events]).total).toBe(reward.total);
    expect(deriveProgress(content, events.slice(0, -1)).locallyComplete).toBe(false);
  });
  it("does not alter saved 44-station attempts or accept their questions in the new edition", async () => {
    const old = { attemptId: "preserved-v4", contentVersion: pelvicTraumaContentV4.id }; saveSession("demo:preserve-v4", old);
    expect(await resolveSession("demo:preserve-v4", "preserve-v4")).toEqual(old); expect(pelvicTraumaContentV4.nodes).toHaveLength(44);
    expect(validateLearnerEvent({ contentVersion: content.id, type: "feedback_ack", nodeId: "C0S1" })).toBe("Unknown station");
  });
});
