import {createClient,type SupabaseClient} from "npm:@supabase/supabase-js@2";
import {buildSheetRows,demoExamples,type SheetAttempt,type SheetLearner} from "../../../src/reporting/sheets.ts";
import {GoogleWorkbook,googleAccessToken} from "./google.ts";
async function allRows(client:SupabaseClient,table:string,columns:string,key:string,ids:string[]){const result:Record<string,any>[]=[];if(!ids.length)return result;for(let offset=0;;offset+=500){const page=await client.from(table).select(columns).in(key,ids).order(table==="response_events"?"id":table==="attempt_summaries"?"attempt_id":table==="learner_profiles"?"user_id":"id").range(offset,offset+499);if(page.error)throw new Error(`Export data unavailable: ${table}`);result.push(...page.data as unknown as Record<string,any>[]);if(page.data.length<500)break;}return result;}
export default {async fetch(request:Request){
 const secret=Deno.env.get("SHEETS_WORKER_SECRET");if(request.method!=="POST"||!secret||request.headers.get("Authorization")!==`Bearer ${secret}`)return Response.json({error:"Worker authorization required"},{status:401});
 const options=await request.json().catch(()=>({}));
 if(!options||typeof options!=="object"||Array.isArray(options))return Response.json({error:"Invalid request"},{status:400});
 if(options.operation==="verify"){
  try{const id=Deno.env.get("GOOGLE_SHEET_ID");if(!id)throw new Error("Google workbook is not configured");return Response.json(await new GoogleWorkbook(id,await googleAccessToken()).audit());}
  catch(error){return Response.json({error:error instanceof Error?error.message:"Workbook verification failed"},{status:502});}
 }
 const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
 const claimed=await admin.rpc("claim_sheet_jobs");if(claimed.error)return Response.json({error:"Queue unavailable"},{status:503});
 const results=[];
 for(const job of claimed.data??[]){try{
   if(job.course_id!==Deno.env.get("LEARNER_COURSE_ID"))throw new Error("No workbook configured for this course");
   const workbookId=Deno.env.get("GOOGLE_SHEET_ID");if(!workbookId)throw new Error("Google workbook is not configured");
   const workbook=new GoogleWorkbook(workbookId,await googleAccessToken());await workbook.ensureTabs();
   const cohorts=await admin.from("cohorts").select("id").eq("course_id",job.course_id);if(cohorts.error)throw new Error("Cohorts unavailable");const ids=cohorts.data.map(c=>c.id);
   const members=await allRows(admin,"memberships","user_id,learner_id,cohort_id,created_at","cohort_id",ids),profiles=await allRows(admin,"learner_profiles","user_id,email,identity_status","cohort_id",ids);
   const legacyIdentities=new Map<string,{email:string;status:string}>();
   for(const userId of new Set(members.filter(m=>!profiles.some(p=>p.user_id===m.user_id)).map(m=>m.user_id as string))){const auth=await admin.auth.admin.getUserById(userId);if(auth.error)throw new Error("Existing cohort identity unavailable");legacyIdentities.set(userId,{email:auth.data.user.email??"",status:auth.data.user.email_confirmed_at?"verified_account":"invited_unconfirmed"});}
   const learners:SheetLearner[]=members.map(m=>{const profile=profiles.find(p=>p.user_id===m.user_id),legacy=legacyIdentities.get(m.user_id);return {userId:m.user_id,studentId:m.learner_id,email:profile?.email??legacy?.email??"",identityStatus:profile?.identity_status??legacy?.status??"unknown",cohortId:m.cohort_id,registeredAt:m.created_at};});
   const raw=await allRows(admin,"attempts","id,user_id,cohort_id,content_version,reporting_status,kind,original_attempt_id,created_at","cohort_id",ids);
   const events=await allRows(admin,"response_events","attempt_id,payload,server_receipt_timestamp","attempt_id",raw.map(a=>a.id)),summaries=await allRows(admin,"attempt_summaries","attempt_id,completed_at","attempt_id",raw.map(a=>a.id));
   const attempts:SheetAttempt[]=raw.map(a=>({attemptId:a.id,userId:a.user_id,learnerId:members.find(m=>m.user_id===a.user_id&&m.cohort_id===a.cohort_id)?.learner_id??"",cohortId:a.cohort_id,contentVersion:a.content_version,reportingStatus:a.reporting_status,kind:a.kind,originalAttemptId:a.original_attempt_id,createdAt:a.created_at,completedAt:summaries.find(s=>s.attempt_id===a.id)?.completed_at??null,events:events.filter(e=>e.attempt_id===a.id).map(e=>({...e.payload,serverReceiptTimestamp:e.server_receipt_timestamp})).sort((a,b)=>a.clientSequence-b.clientSequence)}));
   const reviews=await allRows(admin,"teaching_observations","payload","cohort_id",ids),rows=buildSheetRows(learners,attempts,reviews.map(r=>r.payload),Deno.env.get("GAME_APP_URL")??"https://pelvic-fx-game-aoe5.vercel.app");
   for(const [tab,data] of Object.entries(rows))await workbook.upsert(tab,data);
   await workbook.upsert("Demo Examples",demoExamples());await workbook.overview();
   const deliveredAt=new Date().toISOString();await workbook.upsert("Sync Status & Guide",[["Record ID","Item","Value"],["ptd:status:success","Last successful delivery UTC",deliveredAt],["ptd:status:version","Delivered queue revision",job.revision],["ptd:guide:dates","Dates","Asia/Bangkok; YYYY-MM-DD"],["ptd:guide:ids","Student IDs","Text including leading zeros"],["ptd:guide:observations","Teacher observations","Recorded in protected teacher area; mirrored here"],["ptd:guide:correction","Corrections","Corrected means correction explanation explicitly reviewed"],["ptd:guide:missing","Missing evidence","Not observed; distinct from an incorrect answer"],["ptd:guide:status","Live pending/errors","Open teacher area for current queue status; this sheet reflects the last successful delivery."]]);
   const updated=await admin.from("sheets_export_queue").update({delivered_revision:job.revision,last_success:deliveredAt,last_error:null,failures:0,lease_until:null,lease_token:null}).eq("course_id",job.course_id).eq("lease_token",job.lease_token);if(updated.error)throw new Error("Queue acknowledgment failed");results.push({courseId:job.course_id,delivered:true});
  }catch(error){const message=error instanceof Error?error.message:"Delivery failed";await admin.from("sheets_export_queue").update({last_error:message,failures:job.failures+1,next_try:new Date(Date.now()+Math.min(3600000,60000*2**Math.min(job.failures,6))).toISOString(),lease_until:null,lease_token:null}).eq("course_id",job.course_id).eq("lease_token",job.lease_token);results.push({courseId:job.course_id,delivered:false,error:message});}
 }
 return Response.json({results});
}};
