import { parseSpec, type MiniGameSpec, type Evaluation } from "./spec.ts";
const same = (a: string[], b: string[]) =>
  a.length === b.length &&
  new Set(a).size === a.length &&
  a.every((x) => b.includes(x));
const strings = (a: unknown): a is string[] =>
  Array.isArray(a) && a.every((x) => typeof x === "string");
export function evaluate(spec: MiniGameSpec, answer: unknown): Evaluation {
  try {
    parseSpec(spec);
  } catch {
    return { correct: false, score: 0, mistakes: ["invalid_spec"] };
  }
  if (spec.variants) {
    const value = answer as { form?: string; answer?: unknown } | null;
    if (!value || !["A", "B"].includes(value.form ?? ""))
      return { correct: false, score: 0, mistakes: ["missing_retrieval_form"] };
    return evaluate(spec.variants[value.form as "A" | "B"], value.answer);
  }
  if (spec.rounds) {
    if (!Array.isArray(answer) || answer.length !== spec.rounds.length)
      return { correct: false, score: 0, mistakes: [spec.mistake] };
    const parts = spec.rounds.map((s, i) => evaluate(s, answer[i]));
    return {
      correct: parts.every((p) => p.correct),
      score: parts.reduce((s, p) => s + p.score, 0) / parts.length,
      mistakes: [...new Set(parts.flatMap((p) => p.mistakes))],
    };
  }
  let correct = false,
    score = 0;
  let mistakes: string[] = [];
  if (["card_sort", "handover_builder"].includes(spec.kind)) {
    if (answer && typeof answer === "object" && !Array.isArray(answer)) {
      const map = answer as Record<string, unknown>;
      const cards = spec.cards.filter((c) => c.target !== undefined);
      const allowed = spec.bins?.map((b) => b.id) ?? [];
      const valid = Object.keys(map).every(
        (id) =>
          spec.cards.some((c) => c.id === id) &&
          typeof map[id] === "string" &&
          allowed.includes(map[id] as string),
      );
      const hits = cards.filter((c) => map[c.id] === c.target);
      score = hits.length / cards.length;
      correct =
        valid &&
        hits.length === cards.length &&
        Object.keys(map).length === cards.length;
      mistakes = cards
        .filter((c) => map[c.id] !== c.target)
        .map((c) => c.mistake ?? spec.mistake);
    }
  } else if (spec.kind === "sequence") {
    if (strings(answer)) {
      score =
        (spec.order ?? []).filter((id, i) => answer[i] === id).length /
        (spec.order?.length || 1);
      correct =
        same(answer, spec.order ?? []) &&
        answer.every((id, i) => id === spec.order?.[i]);
    }
  } else if (spec.kind === "ring_trace") {
    const value = answer as { visited?: unknown; breaks?: unknown } | null;
    if (value && strings(value.visited) && strings(value.breaks)) {
      const targets = spec.targets ?? [];
      score =
        value.breaks.filter((id) => targets.includes(id)).length /
        Math.max(targets.length, value.breaks.length, 1);
      correct =
        same(
          value.visited,
          spec.cards.map((card) => card.id),
        ) && same(value.breaks, targets);
      mistakes = value.breaks
        .filter((id) => !targets.includes(id))
        .map(
          (id) =>
            spec.cards.find((card) => card.id === id)?.mistake ?? spec.mistake,
        );
    }
  } else if (["hotspot", "card_pick"].includes(spec.kind)) {
    if (strings(answer)) {
      const targets = spec.targets ?? [];
      score =
        answer.filter((id) => targets.includes(id)).length /
        Math.max(targets.length, answer.length, 1);
      correct =
        same(answer, targets) &&
        (!spec.order || answer.every((id, i) => id === spec.order?.[i]));
      mistakes = answer
        .filter((id) => !targets.includes(id))
        .map(
          (id) => spec.cards.find((c) => c.id === id)?.mistake ?? spec.mistake,
        );
    }
  } else if (spec.kind === "image_pick" || spec.kind === "mcq") {
    correct = typeof answer === "string" && spec.targets?.[0] === answer;
    score = correct ? 1 : 0;
    mistakes = [
      spec.cards.find((c) => c.id === answer)?.mistake ?? spec.mistake,
    ];
  } else if (spec.kind === "gauge") {
    correct =
      typeof answer === "number" &&
      Number.isFinite(answer) &&
      answer >= (spec.band?.[0] ?? 0) &&
      answer <= (spec.band?.[1] ?? 0);
    score = correct ? 1 : 0;
  } else if (
    spec.kind === "memory_match" &&
    answer &&
    typeof answer === "object"
  ) {
    const { pairs, moves } = answer as { pairs: unknown; moves: unknown };
    if (
      Array.isArray(pairs) &&
      typeof moves === "number" &&
      moves === pairs.length &&
      moves <= 100
    ) {
      const found = new Set<string>();
      let misses = 0;
      for (const p of pairs) {
        if (!strings(p) || p.length !== 2) {
          misses++;
          continue;
        }
        const [a, b] = p.map((id) => spec.cards.find((c) => c.id === id));
        if (
          a &&
          b &&
          a.id !== b.id &&
          a.target === b.target &&
          !found.has(a.target!)
        ) {
          found.add(a.target!);
        } else misses++;
      }
      correct = found.size === new Set(spec.cards.map((c) => c.target)).size;
      score = found.size / Math.max(moves, found.size, 1);
    }
  }
  if (!correct && mistakes.length === 0) mistakes = [spec.mistake];
  return {
    correct,
    score: Math.max(0, Math.min(1, score)),
    mistakes: correct ? [] : [...new Set(mistakes)],
  };
}
export function outcomeId(id: string, spec: MiniGameSpec, answer: unknown) {
  return `${id}_${evaluate(spec, answer).correct ? "PASS" : "MISS"}`;
}
export const starsFor = (score: number): number =>
  score >= 0.9 ? 3 : score >= 0.5 ? 2 : 1;
