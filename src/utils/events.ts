import { appConfig } from "../config";
import type { BaseEvent, LearningEvent } from "../domain/types";

let activeLearnerId: string = appConfig.demoUserId;
export function setActiveLearnerId(learnerId: string) { activeLearnerId = learnerId; }
let activeVersion = "ptd-caseflow-draft-2026-10-02";
export function setActiveContentVersion(version: string) { activeVersion = version; }

export function createBaseEvent(attemptId: string, sequence: number): BaseEvent {
  return {
    eventId: crypto.randomUUID(), attemptId, learnerId: activeLearnerId,
    contentVersion: activeVersion, clientSequence: sequence,
    clientTimestamp: new Date().toISOString(), serverReceiptTimestamp: null
  };
}

export function latestSequence(events: LearningEvent[]) {
  return events.reduce((max, event) => Math.max(max, event.clientSequence), 0);
}
