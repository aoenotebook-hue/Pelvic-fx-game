import { describe, expect, it, vi } from "vitest";
import { recoverKnownCompletion } from "./completionRecovery";
import type { LearningEvent } from "../domain/types";
import type { BackendAdapter } from "./adapter";

const event = (receipt: string | null, attemptId = "attempt") => ({
  attemptId, serverReceiptTimestamp: receipt,
} as LearningEvent);
const adapter = () => ({ mode: "connected", syncEvents: vi.fn(), recoverCompletion: vi.fn() } satisfies BackendAdapter);

describe("empty-queue completion recovery", () => {
  it("does not request a receipt for a new local attempt", async () => {
    const backend = adapter();
    for (const events of [[], [event(null)], [event("received", "other")]]) {
      expect(await recoverKnownCompletion(backend, "attempt", events)).toEqual({ checked: false, receipt: undefined });
    }
    expect(backend.recoverCompletion).not.toHaveBeenCalled();
  });
  it("recovers a missing receipt for a known completed attempt without pending events", async () => {
    const backend = adapter();
    const receipt = { status: "server_confirmed", completedAt: "2026-10-08T00:00:00Z", reportingAttemptId: "attempt" };
    backend.recoverCompletion.mockResolvedValue(receipt);
    expect(await recoverKnownCompletion(backend, "attempt", [event("received")])).toEqual({ checked: true, receipt });
    expect(backend.recoverCompletion).toHaveBeenCalledWith("attempt");
  });
  it("checks known incomplete attempts without claiming completion", async () => {
    const backend = adapter();
    expect(await recoverKnownCompletion(backend, "attempt", [event("received")])).toEqual({ checked: true, receipt: undefined });
  });
  it("does not suppress denial or transport failures for a known attempt", async () => {
    const backend = adapter();
    backend.recoverCompletion.mockRejectedValue(new Error("Attempt unavailable"));
    await expect(recoverKnownCompletion(backend, "attempt", [event("received")])).rejects.toThrow("Attempt unavailable");
  });
});
