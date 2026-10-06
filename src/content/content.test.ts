import { describe, expect, it } from "vitest";
import { pelvicTraumaContent } from "./content.v1";
import { contentVersionSchema, validateContentLinks } from "../domain/schema";
import { thaiCoverage } from "../i18n";

describe("versioned clinical content", () => {
  it("contains exactly the authored 6 + 5 + 4 core nodes", () => {
    expect(pelvicTraumaContent.missions.map((mission) => mission.nodeIds.length)).toEqual([6, 5, 4]);
    expect(pelvicTraumaContent.nodes).toHaveLength(15);
    expect(new Set(pelvicTraumaContent.nodes.map((node) => node.id)).size).toBe(15);
  });

  it("contains one same-step correction per quest decision and no extra quiz", () => {
    expect(pelvicTraumaContent.corrections.filter((item) => item.parentNodeId)).toHaveLength(15);
    expect(pelvicTraumaContent.corrections).toHaveLength(15);
    expect(pelvicTraumaContent.finalForms).toHaveLength(0);
  });

  it("validates schemas, keys, branches and resource links", () => {
    const parsed = contentVersionSchema.parse(pelvicTraumaContent);
    expect(validateContentLinks(parsed)).toEqual([]);
    for (const node of pelvicTraumaContent.nodes) {
      expect(node.stem.trim()).not.toBe("");
      expect(node.options.every((option) => option.explanation.includes(":"))).toBe(true);
      expect(node.textAlternative.trim()).not.toBe("");
    }
    expect(Object.fromEntries(pelvicTraumaContent.nodes.filter((node) => node.assetId).map((node) => [node.id, node.assetId]))).toEqual({ M1N3: "A16", M2N1: "A15", M2N2: "A15" });
    expect(pelvicTraumaContent.sourceDocuments).toHaveLength(3);
    expect(pelvicTraumaContent.resources.every((resource) => (resource.sourceDocumentIds?.length ?? 0) > 0)).toBe(true);
  });

  it("uses the required safety evidence map without a sixteenth core node", () => {
    const safety = Object.fromEntries(pelvicTraumaContent.nodes.filter((node) => node.safetyFlag).map((node) => [node.id, node.conceptIds]));
    expect(safety).toEqual({ M1N1: ["S1"], M1N2: ["S1"], M1N3: ["S2"], M1N4: ["S3"], M2N4: ["S4"], M3N1: ["S6"], M3N2: ["S5"] });
    expect(pelvicTraumaContent.nodes.some((node) => node.conceptIds.includes("S4"))).toBe(true);
  });

  it("has no fabricated clinical review approval", () => {
    expect(pelvicTraumaContent.governance.status).toBe("draft");
    expect(pelvicTraumaContent.governance.reviewer).toBeNull();
    expect(pelvicTraumaContent.governance.reviewDate).toBeNull();
  });

  it("registers five clothing levels per character and a patient pose for every situation", () => {
    expect(pelvicTraumaContent.assets.filter((asset) => asset.path?.includes("/assets/upgrades/") && !asset.path.endsWith("sheet.png"))).toHaveLength(20);
    expect(pelvicTraumaContent.assets.filter((asset) => asset.path?.includes("/assets/reactions/"))).toHaveLength(24);
    expect(pelvicTraumaContent.assets.filter((asset) => asset.path?.includes("/assets/patient-reactions/"))).toHaveLength(21);
  });

  it("covers every learner-facing clinical item in the Thai content layer", () => {
    expect(thaiCoverage.missions).toHaveLength(3);
    expect(thaiCoverage.nodes).toHaveLength(15);
    expect(thaiCoverage.corrections).toHaveLength(15);
    expect(thaiCoverage.resources).toHaveLength(5);
  });
});
