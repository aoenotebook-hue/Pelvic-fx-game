import {pelvicTraumaContentV3 as content} from "../content/content.v3";
import type {LearningEvent} from "../domain/types";
export function learningJourney(correct:boolean) {
 const events:LearningEvent[]=[];
 const add=(fields:Record<string,unknown>)=>{const event={eventId:`e-${events.length+1}`,attemptId:"attempt",learnerId:"learner",contentVersion:content.id,clientSequence:events.length+1,clientTimestamp:"2026-10-03T00:00:00Z",serverReceiptTimestamp:null,...fields} as LearningEvent;events.push(event);return event;};
 for(const node of content.nodes){
  if(node.explanationBeforeChoices)add({type:"handover_prepared",nodeId:node.id,text:"Findings, priorities and uncertainty."});
  add({type:"core_response",nodeId:node.id,selectedOptionIds:[correct?node.correctOptionIds[0]:node.options.find(option=>!node.correctOptionIds.includes(option.id))!.id],presentationOrder:node.options.map(option=>option.id),...(node.rationaleRequired?{rationale:"Findings, priorities and uncertainty."}:{})});
  add({type:"feedback_ack",nodeId:node.id});
  if(!correct){const response=add({type:"correction_response",correctionId:node.retryId,selectedOptionId:content.corrections.find(item=>item.id===node.retryId)!.correctOptionId,feedbackAcknowledged:false});add({type:"correction_feedback_ack",correctionId:node.retryId,responseEventId:response.eventId});}
 }
 add({type:"reflection_submitted",text:"Handovers reviewed; shift finished."});return events;
}
