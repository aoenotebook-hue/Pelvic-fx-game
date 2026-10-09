// Student entry with a student ID and a self-chosen 4-digit code (no e-mail, no password reset by e-mail).
//   create: first visit — claims the student ID and stores a salted hash of the code.
//   enter:  later visits — checks the code; 5 wrong codes lock the ID for 15 minutes.
// A teacher can clear a forgotten code (faculty-workspace "reset_code"); the student then chooses a new one.
import {createClient} from "npm:@supabase/supabase-js@2";
import {withCors} from "../_shared/http.ts";
import {afterFailure,hashCode,learnerRolesOnly,normalizedStudentEntry,verifyCode,CODE_MAX_FAILURES} from "../../../src/domain/learnerIdentity.ts";

const reply=(status:number,body:Record<string,unknown>)=>Response.json(body,{status});
const fail=(status=400,extra:Record<string,unknown>={})=>reply(status,{error:"Could not enter. Check your student ID and code, or ask your teacher.",...extra});
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,"0")).join("");

export default {fetch:withCors(async(request:Request)=>{
 if(request.method!=="POST")return fail(405);
 const raw=await request.text();if(raw.length>1500)return fail(413);
 let body;try{body=JSON.parse(raw);}catch{return fail();}
 if(!body||typeof body!=="object"||Array.isArray(body))return fail();
 const entry=normalizedStudentEntry(body.studentId,body.code),create=body.create===true;
 const course=Deno.env.get("LEARNER_COURSE_ID"),cohort=Deno.env.get("LEARNER_COHORT_ID");
 if(!course||!cohort)return fail(503);if(!entry||body.courseId!==course)return fail();
 const url=Deno.env.get("SUPABASE_URL")!,admin=createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
 // The forwarded address is supplied by the gateway; no request body can select a bucket.
 const ip=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()??"unknown";
 const checks=await Promise.all([admin.rpc("allow_learner_entry",{bucket_key:"ip:"+await digest(ip),maximum:300}),admin.rpc("allow_learner_entry",{bucket_key:"student:"+await digest(course+entry.studentId),maximum:8})]);
 if(checks.some(result=>result.error||result.data!==true))return fail(429);
 const {data:validCohort,error:cohortError}=await admin.from("cohorts").select("id").eq("id",cohort).eq("course_id",course).maybeSingle();if(cohortError||!validCohort)return fail(503);

 let {data:profile,error:profileError}=await admin.from("learner_profiles").select("user_id,student_id,pin_hash,pin_failures,pin_locked_until").eq("course_id",course).eq("student_id",entry.studentId).maybeSingle();
 if(profileError)return fail(503);
 if(profile?.pin_locked_until&&Date.parse(profile.pin_locked_until)>Date.now())return fail(423,{lockedUntil:profile.pin_locked_until});
 if(!profile||!profile.pin_hash){
  // No code yet (new student, or a teacher cleared it): the client must confirm a new code first.
  if(!create)return reply(404,{error:"First visit: choose a 4-digit code.",needsSetup:true});
  const pinHash=await hashCode(entry.code),now=new Date().toISOString();
  if(profile){
   const updated=await admin.from("learner_profiles").update({pin_hash:pinHash,pin_failures:0,pin_locked_until:null,pin_set_at:now}).eq("user_id",profile.user_id).is("pin_hash",null).select("user_id").maybeSingle();
   if(updated.error||!updated.data)return fail(409);
  }else{
   const {data:conflict,error}=await admin.from("memberships").select("id").eq("cohort_id",cohort).eq("learner_id",entry.studentId).maybeSingle();if(error||conflict)return fail(409);
   // Never use real contact details as the Auth principal.
   const synthetic=`learner-${crypto.randomUUID()}@learner.pelvic-trauma.invalid`;
   const created=await admin.auth.admin.createUser({email:synthetic,email_confirm:true,app_metadata:{identity_kind:"self_reported_learner"}});if(created.error||!created.data.user)return fail(503);
   const inserted=await admin.from("learner_profiles").insert({user_id:created.data.user.id,course_id:course,cohort_id:cohort,student_id:entry.studentId,pin_hash:pinHash,pin_set_at:now}).select("user_id,student_id,pin_hash,pin_failures,pin_locked_until").single();
   if(inserted.error){await admin.auth.admin.deleteUser(created.data.user.id);return fail(409);}
   profile=inserted.data;
  }
 }else{
  if(create)return fail(409,{alreadyRegistered:true});
  if(!await verifyCode(entry.code,profile.pin_hash)){
   const next=afterFailure(profile.pin_failures??0);
   await admin.from("learner_profiles").update({pin_failures:next.failures,pin_locked_until:next.lockedUntil}).eq("user_id",profile.user_id);
   return next.lockedUntil?fail(423,{lockedUntil:next.lockedUntil}):fail(401,{remaining:CODE_MAX_FAILURES-next.failures});
  }
  if(profile.pin_failures)await admin.from("learner_profiles").update({pin_failures:0,pin_locked_until:null}).eq("user_id",profile.user_id);
 }

 const {data:roles,error:roleError}=await admin.from("role_assignments").select("role").eq("user_id",profile.user_id);
 if(roleError||!learnerRolesOnly(roles??[]))return fail(403);
 const user=await admin.auth.admin.getUserById(profile.user_id);
 if(user.error||user.data.user.app_metadata?.identity_kind!=="self_reported_learner")return fail(403);
 const membership=await admin.from("memberships").upsert({user_id:profile.user_id,cohort_id:cohort,learner_id:entry.studentId},{onConflict:"cohort_id,user_id"});if(membership.error)return fail(409);
 const link=await admin.auth.admin.generateLink({type:"magiclink",email:user.data.user.email!});if(link.error||!link.data.properties?.hashed_token)return fail(503);
 const auth=createClient(url,Deno.env.get("SUPABASE_ANON_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
 const verified=await auth.auth.verifyOtp({token_hash:link.data.properties.hashed_token,type:"email"});
 if(verified.error||verified.data.user?.id!==profile.user_id||!verified.data.session)return fail(503);
 return reply(200,{session:{access_token:verified.data.session.access_token,refresh_token:verified.data.session.refresh_token}});
})};
