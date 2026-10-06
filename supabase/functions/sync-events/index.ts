import { withSupabase } from "npm:@supabase/server@1";
import { validateLearnerEvent, recomputeServerSummary, serverRules } from "../../../src/domain/serverRules.ts";
import {validateLearningSequence} from "../../../src/domain/learningRules.ts";
import type {LearningEvent} from "../../../src/domain/types.ts";

type IncomingEvent = {
  eventId: string; attemptId: string; learnerId: string; contentVersion: string; clientSequence: number;
  clientTimestamp: string; type: string; nodeId?: string; correctionId?: string; selectedOptionIds?: string[];
  selectedOptionId?: string; [key: string]: unknown;
};

function reject(message: string, status = 400) { return Response.json({ error: message }, { status }); }
async function sha256(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default {
  fetch: withSupabase({ auth: "user" }, async (request, ctx) => {
    if (request.method !== "POST") return reject("Method not allowed", 405);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > serverRules.maxBatchBytes) return reject("Batch is too large", 413);
    let body: { courseId?: string; events?: IncomingEvent[] };
    try { body = JSON.parse(raw); } catch { return reject("Invalid JSON"); }
    if (!body.courseId || !Array.isArray(body.events) || body.events.length > serverRules.maxBatchEvents) return reject("Invalid batch");
    const userId = ctx.userClaims?.sub;
    if (!userId) return reject("Authentication required", 401);

    const acknowledgments: Array<{ eventId: string; serverReceiptTimestamp: string }> = [];
    const retryable: string[] = [];
    const rejected: Array<{ eventId: string; reason: string }> = [];

    if(body.events.some(event=>!event||typeof event!=="object"))return reject("Malformed event");
    const ordered = [...body.events].sort((a, b) => a.clientSequence - b.clientSequence);
    for (const event of ordered) {
      if (new TextEncoder().encode(JSON.stringify(event)).length > serverRules.maxEventBytes || !event.eventId || !event.attemptId || !Number.isInteger(event.clientSequence) || event.clientSequence<1) {
        rejected.push({ eventId: event.eventId ?? "unknown", reason: "Malformed or oversized event" }); continue;
      }
      const validationError = validateLearnerEvent(event);
      if (validationError) { rejected.push({eventId:event.eventId,reason:validationError}); continue; }

      const hash = await sha256(event);
      const { data: existing } = await ctx.supabaseAdmin.from("response_events").select("payload_sha256,server_receipt_timestamp").eq("user_id", userId).eq("attempt_id", event.attemptId).eq("event_id", event.eventId).maybeSingle();
      if (existing) {
        if (existing.payload_sha256 !== hash) rejected.push({ eventId: event.eventId, reason: "Event ID was reused with altered data" });
        else acknowledgments.push({ eventId: event.eventId, serverReceiptTimestamp: existing.server_receipt_timestamp });
        continue;
      }

      const { data: attempt } = await ctx.supabaseAdmin.from("attempts").select("id,user_id,course_id,content_version").eq("id", event.attemptId).eq("user_id", userId).eq("course_id", body.courseId).maybeSingle();
      if (!attempt || attempt.content_version !== event.contentVersion) { rejected.push({ eventId: event.eventId, reason: "Attempt ownership or version mismatch" }); continue; }
      const {data:prior,error:priorError}=await ctx.supabaseAdmin.from("response_events").select("payload").eq("attempt_id",event.attemptId).order("client_sequence");
      if(priorError){retryable.push(event.eventId);continue;}
      const sequenceError=validateLearningSequence(event as unknown as LearningEvent,(prior??[]).map(row=>row.payload));
      if(sequenceError){rejected.push({eventId:event.eventId,reason:sequenceError});continue;}
      const { data: latest } = await ctx.supabaseAdmin.from("response_events").select("client_sequence").eq("attempt_id", event.attemptId).order("client_sequence", { ascending: false }).limit(1).maybeSingle();
      if (event.clientSequence > (latest?.client_sequence ?? 0) + 1) { retryable.push(event.eventId); continue; }

      const { data: inserted, error } = await ctx.supabaseAdmin.from("response_events").insert({
        event_id: event.eventId, attempt_id: event.attemptId, user_id: userId, content_version: event.contentVersion,
        client_sequence: event.clientSequence, event_type: event.type, payload: event, payload_sha256: hash,
        client_timestamp: event.clientTimestamp
      }).select("server_receipt_timestamp").single();
      if (error) { retryable.push(event.eventId); continue; }
      acknowledgments.push({ eventId: event.eventId, serverReceiptTimestamp: inserted.server_receipt_timestamp });
    }

    const attemptIds = [...new Set(ordered.map((event) => event.attemptId))];
    let completionReceipt: { status: "server_confirmed"; completedAt: string; reportingAttemptId: string } | undefined;
    for (const id of attemptIds) {
      const { data: owned } = await ctx.supabaseAdmin.from("attempts").select("content_version,reporting_status").eq("id",id).eq("user_id",userId).eq("course_id",body.courseId).maybeSingle();
      if (!owned) continue;
      const { data: stored, error: readError } = await ctx.supabaseAdmin.from("response_events").select("payload,server_receipt_timestamp").eq("attempt_id", id).eq("user_id",userId).order("client_sequence", { ascending: true });
      if (readError) continue;
      const summary = recomputeServerSummary((stored ?? []).map((row) => row.payload),owned.content_version);
      summary.last_event_at=stored?.at(-1)?.server_receipt_timestamp??null;
      const {data:confirmed,error: summaryError} = await ctx.supabaseAdmin.from("attempt_summaries").upsert({ attempt_id: id, ...summary }, { onConflict: "attempt_id" }).select("completed_at").single();
      if (!summaryError && summary.completed && owned.reporting_status === "reporting" && confirmed?.completed_at) completionReceipt = { status: "server_confirmed", completedAt: confirmed.completed_at, reportingAttemptId: id };
    }
    return Response.json({ acknowledgments, retryable, rejected, completionReceipt });
  })
};
