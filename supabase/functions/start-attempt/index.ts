import { withSupabase } from "npm:@supabase/server@1";
import {supportedVersion} from "../../../src/domain/serverRules.ts";

type Body = { attemptId?: string; courseId?: string; contentVersion?: string; kind?: "initial" | "practice" };
const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

export default {
  fetch: withSupabase({ auth: "user" }, async (request, ctx) => {
    if (request.method !== "POST") return fail("Method not allowed", 405);
    let body:Body;try{body=await request.json();}catch{return fail("Invalid JSON");}
    const userId = ctx.userClaims?.sub;
    if (!userId || !body.attemptId || !body.courseId || !body.contentVersion || !supportedVersion(body.contentVersion) || !["initial","practice"].includes(body.kind??"")) return fail("Invalid request");

    const { data: existingAttempt } = await ctx.supabaseAdmin.from("attempts").select("id,reporting_status,server_accepted_at").eq("id", body.attemptId).eq("user_id", userId).eq("course_id",body.courseId).eq("content_version",body.contentVersion).maybeSingle();
    if (existingAttempt) return Response.json({ attempt: existingAttempt, reportingAttemptId: existingAttempt.id, conflict: existingAttempt.reporting_status === "conflict" });

    const { data: memberships } = await ctx.supabaseAdmin
      .from("memberships").select("cohort_id, cohorts!inner(course_id)").eq("user_id", userId);
    const membership = (memberships ?? []).find((row) => row.cohorts?.course_id === body.courseId);
    if (!membership) return fail("No authorized course membership", 403);

    const { data: content } = await ctx.supabaseAdmin.from("content_versions").select("id,status").eq("id", body.contentVersion).eq("status", "published").maybeSingle();
    if (!content) return fail("Content version is not published", 409);

    const { data: reporting } = await ctx.supabaseAdmin.from("attempts").select("id,server_accepted_at").eq("user_id", userId).eq("course_id", body.courseId).eq("content_version", body.contentVersion).eq("reporting_status", "reporting").maybeSingle();
    const reportingStatus = body.kind === "practice" ? "practice" : reporting ? "conflict" : "reporting";
    const { data: attempt, error } = await ctx.supabaseAdmin.from("attempts").insert({
      id: body.attemptId, course_id: body.courseId, cohort_id: membership.cohort_id, user_id: userId,
      content_version: body.contentVersion, kind: body.kind, reporting_status: reportingStatus
    }).select("id,reporting_status,server_accepted_at").single();
    if (error) return fail("Attempt could not be created", 409);
    if (reportingStatus === "conflict") await ctx.supabaseAdmin.from("audit_events").insert({ actor_id: userId, action: "attempt_conflict_detected", target_type: "attempt", target_id: body.attemptId, reason: `Reporting attempt remains ${reporting?.id}` });
    return Response.json({ attempt, reportingAttemptId: reporting?.id ?? body.attemptId, conflict: reportingStatus === "conflict" });
  })
};
