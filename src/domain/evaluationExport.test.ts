import { describe, expect, it } from "vitest";
import { lectureBankContent as content } from "../content/lectureBank";
import { pelvicTraumaContentV6 } from "../content/content.v6";
import { answerFor } from "../games/answers";
import { testEvidence } from "./assessment";
import { buildEvaluationWorkbook, EVALUATION_TABS, tabValues, bangkok } from "./evaluationExport";
import { evaluate, outcomeId } from "../games/evaluate";
import { solve, wrong } from "../games/answers";
import type { LearningEvent, Node } from "./types";
import type { EvidenceAttempt } from "./assessment";

const pre = content.nodes.filter((node) => node.stage === "pretest");
const post = content.nodes.filter((node) => node.stage === "gauntlet");
const practice = content.nodes.filter((node) => node.stage === "practice");

function learner(id: string, preRight: number, postRight: number, practiceRight: number, cohortId = "cohort-A", status = "reporting"): EvidenceAttempt {
  const attemptId = `attempt-${id}`;
  let sequence = 0;
  const respond = (node: Node, right: boolean, form?: "A" | "B"): LearningEvent => {
    const spec = form ? node.game!.variants![form] : node.game!;
    const answer = right ? solve(spec) : wrong(spec);
    const raw = form ? { form, answer } : answer;
    return { eventId: crypto.randomUUID(), attemptId, learnerId: id, contentVersion: content.id, clientSequence: ++sequence, clientTimestamp: "2026-10-09T02:00:00Z", serverReceiptTimestamp: "2026-10-09T02:05:00Z", type: "core_response", nodeId: node.id, selectedOptionIds: [outcomeId(node.id, node.game!, raw)], presentationOrder: [], gameAnswer: raw, gameScore: evaluate(node.game!, raw).score, elapsedMs: 30000, hintsUsed: 1, ...(node.rationaleRequired ? { rationale: "Unstable pelvis, binder on, need urgent surgery" } : {}) } as LearningEvent;
  };
  const events = [
    ...pre.map((node, i) => respond(node, i < preRight, "B")),
    ...practice.map((node, i) => respond(node, i < practiceRight)),
    // Must-pass items FS2/FS6 are answered correctly whenever the learner gets at least 2 right.
    ...post.map((node, i) => respond(node, node.mustPass ? postRight >= 2 : [0, 2, 3, 4, 6, 7].indexOf(i) < postRight - 2, "A")),
    { eventId: crypto.randomUUID(), attemptId, learnerId: id, contentVersion: content.id, clientSequence: ++sequence, clientTimestamp: "2026-10-09T03:00:00Z", serverReceiptTimestamp: null, type: "course_feedback", usefulness: 5, enjoyment: 4, confidence: 4, comment: "=cmd" } as LearningEvent,
  ];
  return { attemptId, learnerId: id, cohortId, contentVersion: content.id, reportingStatus: status, events, completedAt: null };
}

describe("evaluation workbook", () => {
  const attempts = [learner("S001", 2, 7, 20), learner("S002", 3, 6, 18), learner("S003", 1, 5, 10), learner("S004", 4, 8, 24), learner("S005", 2, 4, 8), learner("QA-ENTRY", 8, 8, 24), learner("S006", 1, 2, 3, "cohort-A", "practice")];
  const roster = ["S001", "S002", "S003", "S004", "S005", "QA-ENTRY", "S006", "S007"].map((learnerId) => ({ learnerId, cohortId: "cohort-A" }));
  const book = buildEvaluationWorkbook({ content, attempts, roster, reviews: [], manualExclusions: new Map([["S005", "withdrew consent"]]), generatedAt: "2026-10-09T05:00:00Z" });

  it("every row matches its tab's columns", () => {
    for (const tab of Object.keys(EVALUATION_TABS) as Array<keyof typeof EVALUATION_TABS>) {
      for (const row of book[tab]) expect(row).toHaveLength(EVALUATION_TABS[tab].headers.length);
    }
  });

  it("flags QA, practice and manually excluded learners but keeps their rows", () => {
    const reason = (id: string) => book.attempts.find((row) => row[1] === id)!.at(-1);
    expect(reason("QA-ENTRY")).toBe("QA / demo account");
    expect(reason("S006")).toMatch(/practice attempt/);
    expect(reason("S005")).toBe("withdrew consent");
    expect(reason("S001")).toBe("");
  });

  it("computes pre/post, pass standard and normalized gain per learner", () => {
    const row = book.attempts.find((item) => item[1] === "S001")!;
    const col = (name: string) => row[EVALUATION_TABS.attempts.headers.indexOf(name as never)];
    expect(col("Pre-test score")).toBe(2);
    expect(col("Post-test score")).toBe(7);
    expect(col("Pass standard met")).toBe(true);
    expect(col("Normalized gain (g)")).toBeCloseTo(5 / 6, 2);
    expect(col("Practice first-try score")).toBe(20);
    expect(col("Time on task (min)")).toBeGreaterThan(0);
  });

  it("computes the paired t-test on included learners only", () => {
    const row = book.cohorts[0];
    const col = (name: string) => row[EVALUATION_TABS.cohorts.headers.indexOf(name as never)];
    // Included: S001..S004 → gains 5, 3, 4, 4.
    const gains = [5, 3, 4, 4];
    const meanGain = gains.reduce((a, b) => a + b) / 4;
    const sd = Math.sqrt(gains.reduce((sum, gain) => sum + (gain - meanGain) ** 2, 0) / 3);
    expect(col("Learners with both tests (n)")).toBe(4);
    expect(col("Mean gain")).toBeCloseTo(meanGain, 2);
    expect(col("Paired t")).toBeCloseTo(meanGain / (sd / 2), 2);
    expect(col("df")).toBe(3);
    expect(String(col("p (two-sided)"))).toMatch(/^=IF\(J2>0,TDIST\(ABS\(I2\),J2,2\),""\)$/);
    expect(col("Enrolled (n)")).toBe(8);
  });

  it("assigns upper/lower post-test groups for discrimination", () => {
    const groups = new Set(book.responses.filter((row) => row[1] === "S004").map((row) => row[18]));
    expect(groups).toEqual(new Set(["upper"]));
    expect(new Set(book.responses.filter((row) => row[1] === "S003").map((row) => row[18]))).toEqual(new Set(["lower"]));
  });

  it("names specific mistakes for the debrief", () => {
    expect(book.misconceptions.length).toBeGreaterThan(0);
    expect(book.misconceptions.every((row) => typeof row[3] === "string" && !(row[3] as string).startsWith("misplaced_"))).toBe(true);
  });

  it("records handover text, course feedback and Bangkok times", () => {
    expect(book.handovers.some((row) => row[5] === "Unstable pelvis, binder on, need urgent surgery")).toBe(true);
    expect(book.feedback).toHaveLength(7);
    expect(bangkok("2026-10-09T02:05:00Z")).toBe("2026-10-09 09:05");
    expect(tabValues(book, "log")[0]).toEqual(["Item", "Value"]);
  });

  it("focused edition: 3-item pre/post, pass = 2 of 3 first try and both safety items", () => {
    const v6 = pelvicTraumaContentV6, posts = v6.nodes.filter((node) => node.stage === "gauntlet");
    expect(v6.nodes.filter((node) => node.stage === "pretest")).toHaveLength(3);
    expect(posts.map((node) => [node.id, Boolean(node.mustPass)])).toEqual([["FS1", true], ["FS2", true], ["FS3", false]]);
    let sequence = 0;
    const answer = (node: Node, right: boolean): LearningEvent => {
      const raw = answerFor(node.game!, right);
      return { eventId: crypto.randomUUID(), attemptId: "v6", learnerId: "S1", contentVersion: v6.id, clientSequence: ++sequence, clientTimestamp: "2026-10-09T02:00:00Z", serverReceiptTimestamp: null, type: "core_response", nodeId: node.id, selectedOptionIds: [outcomeId(node.id, node.game!, raw)], presentationOrder: [], gameAnswer: raw, gameScore: evaluate(node.game!, raw).score } as LearningEvent;
    };
    const safeOnly = testEvidence(v6, posts.map((node) => answer(node, node.mustPass === true)));
    expect(safeOnly.passMark).toBe(2);
    expect(safeOnly.passed).toBe(true);
    const missedSafety = testEvidence(v6, posts.map((node) => answer(node, node.id !== "FS2")));
    expect(missedSafety.post.firstCorrect).toBe(2);
    expect(missedSafety.passed).toBe(false);
  });
});
