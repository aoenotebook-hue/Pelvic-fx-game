// Teacher-only export of the evaluation workbook.
//   operation "rows": returns every tab as JSON (the app turns it into CSV downloads).
//   operation "push": writes the raw tabs into the teacher's Google Sheet (service account; secrets in Supabase).
// Requires an assigned faculty/admin role AND a two-step-verified (aal2) session.
import { withCors, hasTwoStepVerification } from "../_shared/http.ts";
import { withSupabase } from "npm:@supabase/server@1.9.1";
import { assignedFaculty } from "../../../src/domain/authorization.ts";
import { pelvicTraumaContentV4 } from "../../../src/content/content.v4.ts";
import { buildEvaluationWorkbook, EVALUATION_TABS, TEACHER_TABS, tabValues } from "../../../src/domain/evaluationExport.ts";
import type { EvidenceAttempt, TeacherObservation } from "../../../src/domain/assessment.ts";
import { accessToken, safeCell, SheetsClient } from "../_shared/googleSheets.ts";

const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

export default {
  fetch: withCors(withSupabase({ auth: "user" }, async (request, ctx) => {
    if (request.method !== "POST") return fail("Method not allowed", 405);
    let body: { courseId?: string; operation?: string };
    try { body = await request.json(); } catch { return fail("Invalid JSON"); }
    const userId = ctx.userClaims?.id;
    if (!userId || !body.courseId || !["rows", "push"].includes(body.operation ?? "")) return fail("Invalid request");

    const { data: roles, error: roleError } = await ctx.supabaseAdmin.from("role_assignments").select("role,cohort_id").eq("user_id", userId);
    const { data: cohorts, error: cohortError } = await ctx.supabaseAdmin.from("cohorts").select("id").eq("course_id", body.courseId);
    if (roleError || cohortError) return fail("Authorization lookup failed", 500);
    const cohortIds = (cohorts ?? []).filter((cohort) => assignedFaculty(roles ?? [], cohort.id)).map((cohort) => cohort.id);
    if (!cohortIds.length) return fail("Assigned faculty access required", 403);
    if (!hasTwoStepVerification(request)) return fail("Two-step verification required", 403);

    const [{ data: attempts, error: attemptError }, { data: members, error: memberError }, { data: reviewRows, error: reviewError }] = await Promise.all([
      ctx.supabaseAdmin.from("attempts").select("id,user_id,cohort_id,content_version,reporting_status,attempt_summaries(completed_at)").in("cohort_id", cohortIds).eq("content_version", pelvicTraumaContentV4.id),
      ctx.supabaseAdmin.from("memberships").select("user_id,learner_id,cohort_id").in("cohort_id", cohortIds),
      ctx.supabaseAdmin.from("teaching_observations").select("payload").in("cohort_id", cohortIds).order("reviewed_at"),
    ]);
    if (attemptError || memberError || reviewError) return fail("Evidence unavailable", 500);

    const eventsByAttempt = new Map<string, unknown[]>();
    const ids = (attempts ?? []).map((attempt) => attempt.id as string);
    for (let start = 0; start < ids.length; start += 200) {
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await ctx.supabaseAdmin.from("response_events").select("attempt_id,payload,server_receipt_timestamp").in("attempt_id", ids.slice(start, start + 200)).neq("event_type", "rejected").order("attempt_id").order("client_sequence").range(offset, offset + 999);
        if (error) return fail("Evidence unavailable", 500);
        for (const row of data ?? []) {
          const list = eventsByAttempt.get(row.attempt_id) ?? [];
          list.push({ ...row.payload, serverReceiptTimestamp: row.server_receipt_timestamp });
          eventsByAttempt.set(row.attempt_id, list);
        }
        if ((data ?? []).length < 1000) break;
      }
    }
    const learnerFor = (attempt: { user_id: string; cohort_id: string }) => members?.find((member) => member.user_id === attempt.user_id && member.cohort_id === attempt.cohort_id)?.learner_id ?? "restricted";
    const evidence: EvidenceAttempt[] = (attempts ?? []).map((attempt) => {
      const summary = Array.isArray(attempt.attempt_summaries) ? attempt.attempt_summaries[0] : attempt.attempt_summaries;
      return { attemptId: attempt.id, learnerId: learnerFor(attempt), cohortId: attempt.cohort_id, contentVersion: attempt.content_version, reportingStatus: attempt.reporting_status, events: (eventsByAttempt.get(attempt.id) ?? []) as EvidenceAttempt["events"], completedAt: summary?.completed_at ?? null };
    });
    const roster = (members ?? []).map((member) => ({ learnerId: member.learner_id, cohortId: member.cohort_id }));
    const reviews = (reviewRows ?? []).map((row) => row.payload as TeacherObservation);

    if (body.operation === "rows") {
      const workbook = buildEvaluationWorkbook({ content: pelvicTraumaContentV4, attempts: evidence, roster, reviews });
      return Response.json({ tabs: Object.fromEntries(Object.keys(EVALUATION_TABS).map((tab) => [EVALUATION_TABS[tab as keyof typeof EVALUATION_TABS].name, tabValues(workbook, tab as keyof typeof EVALUATION_TABS)])) });
    }

    // push: needs the service account and sheet ID configured as Supabase secrets.
    const rawAccount = Deno.env.get("GOOGLE_SA_JSON"), sheetId = Deno.env.get("SHEET_ID");
    if (!rawAccount || !sheetId) return fail("Google Sheet export is not configured. See docs/google-sheet-setup.md.", 501);
    try {
      const sheets = new SheetsClient(sheetId, await accessToken(JSON.parse(rawAccount)));
      const [exclusionRows, scoredRows] = await sheets.read([`'${TEACHER_TABS.exclusions.name}'!A2:B`, `'${TEACHER_TABS.handoverScoring.name}'!A2:A`]);
      const manualExclusions = new Map(exclusionRows.filter((row) => row[0]).map((row) => [String(row[0]).trim(), String(row[1] ?? "manual exclusion")]));
      const workbook = buildEvaluationWorkbook({ content: pelvicTraumaContentV4, attempts: evidence, roster, reviews, manualExclusions });
      const tabs = Object.keys(EVALUATION_TABS) as Array<keyof typeof EVALUATION_TABS>;
      await sheets.clear(tabs.map((tab) => `'${EVALUATION_TABS[tab].name}'!A1:ZZ`));
      await sheets.write(tabs.map((tab) => ({ range: `'${EVALUATION_TABS[tab].name}'!A1`, values: tabValues(workbook, tab).map((row) => row.map((cell) => safeCell(cell, tab === "cohorts"))) })));
      // Handover scoring is teacher-owned: only append handovers that are not there yet, never overwrite scores.
      const already = new Set(scoredRows.map((row) => String(row[0])));
      const total = '=IF(COUNT(INDIRECT("E"&ROW()&":H"&ROW()))=0,"",SUM(INDIRECT("E"&ROW()&":H"&ROW())))';
      await sheets.append(`'${TEACHER_TABS.handoverScoring.name}'!A1`, workbook.handovers.filter((row) => !already.has(String(row[0])) && !row[8]).map((row) => [safeCell(row[0]), safeCell(row[1]), safeCell(row[4]), safeCell(row[5]), "", "", "", "", total, ""]));
      return Response.json({ pushed: true, attempts: evidence.length });
    } catch (error) {
      console.error("sheet push failed", error instanceof Error ? error.message : "unknown");
      return fail("Google Sheet update failed. Check the sheet is shared with the service account.", 502);
    }
  })),
};
