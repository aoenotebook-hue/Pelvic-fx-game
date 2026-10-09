import { pelvicTraumaContent as legacy } from "./content.v1.ts";
import { pelvicTraumaContentV2 } from "./content.v2.ts";
import { pelvicTraumaContentV3 } from "./content.v3.ts";
import { pelvicTraumaContentV4 } from "./content.v4.ts";
import { pelvicTraumaContentV5 } from "./content.v5.ts";
import type { ContentVersion } from "../domain/types.ts";

export const contentVersions = new Map([legacy, pelvicTraumaContentV2, pelvicTraumaContentV3, pelvicTraumaContentV4, pelvicTraumaContentV5].map((content) => [content.id, content]));
export const latestContent = pelvicTraumaContentV5;
export function getContent(version: string): ContentVersion {
  const content = contentVersions.get(version);
  if (!content) throw new Error(`Unsupported content version: ${version}`);
  return content;
}

// One active attempt per app window. Bindings update together before rendering.
export let pelvicTraumaContent = latestContent;
export let assetById = new Map(pelvicTraumaContent.assets.map((item) => [item.id, item]));
export let correctionById = new Map(pelvicTraumaContent.corrections.map((item) => [item.id, item]));
export let resourceById = new Map(pelvicTraumaContent.resources.map((item) => [item.id, item]));
export let sourceDocumentById = new Map(pelvicTraumaContent.sourceDocuments.map((item) => [item.id, item]));
export function activateContent(version: string) {
  pelvicTraumaContent = getContent(version);
  assetById = new Map(pelvicTraumaContent.assets.map((item) => [item.id, item]));
  correctionById = new Map(pelvicTraumaContent.corrections.map((item) => [item.id, item]));
  resourceById = new Map(pelvicTraumaContent.resources.map((item) => [item.id, item]));
  sourceDocumentById = new Map(pelvicTraumaContent.sourceDocuments.map((item) => [item.id, item]));
}
