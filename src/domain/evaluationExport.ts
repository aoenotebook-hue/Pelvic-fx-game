// Builds the teacher's evaluation workbook (Google Sheet "Pelvic Fx Game — Evaluation") from learner records.
// Pure and provider-neutral: used by the faculty CSV download in the browser and by the sheet-export Edge Function.
//
// Design (medical-education analysis):
// - Tidy, long-format raw tabs: one row = one observation, so pivots and formulas work without reshaping.
// - Pre-test vs post-test on the same blueprint (8 items in the full edition, 3 in the focused edition) → raw gain, Hake normalized gain, paired t, Cohen's dz.
// - Classical test theory per station: difficulty p and discrimination D (upper vs lower 27% by post-test score).
// - Objective (LO1–LO7) first-try mastery per learner; misconception counts for planning the class debrief.
// - QA/demo/practice records are kept but flagged "Exclude", so cohort statistics are not contaminated.
import type { ContentVersion, LearningEvent } from "./types.ts";
import type { EvidenceAttempt, RosterMember, TeacherObservation } from "./assessment.ts";
import { passMarkFor, testEvidence } from "./assessment.ts";
import { deriveProgress } from "./engine.ts";
import { computeRewards } from "./rewards.ts";
import { evaluate } from "../games/evaluate.ts";
import type { MiniGameSpec } from "../games/spec.ts";

export const EVALUATION_TABS = {
  attempts: {
    name: "Attempts",
    headers: ["Record ID", "Student ID", "Cohort", "Attempt ID", "Content version", "Attempt type", "Started (Bangkok)", "Last activity (Bangkok)", "Completed (Bangkok)", "Pre-test score", "Post-test score", "Must-pass safety met", "Pass standard met", "Raw gain", "Normalized gain (g)", "Practice first-try score", "Practice corrected", "Stations answered", "Time on task (min)", "Hints opened", "LO1 first-try %", "LO2 first-try %", "LO3 first-try %", "LO4 first-try %", "LO5 first-try %", "LO6 first-try %", "LO7 first-try %", "Reward", "Exclude from analysis", "Exclude reason"],
  },
  responses: {
    name: "Station Responses",
    headers: ["Record ID", "Student ID", "Cohort", "Attempt ID", "Phase", "Station", "Case", "Objectives", "Bloom level", "Must-pass", "First-try correct (1/0)", "Corrected after feedback (1/0)", "Partial score (0-1)", "Mistakes", "Hints opened", "Time (s)", "Confidence", "Answered (Bangkok)", "Post-test group", "Exclude from analysis"],
  },
  cohorts: {
    name: "Pre-Post by Cohort",
    headers: ["Cohort", "Enrolled (n)", "Completed (n)", "Learners with both tests (n)", "Mean pre score", "Mean post score", "Mean gain", "SD of gain", "Paired t", "df", "p (two-sided)", "Effect size dz", "Mean normalized gain", "Pass rate %"],
  },
  misconceptions: {
    name: "Misconceptions",
    headers: ["Station", "Phase", "Objectives", "Mistake (card or topic)", "Learners with this mistake", "Learners answering", "% of learners", "Teaching point"],
  },
  handovers: {
    name: "Handovers",
    headers: ["Record ID", "Student ID", "Cohort", "Attempt ID", "Case", "Learner's handover reasoning", "SBAR built correctly first try (1/0)", "Answered (Bangkok)", "Exclude from analysis"],
  },
  reviews: {
    name: "Teacher Reviews",
    headers: ["Record ID", "Student ID", "Cohort", "Attempt ID", "Reviewed (Bangkok)", "Scope", "Clinical interpretation", "Priorities / supervised action", "Uncertainty / request", "Observation", "Feedback", "Next step", "Reviewer"],
  },
  feedback: {
    name: "Course Feedback",
    headers: ["Record ID", "Student ID", "Cohort", "Attempt ID", "Submitted (Bangkok)", "Useful for learning (1-5)", "Enjoyable (1-5)", "Confidence (1-5)", "Comment", "Exclude from analysis"],
  },
  roster: {
    name: "Roster",
    headers: ["Student ID", "Cohort", "Started", "Completed", "Exclude from analysis", "Exclude reason"],
  },
  log: { name: "Sync Log", headers: ["Item", "Value"] },
} as const;

/** Tabs the teacher edits; the export reads them and never overwrites them. */
export const TEACHER_TABS = {
  exclusions: { name: "Manual Exclusions", headers: ["Student ID", "Reason (e.g. QA, withdrew, no consent)"] },
  handoverScoring: { name: "Handover Scoring", headers: ["Record ID", "Student ID", "Case", "Learner's handover reasoning", "S (0-2)", "B (0-2)", "A (0-2)", "R (0-2)", "Total /8", "Teacher comment"] },
} as const;

export type Cell = string | number | boolean | null;
export type Workbook = Record<keyof typeof EVALUATION_TABS, Cell[][]>;

const BANGKOK = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
export function bangkok(iso: string | null | undefined): string {
  if (!iso || Number.isNaN(Date.parse(iso))) return "";
  const parts = Object.fromEntries(BANGKOK.formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`;
}
const phaseName = { pretest: "pre-test", practice: "practice", boss: "boss review", gauntlet: "post-test" } as const;
const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN);

/** QA, demo and practice records stay visible but are excluded from cohort statistics. */
export function exclusionReason(learnerId: string, reportingStatus: string, manual: Map<string, string>): string {
  if (manual.has(learnerId)) return manual.get(learnerId) || "manual exclusion";
  if (/^(qa|demo|test)[-_ ]?/i.test(learnerId) || learnerId === "restricted") return "QA / demo account";
  if (reportingStatus !== "reporting") return `${reportingStatus} attempt (not the reporting attempt)`;
  return "";
}

function cardLabels(spec: MiniGameSpec, into = new Map<string, string>()): Map<string, string> {
  for (const card of spec.cards) into.set(`misplaced_${card.id}`, card.label.en);
  spec.rounds?.forEach((part) => cardLabels(part, into));
  if (spec.variants) { cardLabels(spec.variants.A, into); cardLabels(spec.variants.B, into); }
  return into;
}

export interface WorkbookInput {
  content: ContentVersion;
  attempts: EvidenceAttempt[];
  roster: RosterMember[];
  reviews: TeacherObservation[];
  manualExclusions?: Map<string, string>;
  generatedAt?: string;
}

export function buildEvaluationWorkbook(input: WorkbookInput): Workbook {
  const { content, roster, reviews } = input;
  const manual = input.manualExclusions ?? new Map<string, string>();
  const attempts = input.attempts.filter((attempt) => attempt.contentVersion === content.id);
  const nodeById = new Map(content.nodes.map((node) => [node.id, node]));
  const caseTitle = new Map(content.missions.map((mission) => [mission.id, mission.title]));
  const labelsByNode = new Map(content.nodes.filter((node) => node.game).map((node) => [node.id, cardLabels(node.game!)]));
  const mistakeLabel = (nodeId: string, code: string) => labelsByNode.get(nodeId)?.get(code) ?? code.replace(/_/g, " ");

  const facts = attempts.map((attempt) => {
    const events = attempt.events.filter((event) => event.contentVersion === content.id);
    const progress = deriveProgress(content, events);
    const tests = testEvidence(content, events);
    const exclude = exclusionReason(attempt.learnerId, attempt.reportingStatus, manual);
    const core = new Map(events.filter((event): event is Extract<LearningEvent, { type: "core_response" }> => event.type === "core_response").map((event) => [event.nodeId, event] as const));
    return { attempt, events, progress, tests, exclude, core };
  });

  // Post-test groups for discrimination: top and bottom 27% of included learners who finished the post-test.
  const ranked = facts.filter((fact) => !fact.exclude && fact.tests.post.complete).sort((a, b) => b.tests.post.firstCorrect - a.tests.post.firstCorrect);
  const cut = Math.max(1, Math.round(ranked.length * 0.27));
  const group = new Map<string, string>();
  if (ranked.length >= 4) {
    ranked.forEach((fact, index) => group.set(fact.attempt.attemptId, index < cut ? "upper" : index >= ranked.length - cut ? "lower" : "middle"));
  }

  const practiceIds = content.nodes.filter((node) => node.stage === "practice").map((node) => node.id);
  const workbook: Workbook = { attempts: [], responses: [], cohorts: [], misconceptions: [], handovers: [], reviews: [], feedback: [], roster: [], log: [] };

  for (const { attempt, events, progress, tests, exclude, core } of facts) {
    const responses = [...core.values()];
    const loPercent = (lo: string) => {
      const ids = practiceIds.filter((id) => nodeById.get(id)?.objectiveIds?.includes(lo as never));
      const answered = ids.filter((id) => core.has(id));
      return answered.length ? round((100 * answered.filter((id) => progress.firstCorrectNodeIds.includes(id)).length) / answered.length, 0) : "";
    };
    const minutes = responses.reduce((sum, event) => sum + (event.elapsedMs ?? 0), 0) / 60000;
    workbook.attempts.push([
      `ptd:attempt:${attempt.attemptId}`, attempt.learnerId, attempt.cohortId, attempt.attemptId, attempt.contentVersion,
      attempt.reportingStatus === "reporting" ? "initial" : attempt.reportingStatus,
      bangkok(events[0]?.clientTimestamp), bangkok(events.at(-1)?.serverReceiptTimestamp ?? events.at(-1)?.clientTimestamp), bangkok(attempt.completedAt),
      tests.pre.complete ? tests.pre.firstCorrect : "", tests.post.complete ? tests.post.firstCorrect : "",
      tests.post.complete ? tests.mustPassMet : "", tests.passed === null ? "" : tests.passed,
      tests.gain ?? "", tests.normalizedGain === null ? "" : round(tests.normalizedGain),
      practiceIds.filter((id) => progress.firstCorrectNodeIds.includes(id)).length,
      practiceIds.filter((id) => progress.correctedNodeIds.includes(id)).length,
      responses.length, round(minutes, 1), responses.reduce((sum, event) => sum + (event.hintsUsed ?? 0), 0),
      ...["LO1", "LO2", "LO3", "LO4", "LO5", "LO6", "LO7"].map(loPercent),
      computeRewards(content, events, progress).total, Boolean(exclude), exclude,
    ]);

    for (const event of responses) {
      const node = nodeById.get(event.nodeId);
      if (!node?.game) continue;
      const result = evaluate(node.game, event.gameAnswer);
      workbook.responses.push([
        `ptd:response:${attempt.attemptId}:${node.id}`, attempt.learnerId, attempt.cohortId, attempt.attemptId,
        phaseName[node.stage ?? "practice"], node.id, caseTitle.get(node.missionId) ?? node.missionId, (node.objectiveIds ?? []).join(";"),
        node.bloom ?? "", Boolean(node.mustPass), result.correct ? 1 : 0, progress.correctedNodeIds.includes(node.id) ? 1 : 0,
        round(result.score), result.mistakes.map((code) => mistakeLabel(node.id, code)).join("; "),
        event.hintsUsed ?? "", event.elapsedMs === undefined ? "" : Math.round(event.elapsedMs / 1000), event.confidence ?? "",
        bangkok(event.serverReceiptTimestamp ?? event.clientTimestamp), group.get(attempt.attemptId) ?? "", Boolean(exclude),
      ]);
      if (node.game.kind === "handover_builder" || node.rationaleRequired) {
        workbook.handovers.push([
          `ptd:handover:${attempt.attemptId}:${node.id}`, attempt.learnerId, attempt.cohortId, attempt.attemptId,
          caseTitle.get(node.missionId) ?? node.missionId, event.rationale ?? "", result.correct ? 1 : 0,
          bangkok(event.serverReceiptTimestamp ?? event.clientTimestamp), Boolean(exclude),
        ]);
      }
    }
    for (const event of events) {
      if (event.type !== "course_feedback") continue;
      workbook.feedback.push([`ptd:feedback:${event.eventId}`, attempt.learnerId, attempt.cohortId, attempt.attemptId, bangkok(event.serverReceiptTimestamp ?? event.clientTimestamp), event.usefulness, event.enjoyment, event.confidence, event.comment ?? "", Boolean(exclude)]);
    }
  }

  // Misconceptions: how many included learners made each specific mistake on their first try.
  const included = facts.filter((fact) => !fact.exclude);
  for (const node of content.nodes.filter((item) => item.game)) {
    const answering = included.filter((fact) => fact.core.has(node.id));
    if (!answering.length) continue;
    const counts = new Map<string, number>();
    for (const fact of answering) {
      for (const code of evaluate(node.game!, fact.core.get(node.id)!.gameAnswer).mistakes) counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    for (const [code, count] of [...counts].sort((a, b) => b[1] - a[1])) {
      workbook.misconceptions.push([node.id, phaseName[node.stage ?? "practice"], (node.objectiveIds ?? []).join(";"), mistakeLabel(node.id, code), count, answering.length, round((100 * count) / answering.length, 0), node.translation?.key.en ?? ""]);
    }
  }

  // Pre/post statistics per cohort and overall (paired design). p uses the spreadsheet's TDIST.
  const cohortIds = [...new Set([...roster.map((member) => member.cohortId), ...attempts.map((attempt) => attempt.cohortId)])];
  const cohortRow = (label: string, cohortFacts: typeof facts, enrolled: number) => {
    const rowNumber = workbook.cohorts.length + 2;
    const paired = cohortFacts.filter((fact) => !fact.exclude && fact.tests.pre.complete && fact.tests.post.complete);
    const gains = paired.map((fact) => fact.tests.post.firstCorrect - fact.tests.pre.firstCorrect);
    const meanGain = mean(gains);
    const sd = gains.length > 1 ? Math.sqrt(gains.reduce((sum, gain) => sum + (gain - meanGain) ** 2, 0) / (gains.length - 1)) : NaN;
    const t = sd > 0 ? meanGain / (sd / Math.sqrt(gains.length)) : NaN;
    const normalized = paired.map((fact) => fact.tests.normalizedGain).filter((value): value is number => value !== null);
    const postDone = cohortFacts.filter((fact) => !fact.exclude && fact.tests.post.complete);
    const num = (value: number, digits = 2) => (Number.isFinite(value) ? round(value, digits) : "");
    workbook.cohorts.push([
      label, enrolled, cohortFacts.filter((fact) => !fact.exclude && fact.attempt.completedAt).length, paired.length,
      num(mean(paired.map((fact) => fact.tests.pre.firstCorrect))), num(mean(paired.map((fact) => fact.tests.post.firstCorrect))),
      num(meanGain), num(sd), num(t), gains.length > 1 ? gains.length - 1 : "",
      Number.isFinite(t) ? `=IF(J${rowNumber}>0,TDIST(ABS(I${rowNumber}),J${rowNumber},2),"")` : "",
      num(sd > 0 ? meanGain / sd : NaN), num(mean(normalized)),
      postDone.length ? round((100 * postDone.filter((fact) => fact.tests.passed).length) / postDone.length, 0) : "",
    ]);
  };
  for (const cohortId of cohortIds) cohortRow(cohortId, facts.filter((fact) => fact.attempt.cohortId === cohortId), roster.filter((member) => member.cohortId === cohortId).length);
  if (cohortIds.length > 1) cohortRow("All cohorts", facts, roster.length);

  const learnerFor = new Map(attempts.map((attempt) => [attempt.attemptId, attempt]));
  for (const review of reviews) {
    const attempt = learnerFor.get(review.attemptId);
    workbook.reviews.push([`ptd:review:${review.id}`, attempt?.learnerId ?? "", attempt?.cohortId ?? "", review.attemptId, bangkok(review.reviewedAt), `${review.scope}:${review.scopeId}`, review.rubric.clinical_interpretation, review.rubric.priorities_supervised_action, review.rubric.uncertainty_request, review.observation, review.feedback, review.nextStep, review.reviewerId]);
  }

  for (const member of roster) {
    const mine = facts.filter((fact) => fact.attempt.learnerId === member.learnerId && fact.attempt.cohortId === member.cohortId);
    const reason = exclusionReason(member.learnerId, "reporting", manual);
    workbook.roster.push([member.learnerId, member.cohortId, mine.some((fact) => fact.core.size > 0) ? "yes" : "no", mine.some((fact) => fact.attempt.completedAt) ? "yes" : "no", Boolean(reason), reason]);
  }

  workbook.log.push(["Generated (Bangkok)", bangkok(input.generatedAt ?? new Date().toISOString())], ["Content version", content.id], ["Attempts exported", attempts.length], ["Included in statistics", included.length], ["Pass standard", `Post-test ≥ ${passMarkFor(content.nodes.filter((node) => node.stage === "gauntlet").length)}/${content.nodes.filter((node) => node.stage === "gauntlet").length} first try AND every must-pass item (${content.nodes.filter((node) => node.stage === "gauntlet" && node.mustPass).map((node) => node.id).join(", ")}) correct`], ["Normalized gain", "(post − pre) / (8 − pre); learners with pre = 8 have no g"], ["Discrimination D", "First-try rate of upper 27% minus lower 27% by post-test score (needs ≥ 4 learners)"]);
  return workbook;
}

/** Header row + data rows for one tab, ready for CSV or the Sheets API. */
export function tabValues(workbook: Workbook, tab: keyof typeof EVALUATION_TABS): Cell[][] {
  return [[...EVALUATION_TABS[tab].headers], ...workbook[tab]];
}
