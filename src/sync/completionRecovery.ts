import type { LearningEvent } from "../domain/types";
import type { BackendAdapter, SyncResult } from "./adapter";

// A locally allocated attempt is not a server attempt until an event is accepted.
// Do not turn a genuine authorization/transport failure into a successful check.
export async function recoverKnownCompletion(
  backend: BackendAdapter,
  attemptId: string,
  events: LearningEvent[],
): Promise<{ checked: boolean; receipt: SyncResult["completionReceipt"] }> {
  const known = events.some(event => event.attemptId === attemptId && Boolean(event.serverReceiptTimestamp));
  if (!known || !backend.recoverCompletion) return { checked: false, receipt: undefined };
  return { checked: true, receipt: await backend.recoverCompletion(attemptId) };
}
