import type { MiniGameSpec } from "./spec.ts";

/** Builds the authored correct answer for a single-round spec. */
export function solve(spec: MiniGameSpec): unknown {
  if (spec.rounds) return spec.rounds.map(solve);
  switch (spec.kind) {
    case "card_sort": case "handover_builder": return Object.fromEntries(spec.cards.filter((card) => card.target).map((card) => [card.id, card.target!]));
    case "sequence": return spec.order;
    case "image_pick": case "mcq": return spec.targets![0];
    case "card_pick": case "hotspot": return spec.order ?? spec.targets;
    case "gauge": return spec.band![0];
    case "ring_trace": return { visited: spec.cards.map((card) => card.id), breaks: spec.targets };
    case "memory_match": { const targets = [...new Set(spec.cards.map((card) => card.target!))]; return { pairs: targets.map((target) => spec.cards.filter((card) => card.target === target).map((card) => card.id)), moves: targets.length }; }
  }
  return null;
}
export function wrong(spec: MiniGameSpec): unknown {
  if (spec.rounds) return spec.rounds.map((round, i) => (i === 0 ? wrong(round) : solve(round)));
  return spec.kind === "gauge" ? spec.range![1] + 1 : spec.kind === "image_pick" ? spec.cards.find((card) => card.id !== spec.targets![0])!.id : [];
}
/** Answer for a whole station, including two-form (A/B) stations, as the station would record it. */
export function answerFor(spec: MiniGameSpec, correct: boolean): unknown {
  if (spec.variants) return { form: "A", answer: correct ? solve(spec.variants.A) : wrong(spec.variants.A) };
  return correct ? solve(spec) : wrong(spec);
}
