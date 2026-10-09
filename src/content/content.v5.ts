import { pelvicTraumaContentV3 as clinical, learningRevisionById } from "./content.v3.ts";
import { pelvicTraumaContentV4 as previous, bi } from "./content.v4.ts";
import { FOCUSED_VERSION, type LOId } from "../games/spec.ts";
import type { ContentVersion, Node } from "../domain/types.ts";

// Clinical facts, distractors and source explanations are reused, not invented.
// Keep this edition separate so all older questions and ledgers remain immutable.
const objectives: Record<string, LOId[]> = {
  M1N1: ["LO2", "LO5"], M1N2: ["LO5", "LO7"], M1N3: ["LO1", "LO6"],
  M1N5: ["LO5"], M1N4: ["LO3", "LO5", "LO7"], M1N6: ["LO7"],
  M2N1: ["LO3", "LO6"], M2N2: ["LO1", "LO2", "LO3"], M2N3: ["LO2", "LO3"],
  M2N4: ["LO3", "LO6"], M2N5: ["LO3", "LO7"], M3N1: ["LO4"],
  M3N2: ["LO4"], M3N3: ["LO4", "LO5", "LO7"], M3N4: ["LO4", "LO7"],
};
const references: Record<string, string[]> = {
  M1N1: ["R2"], M1N2: ["R2"], M1N3: ["R3"], M1N5: ["R2"],
  M1N4: ["R2", "R6"], M1N6: ["R6"], M2N1: ["R4"], M2N2: ["R4"],
  M2N3: ["R4"], M2N4: ["R3", "R4"], M2N5: ["R4", "R6"],
  M3N1: ["R5"], M3N2: ["R5"], M3N3: ["R5"], M3N4: ["R5", "R6"],
};
const nodes: Node[] = clinical.nodes.map(node => {
  const copy = learningRevisionById.get(node.id)!;
  const cards = node.options.map((option, i) => ({ id: option.id, label: bi(copy.en.choices[i], copy.th.choices[i]), icon: "team" }));
  return {
    ...node, contentVersion: FOCUSED_VERSION, stage: "practice", objectiveIds: objectives[node.id], resourceIds: references[node.id],
    ...(node.id === "M2N4" ? { reviewNote: "H18 says remove after normal AP; BOAST notes that a binder can mask instability and requires a safe removal protocol. Retain supervised reassessment, not automatic removal. Discuss the source discrepancy and institutional pathway with your educator." } : {}),
    game: { kind: "mcq", art: node.missionId === "mission-1" ? "blood" : node.missionId === "mission-2" ? "pelvis" : "wound", cards, targets: node.correctOptionIds,
      instruction: bi("Choose one team action, then confirm.", "เลือก action ของทีม 1 ข้อ แล้วกดยืนยัน"),
      alt: bi("Fictional teaching scene, not a diagnostic image", "ฉากสอนจำลอง ไม่ใช่ภาพวินิจฉัย"), mistake: "review_key_evidence" },
    options: [{ id: node.id + "_PASS", text: "Appropriate team action", explanation: copy.en.reasons[copy.key] }, { id: node.id + "_MISS", text: "Review and correct", explanation: copy.en.reasons[copy.key] }],
    correctOptionIds: [node.id + "_PASS"],
    translation: { title: bi(copy.en.question, copy.th.question), story: bi(copy.en.stem, copy.th.stem), key: bi(copy.en.reasons[copy.key], copy.th.reasons[copy.key]), why: bi(node.teaching!.suggestedFeedback, copy.th.reasons[copy.key]) },
  };
});
export const pelvicTraumaContentV5: ContentVersion = {
  ...previous, id: FOCUSED_VERSION, title: "Pelvic Trauma Decisions — focused case edition",
  governance: { ...previous.governance, status: "approved", supersedesVersion: previous.id, reviewer: "Sorawut Thamyongkit", reviewDate: "2026-10-08" },
  missions: clinical.missions.map(mission => ({ ...mission, contentVersion: FOCUSED_VERSION, estimatedMinutes: 6 })),
  nodes,
  corrections: nodes.map(node => ({ ...clinical.corrections.find(item => item.id === node.retryId)!, contentVersion: FOCUSED_VERSION, resourceId: node.resourceIds[0],
    game: node.game, options: [{ id: node.retryId + "_PASS", text: "Corrected", explanation: node.translation!.key.en }, { id: node.retryId + "_MISS", text: "Review again", explanation: node.translation!.key.en }], correctOptionId: node.retryId + "_PASS", workedExample: node.translation!.key.en })),
  resources: previous.resources.map(resource => ({ ...resource, contentVersion: FOCUSED_VERSION })), finalForms: [],
};
