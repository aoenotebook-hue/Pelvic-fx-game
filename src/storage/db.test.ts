import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { appendEventAtomically, pendingEvents, storeSubmissionRejections } from "./db";
import type { LearningEvent } from "../domain/types";

const base = (attemptId: string) => ({
  eventId: crypto.randomUUID(), attemptId, learnerId: "L1", contentVersion: "v", clientSequence: 1,
  clientTimestamp: new Date().toISOString(), serverReceiptTimestamp: null
});
const view = (attemptId: string, resourceId: string) => ({ ...base(attemptId), type: "resource_viewed", resourceId }) as unknown as LearningEvent;

describe("local outbox", () => {
  it("stops re-sending a rejected event while later events stay queued", async () => {
    const attempt = crypto.randomUUID();
    const saved = [];
    for (const id of ["R1", "R2", "R3"]) saved.push(await appendEventAtomically("acct-a", view(attempt, id)));
    expect(saved.map((event) => event.clientSequence)).toEqual([1, 2, 3]);
    await storeSubmissionRejections("acct-a", [{ eventId: saved[1].eventId, reason: "test" }]);
    const pending = await pendingEvents("acct-a");
    expect(pending.map((event) => event.eventId)).toEqual([saved[0].eventId, saved[2].eventId]);
  });

  it("assigns unique sequence numbers even when two events are saved at once", async () => {
    const attempt = crypto.randomUUID();
    const results = await Promise.all([appendEventAtomically("acct-b", view(attempt, "R1")), appendEventAtomically("acct-b", view(attempt, "R2"))]);
    expect(new Set(results.map((event) => event.clientSequence)).size).toBe(2);
  });

  it("does not let one account mark another account's event as rejected", async () => {
    const event = await appendEventAtomically("acct-c", view(crypto.randomUUID(), "R1"));
    await storeSubmissionRejections("acct-other", [{ eventId: event.eventId, reason: "test" }]);
    expect((await pendingEvents("acct-c")).map((item) => item.eventId)).toContain(event.eventId);
  });
});
