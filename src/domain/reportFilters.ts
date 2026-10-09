import type { EvidenceAttempt, RosterMember, TeacherObservation } from "./assessment.ts";

export const REPORT_TIME_ZONE = "Asia/Bangkok";
export interface ReportFilter { from: string; to: string; basis: "activity" | "completion"; search: string; version: string; }
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
export function validReportRange(from: string, to: string) {
  const validDay = (day: string) => !day || (dayPattern.test(day) && !Number.isNaN(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day);
  return validDay(from) && validDay(to) && (!from || !to || from <= to);
}
export function bangkokDay(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: REPORT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function inReportRange(timestamp: string | null | undefined, filter: Pick<ReportFilter, "from" | "to">) {
  if (!validReportRange(filter.from, filter.to)) return false;
  if (!filter.from && !filter.to) return true;
  const day = timestamp ? bangkokDay(timestamp) : "";
  return Boolean(day && (!filter.from || day >= filter.from) && (!filter.to || day <= filter.to));
}
export function attemptInRange(attempt: EvidenceAttempt, filter: ReportFilter) {
  if (filter.basis === "completion") return Boolean(attempt.completedAt) && inReportRange(attempt.completedAt, filter);
  if (!filter.from && !filter.to) return validReportRange(filter.from, filter.to);
  // Complete attempt context is retained; dates select attempts, not individual answers.
  return attempt.events.some(event => inReportRange(event.serverReceiptTimestamp, filter));
}
export function reportScope(attempts: EvidenceAttempt[], roster: RosterMember[], reviews: TeacherObservation[], filter: ReportFilter) {
  const query = filter.search.trim().toLocaleLowerCase();
  const members = roster.filter(member => member.learnerId.toLocaleLowerCase().includes(query));
  const memberKeys = new Set(members.map(member => `${member.cohortId}:${member.learnerId}`));
  const versionAttempts = attempts.filter(attempt => attempt.contentVersion === filter.version && memberKeys.has(`${attempt.cohortId}:${attempt.learnerId}`));
  const visibleAttempts = versionAttempts.filter(attempt => attemptInRange(attempt, filter));
  const latestTime = (attempt: EvidenceAttempt) => attempt.events.reduce((latest, event) => Math.max(latest, Date.parse(event.serverReceiptTimestamp ?? "") || 0), 0);
  const rows = new Map<string, EvidenceAttempt>();
  for (const attempt of visibleAttempts.filter(attempt => ["reporting", "demo-only"].includes(attempt.reportingStatus)).sort((a, b) => latestTime(a) - latestTime(b) || a.attemptId.localeCompare(b.attemptId))) {
    rows.set(`${attempt.cohortId}:${attempt.learnerId}`, attempt);
  }
  const versionIds = new Set(versionAttempts.map(attempt => attempt.attemptId));
  return {
    members, rows: [...rows.values()], visibleAttempts,
    reviews: reviews.filter(review => versionIds.has(review.attemptId) && inReportRange(review.reviewedAt, filter)),
    notStarted: members.filter(member => !versionAttempts.some(attempt => ["reporting", "demo-only"].includes(attempt.reportingStatus) && attempt.learnerId === member.learnerId && attempt.cohortId === member.cohortId && attempt.events.some(event => event.type === "core_response"))).length,
  };
}
