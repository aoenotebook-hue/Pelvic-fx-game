import { getContent } from "../content/registry";
import { csvText, learningEvidence, objectiveCounts, type EvidenceAttempt, type RosterMember, type TeacherObservation } from "../domain/assessment";
import { deriveProgress } from "../domain/engine";
import { computeRewards } from "../domain/rewards";
import { reportScope, validReportRange, type ReportFilter } from "../domain/reportFilters";
export type ExportKind = "summary" | "evidence" | "reviews" | "objectives";
export function buildTeacherExport(kind: ExportKind, attempts: EvidenceAttempt[], roster: RosterMember[], reviews: TeacherObservation[], filter: ReportFilter) {
  if (!validReportRange(filter.from, filter.to)) throw new Error("Invalid date range");
  const scope = reportScope(attempts, roster, reviews, filter), content = getContent(filter.version);
  let rows: unknown[][];
  if (kind === "reviews") rows = [["reviewer", "reviewed_at_utc", "attempt", "version", "scope", "rubric", "observation", "feedback", "next_step"], ...scope.reviews.map(r => [r.reviewerId, r.reviewedAt, r.attemptId, r.contentVersion, r.scopeId, JSON.stringify(r.rubric), r.observation, r.feedback, r.nextStep])];
  else if (kind === "evidence") rows = [["learner", "attempt", "version", "decision", "state", "selected_answer", "reason", "confidence", "corrections", "references", "received_at_utc", "question_en", "selected_text_en", "expected_teaching_point_en", "source_references"], ...scope.rows.flatMap(a => learningEvidence(content, a.events).map(e => [a.learnerId, a.attemptId, a.contentVersion, e.node.id, e.state, e.node.game ? JSON.stringify(e.response?.gameAnswer) : e.response?.selectedOptionIds.join(";"), e.response?.rationale, e.response?.confidence, JSON.stringify(e.corrections), JSON.stringify(e.references), e.response?.serverReceiptTimestamp, e.node.translation?.title.en ?? e.node.question, e.node.game ? e.node.game.cards.filter(card => Array.isArray(e.response?.gameAnswer) ? e.response.gameAnswer.includes(card.id) : e.response?.gameAnswer === card.id).map(card => card.label.en).join("; ") : e.node.options.filter(option => e.response?.selectedOptionIds.includes(option.id)).map(option => option.text).join("; "), e.node.translation?.key.en ?? e.node.teaching?.keyMessage, e.node.teaching?.sources.join("; ")]))];
  else if (kind === "objectives") rows = [["version", "objective", "observed", "expected", "first_correct", "corrected", "unresolved"], ...objectiveCounts(content, scope.rows, scope.members.length).map(r => [filter.version, r.id, r.observed, r.expected, r.firstCorrect, r.corrected, r.unresolved])];
  else rows = [["learner", "cohort", "attempt", "version", "status", "answered", "required", "first_correct", "corrected", "reward", "reward_maximum", "reward_scheme", "completed_at_utc"], ...scope.members.map(m => {
    const a = scope.rows.find(a => a.learnerId === m.learnerId && a.cohortId === m.cohortId), p = a ? deriveProgress(content, a.events) : null, r = computeRewards(content, a?.events ?? []);
    return [m.learnerId, m.cohortId, a?.attemptId, filter.version, a ? a.reportingStatus === "demo-only" ? "local demo" : a.completedAt ? "confirmed complete" : "received incomplete" : filter.from || filter.to ? "no matching evidence in range" : "no reporting evidence", p?.answeredNodeIds.length, content.nodes.length, p?.firstCorrectNodeIds.length, p?.correctedNodeIds.length, a ? r.total : undefined, r.maximum, r.scheme, a?.completedAt];
  })];
  const meta = [filter.from, filter.to, "Asia/Bangkok", kind === "reviews" ? "review date" : filter.basis, filter.search];
  return { name: `teacher-${kind}_${filter.from || "all"}_${filter.to || "all"}.csv`, text: csvText(rows.map((row, i) => [...(i ? meta : ["range_from", "range_to", "timezone", "date_basis", "learner_search"]), ...row])) };
}
