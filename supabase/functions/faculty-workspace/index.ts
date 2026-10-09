import { withCors, hasTwoStepVerification } from "../_shared/http.ts";
import {withSupabase} from "npm:@supabase/server@1.9.1";
import {assignedFaculty} from "../../../src/domain/authorization.ts";
const fail=(message:string,status=400)=>Response.json({error:message},{status});
export default {fetch: withCors(withSupabase({auth:"user"},async(request,ctx)=>{
 if(request.method!=="POST")return fail("Method not allowed",405);
 const raw=await request.text();if(new TextEncoder().encode(raw).length>12000)return fail("Request too large",413);
 let body;try{body=JSON.parse(raw);}catch{return fail("Invalid JSON");}
 const userId=ctx.userClaims?.id;if(!userId||!body.courseId)return fail("Authentication and course required",401);
 const {data:roles,error:roleError}=await ctx.supabaseAdmin.from("role_assignments").select("role,cohort_id").eq("user_id",userId);
 const {data:cohorts,error:cohortError}=await ctx.supabaseAdmin.from("cohorts").select("id").eq("course_id",body.courseId);
 if(roleError||cohortError)return fail("Authorization lookup failed",500);
 const ids=(cohorts??[]).filter(cohort=>assignedFaculty(roles??[],cohort.id)).map(cohort=>cohort.id);
 if(!ids.length)return fail("Assigned faculty access required",403);
 // Teachers see identifiable learner evidence: the session must have passed two-step verification (TOTP).
 if(!hasTwoStepVerification(request))return body.operation==="context"?Response.json({authorized:false,mfaRequired:true}):fail("Two-step verification required",403);
 if(body.operation==="context")return Response.json({authorized:true});
 const {data:attempts,error:attemptError}=await ctx.supabaseAdmin.from("attempts").select("id,user_id,cohort_id,content_version,reporting_status,attempt_summaries(completed_at)").in("cohort_id",ids);
 if(attemptError)return fail("Attempts unavailable",500);
 if(body.operation==="review"){
  const draft=body.payload;const attempt=(attempts??[]).find(attempt=>attempt.id===draft?.attemptId);
  if(!attempt||draft.contentVersion!==attempt.content_version)return fail("Attempt access or version mismatch",403);
  const states=["not_observed","needs_discussion","with_prompting","without_prompting"],dimensions=["clinical_interpretation","priorities_supervised_action","uncertainty_request"];
  if(!["case","concept"].includes(draft.scope)||!(draft.scope==="case"?["mission-pre","mission-0","mission-1","mission-2","mission-3","mission-4"]:["S1","S2","S3","S4","S5","S6"]).includes(draft.scopeId)||!draft.rubric||!dimensions.every(key=>states.includes(draft.rubric[key]))||![draft.observation,draft.feedback,draft.nextStep].every(value=>typeof value==="string"&&value.length<=1500))return fail("Invalid observation");
  const review={attemptId:attempt.id,contentVersion:attempt.content_version,scope:draft.scope,scopeId:draft.scopeId,rubric:Object.fromEntries(dimensions.map(key=>[key,draft.rubric[key]])),observation:draft.observation,feedback:draft.feedback,nextStep:draft.nextStep,id:crypto.randomUUID(),reviewerId:userId,reviewedAt:new Date().toISOString()};
  const {error}=await ctx.supabaseAdmin.from("teaching_observations").insert({id:review.id,attempt_id:attempt.id,cohort_id:attempt.cohort_id,content_version:attempt.content_version,reviewer_id:userId,reviewed_at:review.reviewedAt,payload:review});
  return error?fail("Review not saved",500):Response.json({review});
 }
 if(!["summary","evidence"].includes(body.operation))return fail("Unknown operation");
 const {data:members,error:memberError}=await ctx.supabaseAdmin.from("memberships").select("user_id,learner_id,cohort_id").in("cohort_id",ids);
 if(memberError)return fail("Roster unavailable",500);
 const visible=body.operation==="evidence"?(attempts??[]).filter(attempt=>attempt.id===body.payload?.attemptId):(attempts??[]);
 if(body.operation==="evidence"&&!visible.length)return fail("Attempt access denied",403);
 // One paged query for all visible attempts (not one query per attempt); rejected tombstones are not evidence.
 const byAttempt=new Map<string,unknown[]>();
 const visibleIds=visible.map(attempt=>attempt.id);
 for(let start=0;start<visibleIds.length;start+=200){
  const chunk=visibleIds.slice(start,start+200);
  for(let offset=0;;offset+=1000){const {data,error}=await ctx.supabaseAdmin.from("response_events").select("attempt_id,payload,server_receipt_timestamp").in("attempt_id",chunk).neq("event_type","rejected").order("attempt_id").order("client_sequence").range(offset,offset+999);if(error)return fail("Evidence unavailable",500);for(const row of data??[]){const list=byAttempt.get(row.attempt_id)??[];list.push({...row.payload,serverReceiptTimestamp:row.server_receipt_timestamp});byAttempt.set(row.attempt_id,list);}if((data??[]).length<1000)break;}
 }
 const evidence=[];
 for(const attempt of visible){
  const events=byAttempt.get(attempt.id)??[];
  const summary=Array.isArray(attempt.attempt_summaries)?attempt.attempt_summaries[0]:attempt.attempt_summaries;
  evidence.push({attemptId:attempt.id,learnerId:members?.find(member=>member.user_id===attempt.user_id&&member.cohort_id===attempt.cohort_id)?.learner_id??"restricted",cohortId:attempt.cohort_id,contentVersion:attempt.content_version,reportingStatus:attempt.reporting_status,events,completedAt:summary?.completed_at??null});
 }
 const {data:reviews,error:reviewError}=await ctx.supabaseAdmin.from("teaching_observations").select("payload").in("cohort_id",ids).order("reviewed_at");
 if(reviewError)return fail("Review history unavailable",500);
 return Response.json({roster:(members??[]).map(member=>({learnerId:member.learner_id,cohortId:member.cohort_id})),attempts:evidence,reviews:(reviews??[]).map(row=>row.payload)});
}))};
