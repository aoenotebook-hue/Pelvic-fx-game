import type { LearningEvent } from "./types.ts";
import { isGameVersion } from "../games/spec.ts";
export const LEARNING_VERSION = "ptd-learning-draft-2026-10-03";
export function correctionReviewed(events: LearningEvent[], response: Extract<LearningEvent,{type:"correction_response"}>) {
  if (response.contentVersion !== LEARNING_VERSION&&!isGameVersion(response.contentVersion)) return response.feedbackAcknowledged;
  return events.some(event => event.type === "correction_feedback_ack" && event.contentVersion === response.contentVersion && event.attemptId === response.attemptId && event.correctionId === response.correctionId && event.responseEventId === response.eventId && event.clientSequence > response.clientSequence);
}
export function handoverPrepared(events: LearningEvent[], response: Extract<LearningEvent,{type:"core_response"}>) {
  return events.some(event => event.type === "handover_prepared" && event.nodeId === response.nodeId && event.contentVersion === response.contentVersion && event.attemptId === response.attemptId && event.clientSequence < response.clientSequence && event.text.trim() === response.rationale?.trim());
}
export function validateLearningSequence(event:LearningEvent,previous:LearningEvent[]):string|null {
 if(event.contentVersion!==LEARNING_VERSION&&!isGameVersion(event.contentVersion))return null;
 const events=previous.filter(item=>item.contentVersion===event.contentVersion&&item.attemptId===event.attemptId);
 if(event.type==="core_response") {
  if(events.some(item=>item.type==="core_response"&&item.nodeId===event.nodeId))return "First response is immutable";
  if(["M1N6","M2N5","M3N4","C1S7","C3S7","FS7"].includes(event.nodeId)&&!handoverPrepared(events,event))return "Record handover reason before choosing";
 }
 if(event.type==="feedback_ack"&&!events.some(item=>item.type==="core_response"&&item.nodeId===event.nodeId))return "Answer before reviewing feedback";
 if(isGameVersion(event.contentVersion)&&event.type==="correction_response"&&!events.some(item=>item.type==="feedback_ack"&&item.nodeId===event.correctionId.replace(/_R$/,"")))return "Review station evidence before correction";
 if(event.type==="correction_feedback_ack"&&!events.some(item=>item.type==="correction_response"&&item.eventId===event.responseEventId&&item.correctionId===event.correctionId&&item.clientSequence<event.clientSequence))return "Correction response must precede review";
 return null;
}
