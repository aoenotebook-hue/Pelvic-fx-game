import { withSupabase } from "npm:@supabase/server@1.9.1";
import { validateLearnerEvent, recomputeServerSummary, serverRules } from "../../../src/domain/serverRules.ts";
import {validateLearningSequence} from "../../../src/domain/learningRules.ts";
import type {LearningEvent} from "../../../src/domain/types.ts";

type IncomingEvent = {
  eventId: string; attemptId: string; learnerId: string; contentVersion: string; clientSequence: number;
  clientTimestamp: string; type: string; nodeId?: string; correctionId?: string; selectedOptionIds?: string[];
  selectedOptionId?: string; [key: string]: unknown;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Removed learners and retired content must not keep writing evidence.
async function stillEnrolled(admin: any, userId: string, cohortId: string, version: string) {
  const [{ data: member }, { data: content }] = await Promise.all([
    admin.from("memberships").select("learner_id").eq("user_id", userId).eq("cohort_id", cohortId).maybeSingle(),
    admin.from("content_versions").select("status").eq("id", version).maybeSingle()
  ]);
  return member && content?.status === "published" ? String(member.learner_id) : null;
}
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
    const userId = ctx.userClaims?.id;
    if (!userId) return reject("Authentication required", 401);

    const acknowledgments: Array<{ eventId: string; serverReceiptTimestamp: string }> = [];
    const retryable: string[] = [];
    const rejected: Array<{ eventId: string; reason: string }> = [];

    if(body.events.some(event=>!event||typeof event!=="object"))return reject("Malformed event");
    const ordered = [...body.events].sort((a, b) => a.clientSequence - b.clientSequence);
    // Per-request cache of each attempt's stored payloads, so sequence checks are not re-queried per event.
    const priorByAttempt = new Map<string, { payloads: Record<string, unknown>[]; latest: number; bySequence: Map<number, Record<string, unknown>> }>();
    const loadPrior = async (attemptId: string) => {
      const cached = priorByAttempt.get(attemptId);
      if (cached) return cached;
      const { data, error } = await ctx.supabaseAdmin.from("response_events").select("client_sequence,payload").eq("attempt_id", attemptId).order("client_sequence");
      if (error) return null;
      const rows = data ?? [];
      const entry = { payloads: rows.map((row) => row.payload), latest: rows.at(-1)?.client_sequence ?? 0, bySequence: new Map(rows.map((row) => [row.client_sequence as number, row.payload as Record<string, unknown>])) };
      priorByAttempt.set(attemptId, entry);
      return entry;
    };
    for (const event of ordered) {
      if (new TextEncoder().encode(JSON.stringify(event)).length > serverRules.maxEventBytes || typeof event.attemptId !== "string" || !UUID.test(event.attemptId) || !Number.isInteger(event.clientSequence) || event.clientSequence<1) {
        rejected.push({ eventId: String(event.eventId ?? "unknown"), reason: "Malformed or oversized event" }); continue;
      }
      const hash = await sha256(event);
      if (typeof event.eventId === "string" && UUID.test(event.eventId)) {
        const { data: existing } = await ctx.supabaseAdmin.from("response_events").select("payload_sha256,server_receipt_timestamp").eq("user_id", userId).eq("attempt_id", event.attemptId).eq("event_id", event.eventId).maybeSingle();
        if (existing) {
          if (existing.payload_sha256 !== hash) rejected.push({ eventId: event.eventId, reason: "Event ID was reused with altered data" });
          else acknowledgments.push({ eventId: event.eventId, serverReceiptTimestamp: existing.server_receipt_timestamp });
          continue;
        }
      }

      const { data: attempt } = await ctx.supabaseAdmin.from("attempts").select("id,user_id,course_id,cohort_id,content_version").eq("id", event.attemptId).eq("user_id", userId).eq("course_id", body.courseId).maybeSingle();
      if (!attempt || attempt.content_version !== event.contentVersion) { rejected.push({ eventId: String(event.eventId), reason: "Attempt ownership or version mismatch" }); continue; }
      const enrolledLearnerId = await stillEnrolled(ctx.supabaseAdmin, userId, attempt.cohort_id, attempt.content_version);
      if (!enrolledLearnerId) { rejected.push({ eventId: String(event.eventId), reason: "Enrollment or published content is no longer active" }); continue; }
      const prior = await loadPrior(event.attemptId);
      if (!prior) { retryable.push(String(event.eventId)); continue; }
      if (event.clientSequence > prior.latest + 1) { retryable.push(String(event.eventId)); continue; }
      if (event.clientSequence <= prior.latest) {
        const occupant = prior.bySequence.get(event.clientSequence);
        const reason = occupant?.type === "rejected" && occupant.rejectedEventId === event.eventId ? String(occupant.reason ?? "Rejected") : "Sequence position already used";
        rejected.push({ eventId: String(event.eventId), reason }); continue;
      }

      const formatError = typeof event.eventId !== "string" || !UUID.test(event.eventId) ? "Event ID must be a UUID"
        : typeof event.clientTimestamp !== "string" || Number.isNaN(Date.parse(event.clientTimestamp)) ? "Invalid client timestamp" : null;
      const validationError = formatError ?? validateLearnerEvent(event) ?? validateLearningSequence(event as unknown as LearningEvent, prior.payloads as unknown as LearningEvent[]);
      const row = validationError
        // A rejected event keeps its sequence position as a tombstone so that later valid events are never blocked by a gap.
        ? { event_id: crypto.randomUUID(), event_type: "rejected", payload: { type: "rejected", rejectedEventId: String(event.eventId), reason: validationError, attemptId: event.attemptId, contentVersion: event.contentVersion, clientSequence: event.clientSequence } }
        : { event_id: event.eventId, event_type: event.type, payload: { ...event, learnerId: enrolledLearnerId } }; // learnerId comes from the enrollment, never from the client
      const { data: inserted, error } = await ctx.supabaseAdmin.from("response_events").insert({
        ...row, attempt_id: event.attemptId, user_id: userId, content_version: event.contentVersion,
        client_sequence: event.clientSequence, payload_sha256: validationError ? await sha256(row.payload) : hash,
        client_timestamp: validationError ? null : event.clientTimestamp
      }).select("server_receipt_timestamp").single();
      if (error) { priorByAttempt.delete(event.attemptId); retryable.push(String(event.eventId)); continue; }
      prior.payloads.push(row.payload as Record<string, unknown>); prior.bySequence.set(event.clientSequence, row.payload as Record<string, unknown>); prior.latest = event.clientSequence;
      if (validationError) rejected.push({ eventId: String(event.eventId), reason: validationError });
      else acknowledgments.push({ eventId: event.eventId, serverReceiptTimestamp: inserted.server_receipt_timestamp });
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
