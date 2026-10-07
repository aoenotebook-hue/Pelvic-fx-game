import { z } from "zod";
import { miniGameSchema } from "../games/spec";

const id = z.string().min(1).max(120);
const nullableText = z.string().max(500).nullable();
const governance = z.object({
  author: z.string().min(1), reviewer: nullableText, reviewDate: nullableText,
  status: z.enum(["draft", "in_review", "approved", "published", "retired"]),
  supersedesVersion: nullableText
});
const option = z.object({ id, text: z.string().min(1).max(1000), explanation: z.string().min(1).max(2000) });
const node = z.object({
  id, caseId: id, contentVersion: id, missionId: id,
  outcomeIds: z.array(z.enum(["O1", "O2", "O3", "O4", "O5", "O6"])).min(1),
  conceptIds: z.array(z.enum(["S1", "S2", "S3", "S4", "S5", "S6"])), safetyFlag: z.boolean(),
  stem: z.string().min(1), factsAvailableNow: z.array(z.string()), vitals: z.array(z.object({ label: z.string(), value: z.string() })),
  assetId: id.nullable(), textAlternative: z.string().min(1), question: z.string().min(1), options: z.array(option).min(2),
  correctOptionIds: z.array(id).min(1), responseMode: z.enum(["single", "multiple"]), rationalePrompt: z.string().min(1),
  confidenceOptions: z.array(z.enum(["low", "medium", "high"])).length(3), acceptedConditions: z.array(z.string()),
  resourceIds: z.array(id).min(1), referenceIds: z.array(id), retryId: id, nextNodeId: id.nullable(),
  scenePhase: z.string().optional(), interaction: z.enum(["action", "image_choice", "handover","card_sort","memory_match","sequence","hotspot","image_pick","card_pick","gauge","ring_trace","handover_builder","mcq"]).optional(), rationaleRequired: z.boolean().optional(),
  game:miniGameSchema.optional(),objectiveIds:z.array(z.enum(["LO1","LO2","LO3","LO4","LO5","LO6","LO7"])).optional(),sourceRefs:z.array(z.object({doc:z.enum(["S","H","LP"]),page:z.number().int().positive()})).optional(),reviewNote:z.string().optional(),stage:z.enum(["practice","boss","gauntlet"]).optional(),
  explanationBeforeChoices:z.boolean().optional(), teaching:z.object({objective:z.string(),keyMessage:z.string(),misconception:z.string(),discussionPrompt:z.string(),suggestedFeedback:z.string(),sources:z.array(z.string()).min(1)}).optional(),
  visuals: z.array(z.object({ assetId: id, placement: z.enum(["question", "feedback"]), role: z.literal("teaching_example") })).optional()
});
const correction = z.object({
  game:miniGameSchema.optional(),
  id, contentVersion: id.optional(), parentNodeId: id.nullable(), conceptIds: z.array(z.enum(["S1", "S2", "S3", "S4", "S5", "S6"])),
  outcomeIds: z.array(z.enum(["O1", "O2", "O3", "O4", "O5", "O6"])), resourceId: id,
  stem: z.string().min(1), options: z.array(option).min(2), correctOptionId: id, workedExample: z.string().min(1)
});
const finalQuestion = z.object({ id, conceptId: z.enum(["S1", "S2", "S3", "S4", "S5", "S6"]), question: z.string().min(1), options: z.array(option).min(2), correctOptionId: id, correctionId: id });

export const contentVersionSchema = z.object({
  id, title: z.string().min(1), governance,
  missions: z.array(z.object({ id, contentVersion: id.optional(), number: z.number().int().positive(), title: z.string().min(1), entry: z.string().min(1), estimatedMinutes: z.number().positive(), nodeIds: z.array(id).min(1) })).min(3),
  nodes: z.array(node).min(15), corrections: z.array(correction).min(15),
  resources: z.array(z.object({ id, contentVersion: id.optional(), title: z.string().min(1), estimatedMinutes: z.number().nonnegative(), body: z.array(z.string().min(1)).min(1), selfPrompt: z.string().optional(), assetIds: z.array(id).optional(), sourceDocumentIds: z.array(id).optional() })).min(4),
  sourceDocuments: z.array(z.object({ id, title: z.string().min(1), href: z.string().min(1), language: z.string().min(1), note: z.string().min(1) })).min(1),
  assets: z.array(z.object({ id, path: z.string().nullable(), versionHash: z.string(), sourceUrl: z.string().nullable(), owner: z.string().nullable(), licensePermission: z.string().nullable(), reviewStatus: z.enum(["not_provided", "pending", "approved"]), reviewer: z.string().nullable(), reviewDate: z.string().nullable(), altText: z.string(), caption: z.string(), optional: z.boolean(), downloadBytes: z.number().int().nonnegative() })).min(1),
  finalForms: z.array(z.object({ id: z.enum(["form-a", "form-b"]), questions: z.array(finalQuestion).length(6) })).max(0)
});

export function validateContentLinks(value: z.infer<typeof contentVersionSchema>): string[] {
  const errors: string[] = [];
  const nodeIds = new Set(value.nodes.map((item) => item.id));
  const correctionIds = new Set(value.corrections.map((item) => item.id));
  const resourceIds = new Set(value.resources.map((item) => item.id));
  const assetIds = new Set(value.assets.map((item) => item.id));
  const sourceDocumentIds = new Set(value.sourceDocuments.map((item) => item.id));
  for (const mission of value.missions) for (const nodeId of mission.nodeIds) if (!nodeIds.has(nodeId)) errors.push(`Missing node ${nodeId}`);
  for (const item of value.nodes) {
    const optionIds = new Set(item.options.map((optionItem) => optionItem.id));
    for (const key of item.correctOptionIds) if (!optionIds.has(key)) errors.push(`${item.id} missing key ${key}`);
    if (!correctionIds.has(item.retryId)) errors.push(`${item.id} missing correction ${item.retryId}`);
    if (item.nextNodeId && !nodeIds.has(item.nextNodeId)) errors.push(`${item.id} missing next node ${item.nextNodeId}`);
    for (const resourceId of item.resourceIds) if (!resourceIds.has(resourceId)) errors.push(`${item.id} missing resource ${resourceId}`);
    if (item.assetId && !assetIds.has(item.assetId)) errors.push(`${item.id} missing asset ${item.assetId}`);
    for (const visual of item.visuals ?? []) if (!assetIds.has(visual.assetId)) errors.push(`${item.id} missing visual ${visual.assetId}`);
  }
  for (const item of value.resources) {
    for (const assetId of item.assetIds ?? []) if (!assetIds.has(assetId)) errors.push(`${item.id} missing asset ${assetId}`);
    for (const sourceId of item.sourceDocumentIds ?? []) if (!sourceDocumentIds.has(sourceId)) errors.push(`${item.id} missing source document ${sourceId}`);
  }
  for (const item of value.corrections) {
    if (!item.options.some((optionItem) => optionItem.id === item.correctOptionId)) errors.push(`${item.id} missing correction key`);
    if (!resourceIds.has(item.resourceId)) errors.push(`${item.id} missing resource ${item.resourceId}`);
  }
  for (const form of value.finalForms) for (const question of form.questions) {
    if (!question.options.some((optionItem) => optionItem.id === question.correctOptionId)) errors.push(`${question.id} missing final key`);
    if (!correctionIds.has(question.correctionId)) errors.push(`${question.id} missing correction ${question.correctionId}`);
  }
  return errors;
}
