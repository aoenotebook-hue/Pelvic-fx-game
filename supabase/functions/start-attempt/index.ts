import { belongsToCourse } from "../../../src/domain/access.ts";
import { withSupabase } from "npm:@supabase/server@1.9.1";
import {supportedVersion} from "../../../src/domain/serverRules.ts";

type Body = { attemptId?: string; courseId?: string; contentVersion?: string; kind?: "initial" | "practice"; originalAttemptId?:string };
const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

export default {
  fetch: withSupabase({ auth: "user" }, async (request, ctx) => {
    if (request.method !== "POST") return fail("Method not allowed", 405);
    let body:Body;try{body=await request.json();}catch{return fail("Invalid JSON");}
    const userId = ctx.userClaims?.id;
    if (!body || !userId || !body.attemptId || !body.courseId || !body.contentVersion || !supportedVersion(body.contentVersion) || !["initial","practice"].includes(body.kind??"")) return fail("Invalid request");

    const { data: existingAttempt } = await ctx.supabaseAdmin.from("attempts").select("id,reporting_status,server_accepted_at").eq("id", body.attemptId).eq("user_id", userId).eq("course_id",body.courseId).eq("content_version",body.contentVersion).maybeSingle();
    if (existingAttempt) return Response.json({ attempt: existingAttempt, reportingAttemptId: existingAttempt.id, conflict: existingAttempt.reporting_status === "conflict" });
    const limit=await ctx.supabaseAdmin.rpc("allow_learner_entry",{bucket_key:`attempt:${userId}`,maximum:12});
    if(limit.error)return fail("Attempt service unavailable",503);
    if(limit.data!==true)return fail("Too many requests. Resume your saved work and retry shortly.",429);

    const { data: memberships } = await ctx.supabaseAdmin
      .from("memberships").select("cohort_id, cohorts!inner(course_id)").eq("user_id", userId);
    const membership = (memberships ?? []).find((row) => belongsToCourse(row.cohorts,body.courseId!));
    if (!membership) return fail("No authorized course membership", 403);

    const { data: content } = await ctx.supabaseAdmin.from("content_versions").select("id,status").eq("id", body.contentVersion).eq("status", "published").maybeSingle();
    if (!content) return fail("Content version is not published", 409);

    const { data: reporting } = await ctx.supabaseAdmin.from("attempts").select("id,server_accepted_at").eq("user_id", userId).eq("course_id", body.courseId).eq("content_version", body.contentVersion).eq("reporting_status", "reporting").maybeSingle();
    const reportingStatus = body.kind === "practice" ? "practice" : reporting ? "conflict" : "reporting";
    if(body.originalAttemptId){const parent=await ctx.supabaseAdmin.from("attempts").select("id").eq("id",body.originalAttemptId).eq("user_id",userId).eq("course_id",body.courseId).eq("content_version",body.contentVersion).maybeSingle();if(parent.error||!parent.data||body.kind!=="practice")return fail("Original attempt unavailable",403);}
    const { data: attempt, error } = await ctx.supabaseAdmin.from("attempts").insert({
      id: body.attemptId, course_id: body.courseId, cohort_id: membership.cohort_id, user_id: userId,
      content_version: body.contentVersion, kind: body.kind, reporting_status: reportingStatus,original_attempt_id:body.originalAttemptId??null
    }).select("id,reporting_status,server_accepted_at").single();
    if (error) return fail(error.code==="P0001"?"Attempt limit reached. Resume saved work or contact your teacher.":"Attempt could not be created", error.code==="P0001"?429:409);
    if (reportingStatus === "conflict") await ctx.supabaseAdmin.from("audit_events").insert({ actor_id: userId, action: "attempt_conflict_detected", target_type: "attempt", target_id: body.attemptId, reason: `Reporting attempt remains ${reporting?.id}` });
    return Response.json({ attempt, reportingAttemptId: reporting?.id ?? body.attemptId, conflict: reportingStatus === "conflict" });
  })
};
