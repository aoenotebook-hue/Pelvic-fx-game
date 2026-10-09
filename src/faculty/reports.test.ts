import { describe, expect, it } from "vitest";
import { buildTeacherExport } from "./reports";
import { pelvicTraumaContentV5 as content } from "../content/content.v5";
import type { EvidenceAttempt, TeacherObservation } from "../domain/assessment";
const roster = [{ learnerId: "student", cohortId: "cohort" }];
const attempt: EvidenceAttempt = { attemptId: "attempt", learnerId: "student", cohortId: "cohort", contentVersion: content.id, reportingStatus: "reporting", completedAt: null, events: [{ type: "feedback_ack", nodeId: "M1N1", contentVersion: content.id, serverReceiptTimestamp: "2026-10-07T17:00:00Z" }] as EvidenceAttempt["events"] };
const filter = { version: content.id, from: "2026-10-08", to: "2026-10-08", search: "", basis: "activity" as const };
describe("dated teacher exports", () => {
  it("uses the same scope for summary, evidence and objectives and distinguishes no activity", () => {
    for (const kind of ["summary", "evidence", "objectives"] as const) { const file = buildTeacherExport(kind, [attempt], roster, [], filter); expect(file.name).toContain("2026-10-08_2026-10-08"); expect(file.text).toContain("Asia/Bangkok"); expect(file.text).toContain(content.id); }
    const outside = buildTeacherExport("summary", [attempt], roster, [], { ...filter, from: "2026-10-09", to: "2026-10-09" }); expect(outside.text).toContain("no matching evidence in range");
  });
  it("filters review date independently and escapes spreadsheet formulas", () => {
    const review = { attemptId: "attempt", contentVersion: content.id, reviewedAt: "2026-10-08T00:00:00Z", observation: "=HYPERLINK(\"external\")", rubric: {}, feedback: "quoted, text" } as TeacherObservation;
    expect(buildTeacherExport("reviews", [attempt], roster, [review], filter).text).toContain("'=HYPERLINK");
    expect(buildTeacherExport("reviews", [attempt], roster, [review], { ...filter, from: "2026-10-09", to: "2026-10-09" }).text).not.toContain("HYPERLINK");
  });
});
