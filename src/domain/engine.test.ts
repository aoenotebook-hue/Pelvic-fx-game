import { describe, expect, it } from "vitest";
import { pelvicTraumaContent } from "../content/content.v1";
import { deriveProgress } from "./engine";
import type { Confidence, LearningEvent } from "./types";

let counter = 0;
function base(sequence: number) { return { eventId: `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`, attemptId: "attempt", learnerId: "learner", contentVersion: pelvicTraumaContent.id, clientSequence: sequence, clientTimestamp: "2026-10-01T00:00:00Z", serverReceiptTimestamp: null }; }
function coreEvents(mode: "correct" | "wrong-corrected", confidence: Confidence = "medium"): LearningEvent[] {
  const events: LearningEvent[] = []; let sequence = 0;
  for (const node of pelvicTraumaContent.nodes) {
    const selected = mode === "correct" ? node.correctOptionIds : [node.options.find((option) => !node.correctOptionIds.includes(option.id))!.id];
    events.push({ ...base(++sequence), type: "core_response", nodeId: node.id, selectedOptionIds: selected, presentationOrder: node.options.map((item) => item.id), confidence, rationale: "I am unsure" });
    events.push({ ...base(++sequence), type: "feedback_ack", nodeId: node.id });
    if (mode === "wrong-corrected") {
      const correction = pelvicTraumaContent.corrections.find((item) => item.id === node.retryId)!;
      events.push({ ...base(++sequence), type: "correction_response", correctionId: correction.id, selectedOptionId: correction.correctOptionId, feedbackAcknowledged: true });
    }
  }
  return events;
}

describe("deterministic learning rules", () => {
  it("resumes pending feedback or correction before the next unanswered decision", () => {
    const correct = coreEvents("correct");
    expect(deriveProgress(pelvicTraumaContent, correct.slice(0, 1)).clearedNodeIds).toEqual([]);
    expect(deriveProgress(pelvicTraumaContent, correct.slice(0, 2)).clearedNodeIds).toEqual(["M1N1"]);
    const corrected = coreEvents("wrong-corrected");
    expect(deriveProgress(pelvicTraumaContent, corrected.slice(0, 2)).clearedNodeIds).toEqual([]);
    expect(deriveProgress(pelvicTraumaContent, corrected.slice(0, 3)).clearedNodeIds).toEqual(["M1N1"]);
  });
  it("awards 30 for 15 first-correct decisions and confidence changes nothing", () => {
    expect(deriveProgress(pelvicTraumaContent, coreEvents("correct", "low")).score).toBe(30);
    expect(deriveProgress(pelvicTraumaContent, coreEvents("correct", "high")).score).toBe(30);
  });

  it("awards 15 after all first answers are wrong then corrected", () => {
    expect(deriveProgress(pelvicTraumaContent, coreEvents("wrong-corrected")).score).toBe(15);
  });

  it("preserves the first response and ignores a replay for extra credit", () => {
    const events = coreEvents("wrong-corrected"); const node = pelvicTraumaContent.nodes[0];
    events.push({ ...base(events.at(-1)!.clientSequence + 1), type: "core_response", nodeId: node.id, selectedOptionIds: node.correctOptionIds, presentationOrder: node.options.map((item) => item.id), confidence: "high", rationale: "Replay" });
    expect(deriveProgress(pelvicTraumaContent, events).score).toBe(15);
  });

  it("requires both S1 nodes and resolves S4 within the binder reassessment quest", () => {
    const events = coreEvents("correct").filter((event) => !(event.type === "feedback_ack" && event.nodeId === "M1N2"));
    expect(deriveProgress(pelvicTraumaContent, events).concepts.find((item) => item.conceptId === "S1")?.resolved).toBe(false);
    const full = coreEvents("correct");
    expect(deriveProgress(pelvicTraumaContent, full).concepts.find((item) => item.conceptId === "S4")?.resolved).toBe(true);
  });

  it("requires a debrief after all 15 quest decisions", () => {
    const events = coreEvents("correct");
    expect(deriveProgress(pelvicTraumaContent, events).locallyComplete).toBe(false);
    events.push({ ...base(events.at(-1)!.clientSequence + 1), type: "reflection_submitted", text: "I will escalate early and reassess after each intervention." });
    expect(deriveProgress(pelvicTraumaContent, events).locallyComplete).toBe(true);
  });

  it("allows all six safety badges to resolve through corrective learning", () => {
    const events = coreEvents("wrong-corrected");
    events.push({ ...base(events.at(-1)!.clientSequence + 1), type: "reflection_submitted", text: "My correction plan is ready." });
    const progress = deriveProgress(pelvicTraumaContent, events);
    expect(progress.concepts.filter((item) => item.resolved)).toHaveLength(6);
    expect(progress.locallyComplete).toBe(true);
    expect(progress.score).toBe(15);
  });

  it("never exposes more than 15 primary quest decisions", () => {
    const progress = deriveProgress(pelvicTraumaContent, coreEvents("correct"));
    expect(pelvicTraumaContent.nodes).toHaveLength(15);
    expect(pelvicTraumaContent.finalForms).toHaveLength(0);
    expect(progress.answeredNodeIds).toHaveLength(15);
  });
});
