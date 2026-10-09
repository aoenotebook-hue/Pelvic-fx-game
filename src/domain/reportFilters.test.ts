import { describe, expect, it } from "vitest";
import { bangkokDay, reportScope, validReportRange } from "./reportFilters";
import type { EvidenceAttempt, TeacherObservation } from "./assessment";
const filter = { from: "2026-10-08", to: "2026-10-08", basis: "activity" as const, search: "", version: "v" };
const attempt = (id: string, timestamp: string, status = "reporting"): EvidenceAttempt => ({ attemptId: id, learnerId: "learner", cohortId: "cohort", contentVersion: "v", reportingStatus: status, completedAt: null, events: [{ type: "core_response", serverReceiptTimestamp: timestamp }] as EvidenceAttempt["events"] });
const roster = [{ learnerId: "learner", cohortId: "cohort" }, { learnerId: "not-started", cohortId: "cohort" }];
describe("teacher date scope", () => {
  it("uses Bangkok midnight and inclusive end dates", () => {
    expect(bangkokDay("2026-10-07T17:00:00Z")).toBe("2026-10-08");
    expect(reportScope([attempt("a", "2026-10-08T16:59:59Z"), attempt("b", "2026-10-08T17:00:00Z")], roster, [], filter).rows.map(row => row.attemptId)).toEqual(["a"]);
  });
  it("rejects reversed or invalid dates", () => {
    expect(validReportRange("2026-10-09", "2026-10-08")).toBe(false);
    expect(validReportRange("2026-02-30", "")).toBe(false);
    expect(reportScope([attempt("a", "2026-10-08T00:00:00Z")], roster, [], { ...filter, from: "invalid" }).rows).toEqual([]);
  });
  it("keeps practice out of summaries and missing evidence distinct", () => {
    const scope = reportScope([attempt("a", "2026-10-08T00:00:00Z", "practice")], roster, [], filter);
    expect(scope.rows).toEqual([]); expect(scope.visibleAttempts).toHaveLength(1); expect(scope.notStarted).toBe(2);
  });
  it("selects completion date, keeps whole evidence and counts one attempt per learner", () => {
    const older = attempt("older", "2026-10-08T00:00:00Z"), newer = attempt("newer", "2026-10-08T01:00:00Z");
    newer.completedAt = "2026-10-07T18:00:00Z";
    expect(reportScope([older, newer], roster, [], filter).rows[0]).toBe(newer);
    expect(reportScope([older, newer], roster, [], { ...filter, basis: "completion" }).rows).toEqual([newer]);
    expect(reportScope([older, newer], roster, [], { ...filter, basis: "completion", from: "", to: "" }).rows).toEqual([newer]);
  });
  it("filters reviews by their own date and learner search without version mixing", () => {
    const a = attempt("a", "2026-10-01T00:00:00Z");
    const review = { attemptId: "a", reviewedAt: "2026-10-08T00:00:00Z" } as TeacherObservation;
    expect(reportScope([a], roster, [review], filter).reviews).toEqual([review]);
    expect(reportScope([a], roster, [review], { ...filter, search: "not-started" }).reviews).toEqual([]);
    expect(reportScope([a], roster, [review], { ...filter, version: "old" }).reviews).toEqual([]);
  });
});
