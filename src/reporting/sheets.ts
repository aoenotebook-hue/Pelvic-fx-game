import {getContent,latestContent} from "../content/registry.ts";
import {deriveProgress} from "../domain/engine.ts";
import {computeRewards} from "../domain/rewards.ts";
import {learningEvidence,type EvidenceAttempt,type TeacherObservation} from "../domain/assessment.ts";
import {bangkokDay} from "../domain/reportFilters.ts";
import {correctionReviewed} from "../domain/learningRules.ts";
import {evaluate,outcomeId} from "../games/evaluate.ts";
import type {LearningEvent} from "../domain/types.ts";

export const managedTabs=["Class Overview","Learner Results","Decision Evidence","Handovers","Teacher Reviews","Objective Analysis","Demo Examples","Sync Status & Guide"] as const;
export type SheetRow=(string|number|boolean)[];
export interface SheetLearner {userId:string;studentId:string;email:string;identityStatus:string;cohortId:string;registeredAt:string;}
export interface SheetAttempt extends EvidenceAttempt {userId:string;kind:string;createdAt:string;originalAttemptId?:string|null;}
const day=(value:string|null|undefined)=>value?bangkokDay(value):"";
export function safeSheetCell(value:unknown){const text=String(value??"");return /^[=+\-@\t\r]/.test(text)?"'"+text:text;}
export function buildSheetRows(learners:SheetLearner[],attempts:SheetAttempt[],reviews:TeacherObservation[],appUrl:string){
 const results:SheetRow[]=[["Record ID","Student ID (text)","Email","Identity","Cohort","Content version","Attempt type","Registered Bangkok date","Started Bangkok date","Last received Bangkok date","Completed Bangkok date","Submission","First correct","Answered","Corrected","Unresolved","Missing","Reward","Reward maximum","Reward scheme","Original attempt","Teacher review link"]];
 const decisions:SheetRow[]=[["Record ID","Student ID","Attempt","Cohort","Version","Bangkok date","Decision","Objectives","Safety concepts","Evidence state","First answer","Correction answers","Feedback reviewed","Confidence (optional)","Reference use","Expected teaching point","Misconception","Discussion prompt","Reporting status","Question"]];
 const handovers:SheetRow[]=[["Record ID","Student ID","Attempt","Cohort","Version","Bangkok date","Patient case","Authored reason","Expected teaching points","Teacher review link"]];
 const observationRows:SheetRow[]=[["Record ID","Student ID","Attempt","Cohort","Version","Reviewed Bangkok date","Scope","Clinical interpretation","Supervised priorities","Uncertainty/request","Observation","Advice","Next step","Reviewer","Teacher review link"]];
 const objectives:SheetRow[]=[["Record ID","Student ID","Attempt","Cohort","Version","Bangkok date","Objective","Expected","Observed","First correct","Corrected","Unresolved","Missing","First correct / observed","Attempt type"]];
 for(const learner of learners){
  const own=attempts.filter(a=>a.userId===learner.userId&&a.cohortId===learner.cohortId);
  if(!own.length){results.push([`ptd:registered:${learner.userId}`,learner.studentId,learner.email,learner.identityStatus,learner.cohortId,latestContent.id,"not_started",day(learner.registeredAt),"","","","Registered; no received answers",0,0,0,0,latestContent.nodes.length,0,250,"", "",`${appUrl}/#teacher`]);for(const id of [...new Set(latestContent.nodes.flatMap(n=>n.objectiveIds??n.outcomeIds))]){const expected=latestContent.nodes.filter(n=>(n.objectiveIds??n.outcomeIds).some(objective=>objective===id)).length;objectives.push([`ptd:objective:registered:${learner.userId}:${id}`,learner.studentId,"",learner.cohortId,latestContent.id,day(learner.registeredAt),id,expected,0,0,0,0,expected,"","not_started"]);}}
  for(const attempt of own){
   const content=getContent(attempt.contentVersion),p=deriveProgress(content,attempt.events),reward=computeRewards(content,attempt.events),entries=learningEvidence(content,attempt.events);
   const last=attempt.events.at(-1)?.serverReceiptTimestamp??attempt.createdAt,link=`${appUrl}/#teacher?attempt=${encodeURIComponent(attempt.attemptId)}`;
   results.push([`ptd:attempt:${attempt.attemptId}`,learner.studentId,learner.email,learner.identityStatus,learner.cohortId,content.id,attempt.kind,day(learner.registeredAt),day(attempt.createdAt),day(last),day(attempt.completedAt),attempt.reportingStatus+ (attempt.completedAt?"; complete":"; incomplete"),p.firstCorrectNodeIds.length,p.answeredNodeIds.length,p.correctedNodeIds.length,entries.filter(e=>e.state==="unresolved").length,entries.filter(e=>e.state==="missing").length,reward.total,reward.maximum,reward.scheme,attempt.originalAttemptId??"",link]);
   for(const entry of entries){const {node,response,corrections,references}=entry;
    const first=response?.gameAnswer??response?.selectedOptionIds??null;
    const feedback=response&&attempt.events.some(e=>e.type==="feedback_ack"&&e.nodeId===node.id)&&(entry.state==="first_correct"||entry.state==="corrected");
    const answerLabel=(answer:unknown)=>{const ids=Array.isArray(answer)?answer:[answer];const labels=ids.map(id=>node.game?.cards.find(card=>card.id===id)?.label.en??node.options.find(option=>option.id===id)?.text).filter(Boolean);return labels.length?labels.join("; "):JSON.stringify(answer);};
    decisions.push([`ptd:decision:${attempt.attemptId}:${node.id}`,learner.studentId,attempt.attemptId,learner.cohortId,content.id,day(response?.serverReceiptTimestamp??last),node.id,(node.objectiveIds??node.outcomeIds).join(";"),node.conceptIds.join(";"),entry.state,first===null?"Missing evidence":answerLabel(first),corrections.map(e=>e.type==="correction_response"?`${answerLabel(e.gameAnswer??e.selectedOptionId)} (${correctionReviewed(attempt.events,e)?"reviewed":"review pending"})`:"").join("; "),Boolean(feedback),response?.confidence??"Not provided",references.map(e=>e.type==="resource_viewed"?`${e.resourceId}:${e.stage??""}`:"").join(";"),node.translation?.key.en??node.teaching?.keyMessage??"",node.teaching?.misconception??"",node.teaching?.discussionPrompt??"",attempt.reportingStatus,node.translation?.title.en??node.question]);
   }
   for(const node of content.nodes.filter(n=>n.rationaleRequired)){const response=entries.find(e=>e.node.id===node.id)?.response;handovers.push([`ptd:handover:${attempt.attemptId}:${node.id}`,learner.studentId,attempt.attemptId,learner.cohortId,content.id,day(response?.serverReceiptTimestamp),node.missionId,response?.rationale??"Not observed",node.translation?.key.en??node.teaching?.keyMessage??"",link]);}
   for(const objective of [...new Set(content.nodes.flatMap(n=>n.objectiveIds??n.outcomeIds))]){const matching=entries.filter(e=>(e.node.objectiveIds??e.node.outcomeIds).some(id=>id===objective)),observed=matching.filter(e=>e.state!=="missing").length,first=matching.filter(e=>e.state==="first_correct").length;objectives.push([`ptd:objective:${attempt.attemptId}:${objective}`,learner.studentId,attempt.attemptId,learner.cohortId,content.id,day(last),objective,matching.length,observed,first,matching.filter(e=>e.state==="corrected").length,matching.filter(e=>e.state==="unresolved").length,matching.length-observed,observed?first/observed:"",attempt.reportingStatus]);}
  }
 }
 for(const review of reviews){const attempt=attempts.find(a=>a.attemptId===review.attemptId);if(!attempt)continue;const learner=learners.find(l=>l.userId===attempt.userId&&l.cohortId===attempt.cohortId);observationRows.push([`ptd:review:${review.id}`,learner?.studentId??"",attempt.attemptId,attempt.cohortId,review.contentVersion,day(review.reviewedAt),`${review.scope}:${review.scopeId}`,review.rubric.clinical_interpretation,review.rubric.priorities_supervised_action,review.rubric.uncertainty_request,review.observation,review.feedback,review.nextStep,review.reviewerId,`${appUrl}/#teacher?attempt=${encodeURIComponent(attempt.attemptId)}`]);}
 return {"Learner Results":results,"Decision Evidence":decisions,"Handovers":handovers,"Teacher Reviews":observationRows,"Objective Analysis":objectives};
}

/** Fictional examples are evaluated with exactly the game rules, never inserted into cohort evidence. */
export function demoExamples(){
 const content=latestContent;
 const examples:SheetRow[]=[["Record ID","Label","Fictional ID","Scenario","First correct","Answered","Corrected","Unresolved","Missing","Reward","Complete","Interpretation"]];
 for(const scenario of ["registered_not_started","incomplete","unresolved","all_first_correct","all_corrected","mixed_corrected"]){
  const events:LearningEvent[]=[];const push=(data:Record<string,unknown>)=>{const event={eventId:`DEMO-${scenario}-${events.length}`,attemptId:`DEMO-${scenario}`,learnerId:"DEMO",contentVersion:content.id,clientSequence:events.length+1,clientTimestamp:"2026-10-08T00:00:00Z",serverReceiptTimestamp:"2026-10-08T00:00:01Z",...data} as LearningEvent;events.push(event);return event;};
  const limit=scenario==="registered_not_started"?0:scenario==="incomplete"?3:scenario==="unresolved"?1:15;
  const sequence=content.missions.flatMap(mission=>mission.nodeIds.map(id=>content.nodes.find(node=>node.id===id)!));
  for(const [index,node] of sequence.slice(0,limit).entries()){
   const correct=node.game!.targets![0],wrong=scenario==="all_corrected"||scenario==="unresolved"||scenario==="mixed_corrected"&&index%3===0,answer=wrong?node.game!.cards.find(card=>card.id!==correct)!.id:correct;
   if(node.rationaleRequired)push({type:"handover_prepared",nodeId:node.id,text:"DEMO: discuss findings and request senior reassessment."});
   push({type:"core_response",nodeId:node.id,selectedOptionIds:[outcomeId(node.id,node.game!,answer)],presentationOrder:[],gameAnswer:answer,gameScore:evaluate(node.game!,answer).score,...(node.rationaleRequired?{rationale:"DEMO: discuss findings and request senior reassessment."}:{})});push({type:"feedback_ack",nodeId:node.id});
   if(wrong&&scenario!=="unresolved"){const correction=push({type:"correction_response",correctionId:node.retryId,selectedOptionId:outcomeId(node.retryId,node.game!,correct),gameAnswer:correct,gameScore:1,feedbackAcknowledged:false});push({type:"correction_feedback_ack",correctionId:node.retryId,responseEventId:correction.eventId});}
  }
  if(limit===15)push({type:"reflection_submitted",text:"DEMO: three handovers reviewed."});
  const p=deriveProgress(content,events),reward=computeRewards(content,events),evidence=learningEvidence(content,events);
  examples.push([`ptd:demo:${scenario}`,"DEMO",`DEMO-${String(examples.length).padStart(3,"0")}`,scenario,p.firstCorrectNodeIds.length,p.answeredNodeIds.length,p.correctedNodeIds.length,evidence.filter(e=>e.state==="unresolved").length,evidence.filter(e=>e.state==="missing").length,reward.total,p.locallyComplete,"Fictional learning evidence; excluded from real class totals. Discuss reasoning in class; rewards do not establish competence."]);
 }
 return examples;
}
