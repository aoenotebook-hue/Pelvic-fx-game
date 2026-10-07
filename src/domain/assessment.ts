import type { ContentVersion, LearningEvent } from "./types";
import { evaluate,starsFor } from "../games/evaluate";
import { deriveProgress } from "./engine";
export const rubricDimensions = ["clinical_interpretation","priorities_supervised_action","uncertainty_request"] as const;
export const rubricStates = ["not_observed","needs_discussion","with_prompting","without_prompting"] as const;
export type TeacherObservation = { id:string; attemptId:string; contentVersion:string; reviewerId:string; reviewedAt:string; scope:"case"|"concept"; scopeId:string; rubric:Record<typeof rubricDimensions[number],typeof rubricStates[number]>; observation:string; feedback:string; nextStep:string };
export interface EvidenceAttempt { attemptId:string; learnerId:string; cohortId:string; contentVersion:string; reportingStatus:string; events:LearningEvent[]; completedAt:string|null; }
export interface RosterMember {learnerId:string;cohortId:string;}
export function learningEvidence(content:ContentVersion,events:LearningEvent[]) {
  const progress=deriveProgress(content,events);
  return content.nodes.map(node=> {
    const response=events.filter(event=>event.contentVersion===content.id).find(event=>event.type==="core_response"&&event.nodeId===node.id) as Extract<LearningEvent,{type:"core_response"}>|undefined;
    return {node,response,state:!response?"missing":progress.firstCorrectNodeIds.includes(node.id)?"first_correct":progress.correctedNodeIds.includes(node.id)?"corrected":"unresolved", corrections:events.filter(event=>event.type==="correction_response"&&event.correctionId===node.retryId),references:events.filter(event=>event.type==="resource_viewed"&&event.nodeId===node.id)};
  });
}
export function objectiveCounts(content:ContentVersion,attempts:EvidenceAttempt[],enrolled:number) {
  return [...new Set(content.nodes.flatMap(node=>node.objectiveIds??node.outcomeIds))].map(id=> {
    const nodes=content.nodes.filter(node=>[...(node.objectiveIds??node.outcomeIds)].includes(id));
    const entries=attempts.filter(attempt=>attempt.contentVersion===content.id).flatMap(attempt=>learningEvidence(content,attempt.events).filter(entry=>nodes.some(node=>node.id===entry.node.id)));
    return {id,expected:enrolled*nodes.length,observed:entries.filter(entry=>entry.state!=="missing").length,firstCorrect:entries.filter(entry=>entry.state==="first_correct").length,corrected:entries.filter(entry=>entry.state==="corrected").length,unresolved:entries.filter(entry=>entry.state==="unresolved").length};
  });
}
export function miniGameEvidence(content:ContentVersion,events:LearningEvent[]){
 const entries=learningEvidence(content,events);
 return {objectives:objectiveCounts(content,[{attemptId:events[0]?.attemptId??"",learnerId:"",cohortId:"",contentVersion:content.id,reportingStatus:"reporting",events,completedAt:null}],1),mistakes:Object.fromEntries(entries.filter(e=>e.node.game&&e.response).map(e=>[e.node.id,evaluate(e.node.game!,e.response!.gameAnswer).mistakes])),stars:Object.fromEntries(entries.filter(e=>e.node.game&&e.response).map(e=>[e.node.id,starsFor(evaluate(e.node.game!,e.response!.gameAnswer).score)]))};
}
export function retrievalEvidence(content:ContentVersion,events:LearningEvent[]){
 const progress=deriveProgress(content,events),ids=content.nodes.filter(node=>node.stage==="gauntlet").map(node=>node.id);
 const observed=ids.filter(id=>progress.answeredNodeIds.includes(id)).length;
 return {expected:ids.length,observed,firstScore:ids.length&&observed===ids.length?ids.filter(id=>progress.firstCorrectNodeIds.includes(id)).length:null,resolvedScore:observed?ids.filter(id=>progress.clearedNodeIds.includes(id)).length:null};
}
export function csvText(rows:unknown[][]) {
  const cell=(value:unknown)=> { const raw=String(value??""); return '"'+(/^[=+\-@\t\r]/.test(raw)?"'"+raw:raw).replaceAll('"','""')+'"'; };
  return "\ufeff"+rows.map(row=>row.map(cell).join(",")).join("\r\n");
}
