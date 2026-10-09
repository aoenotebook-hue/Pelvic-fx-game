import { z } from "zod";
export type LOId = "LO1" | "LO2" | "LO3" | "LO4" | "LO5" | "LO6" | "LO7";
export const MINIGAME_VERSION = "ptd-minigame-draft-2026-10-07";
export const FOCUSED_VERSION = "ptd-minigame-focused-2026-10-08";
export const isGameVersion = (version: string) => [MINIGAME_VERSION, FOCUSED_VERSION].includes(version);
export type LocalText = { en: string; th: string };
export const textSchema = z.object({
  en: z.string().min(1),
  th: z.string().min(1),
});
const card = z.object({
  id: z.string().min(1),
  label: textSchema,
  icon: z.string().default("pelvis"),
  target: z.string().optional(),
  mistake: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});
const base = {
  instruction: textSchema,
  art: z.string(),
  alt: textSchema,
  cards: z.array(card),
  bins: z.array(z.object({ id: z.string(), label: textSchema })).optional(),
  targets: z.array(z.string()).optional(),
  order: z.array(z.string()).optional(),
  count: z.number().int().positive().optional(),
  band: z.tuple([z.number(), z.number()]).optional(),
  range: z.tuple([z.number(), z.number()]).optional(),
  image: z.string().optional(),
  mistake: z.string(),
  unit: z.string().optional(),
};
export const kinds = [
  "card_sort",
  "memory_match",
  "sequence",
  "hotspot",
  "image_pick",
  "card_pick",
  "gauge",
  "ring_trace",
  "handover_builder",
  "mcq",
] as const;
const shape = z.object(base);
export const miniGameSchema = z.discriminatedUnion("kind", [
  shape.extend({ kind: z.literal("card_sort") }),
  shape.extend({ kind: z.literal("memory_match") }),
  shape.extend({ kind: z.literal("sequence") }),
  shape.extend({ kind: z.literal("hotspot") }),
  shape.extend({ kind: z.literal("image_pick") }),
  shape.extend({ kind: z.literal("card_pick") }),
  shape.extend({ kind: z.literal("gauge") }),
  shape.extend({ kind: z.literal("ring_trace") }),
  shape.extend({ kind: z.literal("handover_builder") }),
  shape.extend({ kind: z.literal("mcq") }),
]);
export type MiniGameSpec = z.infer<typeof miniGameSchema> & {
  rounds?: MiniGameSpec[];
  variants?: { A: MiniGameSpec; B: MiniGameSpec };
};
export interface Evaluation {
  correct: boolean;
  score: number;
  mistakes: string[];
}
export function parseSpec(spec: MiniGameSpec): MiniGameSpec {
  const parsed = miniGameSchema.parse(spec);
  return {
    ...parsed,
    ...(spec.rounds ? { rounds: spec.rounds.map(parseSpec) } : {}),
    ...(spec.variants
      ? {
          variants: {
            A: parseSpec(spec.variants.A),
            B: parseSpec(spec.variants.B),
          },
        }
      : {}),
  };
}
