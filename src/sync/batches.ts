import type {LearningEvent} from "../domain/types";
export function submissionBatches(events:LearningEvent[],courseId:string) {
 const bytes=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)).length;
 const result:LearningEvent[][]=[];let batch:LearningEvent[]=[];
 const ordered=[...events].sort((a,b)=>a.attemptId.localeCompare(b.attemptId)||a.clientSequence-b.clientSequence);
 for(const event of ordered){
  if(bytes(event)>16384)throw new Error("Oversized local event; preserved for support review");
  if(batch.length>=100||bytes({courseId,events:[...batch,event]})>512000){result.push(batch);batch=[];}
  batch.push(event);
 }
 if(batch.length)result.push(batch);return result;
}
