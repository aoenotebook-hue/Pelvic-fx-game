// Fictional class (clearly labelled) used only to check the evaluation sheet's formulas.
// Run: npx tsx scripts/sample-workbook.ts > sample.json
import { pelvicTraumaContentV4 as content } from "../src/content/content.v4.ts";
import { buildEvaluationWorkbook, EVALUATION_TABS, tabValues } from "../src/domain/evaluationExport.ts";
import { evaluate, outcomeId } from "../src/games/evaluate.ts";
import { solve, wrong } from "../src/test/answers.ts";
import type { LearningEvent, Node } from "../src/domain/types.ts";

const pre = content.nodes.filter((node) => node.stage === "pretest");
const post = content.nodes.filter((node) => node.stage === "gauntlet");
const practice = content.nodes.filter((node) => node.stage === "practice");
function learner(id: string, preRight: number, postRight: number, practiceRight: number) {
  const attemptId = `fictional-${id}`;
  let sequence = 0;
  const respond = (node: Node, right: boolean, form?: "A" | "B"): LearningEvent => {
    const spec = form ? node.game!.variants![form] : node.game!;
    const answer = right ? solve(spec) : wrong(spec);
    const raw = form ? { form, answer } : answer;
    return { eventId: `${attemptId}-${node.id}`, attemptId, learnerId: id, contentVersion: content.id, clientSequence: ++sequence, clientTimestamp: "2026-10-09T02:00:00Z", serverReceiptTimestamp: "2026-10-09T02:05:00Z", type: "core_response", nodeId: node.id, selectedOptionIds: [outcomeId(node.id, node.game!, raw)], presentationOrder: [], gameAnswer: raw, gameScore: evaluate(node.game!, raw).score, elapsedMs: 20000 + sequence * 100, hintsUsed: sequence % 3 === 0 ? 1 : 0, ...(node.rationaleRequired ? { rationale: "Fictional: hypotensive, binder on, asking for urgent general surgery and ortho" } : {}) } as LearningEvent;
  };
  const events = [
    ...pre.map((node, i) => respond(node, i < preRight, "B")),
    ...practice.map((node, i) => respond(node, (i * 7 + id.length) % 24 < practiceRight)),
    ...post.map((node, i) => respond(node, node.mustPass ? postRight >= 2 : [0, 2, 3, 4, 6, 7].indexOf(i) < postRight - 2, "A")),
    { eventId: `${attemptId}-fb`, attemptId, learnerId: id, contentVersion: content.id, clientSequence: ++sequence, clientTimestamp: "2026-10-09T03:00:00Z", serverReceiptTimestamp: "2026-10-09T03:01:00Z", type: "course_feedback", usefulness: 4 + (id.length % 2), enjoyment: 4, confidence: 3 + (preRight % 2) } as LearningEvent,
  ];
  return { attemptId, learnerId: id, cohortId: "FICTIONAL-COHORT", contentVersion: content.id, reportingStatus: "reporting", events, completedAt: "2026-10-09T03:00:00Z" };
}
const attempts = [learner("F001", 2, 7, 20), learner("F002", 3, 6, 18), learner("F003", 1, 5, 10), learner("F004", 4, 8, 24), learner("F005", 2, 4, 8), learner("F006", 3, 7, 16), learner("QA-1", 8, 8, 24)];
const roster = [...attempts.map((attempt) => ({ learnerId: attempt.learnerId, cohortId: "FICTIONAL-COHORT" })), { learnerId: "F007", cohortId: "FICTIONAL-COHORT" }];
const book = buildEvaluationWorkbook({ content, attempts, roster, reviews: [], generatedAt: "2026-10-09T05:00:00Z" });
console.log(JSON.stringify(Object.fromEntries((Object.keys(EVALUATION_TABS) as Array<keyof typeof EVALUATION_TABS>).map((tab) => [EVALUATION_TABS[tab].name, tabValues(book, tab)]))));
