import { describe, expect, it } from "vitest";
import { pelvicTraumaContentV4 as content } from "./content.v4";
import type { MiniGameSpec } from "../games/spec";
import type { Node } from "../domain/types";
import { testEvidence, POST_TEST_PASS_MARK } from "../domain/assessment";
import { evaluate, outcomeId } from "../games/evaluate";
import type { LearningEvent } from "../domain/types";
import { solve, wrong } from "../test/answers";

// Every lecture fact (slides, handout, lesson plan objectives LO1–LO7) must be taught in a scored station.
const LECTURE_FACTS: Array<[string, RegExp]> = [
  ["LO1 APC / LC / VS by force direction", /Vertical shear/],
  ["LO1 ligaments resist external rotation", /resists external rotation/i],
  ["LO1 sacrotuberous resists vertical shear", /Resists vertical shear/i],
  ["LO1 posterior SI complex strongest", /Strongest/],
  ["LO1 associated injuries 51/48/35/26/20/16%", /Head 51%[\s\S]*Long bone 48%[\s\S]*Abdomen 35%[\s\S]*Nerve 26%[\s\S]*Chest 20%[\s\S]*Lower GU 16%/],
  ["LO2 ATLS ABCDE", /Airway \+ C-spine/],
  ["LO2 AMPLE", /Allergies[\s\S]*Medications[\s\S]*Past illnesses[\s\S]*Last meal[\s\S]*Events/],
  ["LO2 head-to-toe secondary survey", /Head-to-toe/],
  ["LO2 compression test manoeuvres", /Medial pressure on both iliac crests/],
  ["LO2 compression test once / not when unstable", /done once only/],
  ["LO2 high-riding prostate", /High-riding prostate/],
  ["LO2 PV examination", /PV examination/],
  ["LO2 L5/S1 dorsiflexion and ankle reflex", /ankle dorsiflexion[\s\S]*ankle reflex/i],
  ["LO2 distal pulses", /dorsalis pedis/],
  ["LO2 Morel-Lavallée", /Morel–Lavallée/],
  ["LO3 AP pelvis ~90%", /About 90%/],
  ["LO3 systematic ring trace", /Trace the ring/],
  ["LO3 inlet 25° caudal / outlet 60° cephalad", /~25° toward the feet[\s\S]*~60° toward the head/],
  ["LO3 Judet for acetabulum", /Judet oblique/],
  ["LO3 CT indications", /Plain films suggest instability/],
  ["LO3 stabilise before CT", /Resuscitated; monitored, escorted/],
  ["LO3 instability signs", /SI widening >5 mm[\s\S]*Symphysis >2\.5 cm[\s\S]*L5 transverse-process avulsion[\s\S]*Ischial-spine avulsion[\s\S]*Ischial-tuberosity avulsion[\s\S]*Superior hemipelvis migration/],
  ["LO3 straddle fracture → posterior ring", /Suspect a posterior ring injury/],
  ["LO4 open = wound communicating, external and internal", /Fat globules[\s\S]*Bone visible[\s\S]*Blood PR/],
  ["LO4 perineal / vaginal wound", /Perineal or vaginal laceration/],
  ["LO4 open fracture mortality 30–50%", /30–50%/],
  ["LO5 shock classes with RR and urine", /RR 30–40/],
  ["LO5 two large-bore IV 16/18G", /16\/18G/],
  ["LO5 labs and group match", /group match/],
  ["LO5 crystalloid 2 L", /Crystalloid loading 2 L/],
  ["LO5 massive transfusion 1:1:1", /1:1:1/],
  ["LO5 ≥4 U LPRC", /≥4 U LPRC/],
  ["LO5 lethal triad", /Hypothermia[\s\S]*Acidosis[\s\S]*Coagulopathy/],
  ["LO5 causes of hypotension", /Spinal shock[\s\S]*Tension haemothorax/],
  ["LO5 FAST", /FAST/],
  ["LO5 80% venous / 20% arterial, superior gluteal", /Superior gluteal artery/],
  ["LO5 flowchart SBP 100 / 4 U / lactate 4", /SBP still <100[\s\S]*4 U PRBC/],
  ["LO5 angio-embolization limits", /only 10–15%/],
  ["LO5 packing and ex-fix", /pelvic packing \+ pelvic ex-fix/],
  ["LO5 antibiotics by Gustilo grade", /Cefazolin 2 g IV[\s\S]*gentamicin 240 mg[\s\S]*penicillin G 2\.4 MU/],
  ["LO5 tetanus and debridement", /Tetanus prophylaxis[\s\S]*Urgent surgical debridement/],
  ["LO6 binder for every suspected pelvic fracture", /every suspected pelvic fracture/],
  ["LO6 greater trochanters, not iliac crest", /Greater trochanters/],
  ["LO6 legs internally rotated, padded", /internally rotated and adducted/],
  ["LO6 sheet and 2 clamps", /2 large clamps/],
  ["LO6 dress wounds first", /Dress any wound/],
  ["LO6 remove within 24 h", /within 24 h/],
  ["LO7 general surgery + orthopaedics + urology", /general surgery \+ orthopaedics \+ urology/i],
  ["LO7 no Foley with meatal blood", /No blind Foley/],
];

const specText = (spec: MiniGameSpec): string => [
  spec.instruction.en,
  ...spec.cards.map((card) => card.label.en),
  ...(spec.bins ?? []).map((bin) => bin.label.en),
  ...(spec.rounds ?? []).map(specText),
  ...(spec.variants ? [specText(spec.variants.A), specText(spec.variants.B)] : []),
].join("\n");
const scored = content.nodes.filter((node) => node.stage === "practice");
const taught = scored.map((node) => `${specText(node.game!)}\n${node.translation!.title.en}\n${node.translation!.key.en}`).join("\n");

describe("lecture coverage", () => {
  for (const [fact, pattern] of LECTURE_FACTS) it(fact, () => expect(taught).toMatch(pattern));

  it("every objective LO1–LO7 has at least two practice stations", () => {
    for (let i = 1; i <= 7; i++) expect(scored.filter((node) => node.objectiveIds?.includes(`LO${i}` as never)).length).toBeGreaterThanOrEqual(2);
  });

  it("every user-visible text has English and Thai", () => {
    const missing: string[] = [];
    const check = (where: string, text?: { en: string; th: string }) => { if (text && (!text.en.trim() || !text.th.trim())) missing.push(where); };
    const walk = (where: string, spec: MiniGameSpec) => {
      check(`${where} instruction`, spec.instruction); check(`${where} alt`, spec.alt);
      spec.cards.forEach((card) => check(`${where} card ${card.id}`, card.label));
      spec.bins?.forEach((bin) => check(`${where} bin ${bin.id}`, bin.label));
      spec.rounds?.forEach((round, i) => walk(`${where} round ${i}`, round));
      if (spec.variants) { walk(`${where} A`, spec.variants.A); walk(`${where} B`, spec.variants.B); }
    };
    for (const node of content.nodes) {
      const tr = node.translation!;
      check(`${node.id} title`, tr.title); check(`${node.id} key`, tr.key); check(`${node.id} why`, tr.why); check(`${node.id} story`, tr.story);
      walk(node.id, node.game!);
    }
    expect(missing).toEqual([]);
  });
});

describe("pre-test and post-test", () => {
  const pre = content.nodes.filter((node) => node.stage === "pretest");
  const post = content.nodes.filter((node) => node.stage === "gauntlet");
  it("has 8 parallel items, one blueprint, two forms each", () => {
    expect(pre).toHaveLength(8);
    expect(post).toHaveLength(8);
    pre.forEach((node, i) => expect(node.objectiveIds).toEqual(post[i].objectiveIds));
    post.forEach((node) => expect(node.game?.variants).toBeDefined());
  });
  it("marks the binder-level and no-Foley items as must-pass", () => {
    expect(post.filter((node) => node.mustPass).map((node) => node.id)).toEqual(["FS2", "FS6"]);
  });
  it("applies the conjunctive pass standard and normalized gain", () => {
    let sequence = 0;
    const answer = (node: Node, right: boolean): LearningEvent => {
      const form = "A";
      const spec = node.game!.variants!.A;
      const correctAnswer = solve(spec);
      const raw = { form, answer: right ? correctAnswer : wrong(spec) };
      return { eventId: crypto.randomUUID(), attemptId: "a", learnerId: "l", contentVersion: content.id, clientSequence: ++sequence, clientTimestamp: "2026-10-09T00:00:00Z", serverReceiptTimestamp: null, type: "core_response", nodeId: node.id, selectedOptionIds: [outcomeId(node.id, node.game!, raw)], presentationOrder: [], gameAnswer: raw, gameScore: evaluate(node.game!, raw).score } as LearningEvent;
    };
    const events = [
      ...pre.map((node, i) => answer(node, i < 2)), // 2/8 before
      ...post.map((node, i) => answer(node, i !== 0 && i !== 7)), // 6/8 after, both must-pass correct
    ];
    const result = testEvidence(content, events);
    expect(result.pre.firstCorrect).toBe(2);
    expect(result.post.firstCorrect).toBe(6);
    expect(result.passed).toBe(true);
    expect(result.normalizedGain).toBeCloseTo(4 / 6);
    const failedSafety = testEvidence(content, [...events.filter((event) => !(event.type === "core_response" && event.nodeId === "FS2")), answer(post[1], false)]);
    expect(failedSafety.post.firstCorrect).toBe(5);
    expect(failedSafety.passed).toBe(false);
    expect(POST_TEST_PASS_MARK).toBe(6);
  });
});


describe("database limits", () => {
  it("keeps the maximum learning score within the attempt_summaries check (<= 88)", () => {
    const scoredNodes = content.nodes.filter((node) => node.stage !== "pretest");
    expect(scoredNodes.length * 2).toBeLessThanOrEqual(88);
  });
});
