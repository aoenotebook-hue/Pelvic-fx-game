import {createClient} from "npm:@supabase/supabase-js@2";
import {normalizedLearnerIdentity,learnerRolesOnly} from "../../../src/domain/learnerIdentity.ts";
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
const fail=(status=400)=>Response.json({error:"Could not enter. Check your details or ask your teacher for help."},{status,headers});
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,"0")).join("");
export default {async fetch(request:Request){
 if(request.method==="OPTIONS")return new Response(null,{headers});if(request.method!=="POST")return fail(405);
 const raw=await request.text();if(raw.length>1500)return fail(413);
 let body;try{body=JSON.parse(raw);}catch{return fail();}
 if(!body||typeof body!=="object"||Array.isArray(body))return fail();
 const identity=normalizedLearnerIdentity(body.email,body.studentId);
 const course=Deno.env.get("LEARNER_COURSE_ID"),cohort=Deno.env.get("LEARNER_COHORT_ID");
 if(!course||!cohort)return fail(503);if(!identity||body.courseId!==course)return fail();
 const url=Deno.env.get("SUPABASE_URL")!,admin=createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
 // The forwarded address is supplied by the gateway; no request body can select a bucket.
 const ip=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()??"unknown";
 const checks=await Promise.all([admin.rpc("allow_learner_entry",{bucket_key:"ip:"+await digest(ip),maximum:300}),admin.rpc("allow_learner_entry",{bucket_key:"identity:"+await digest(course+identity.email),maximum:8})]);
 if(checks.some(result=>result.error||result.data!==true))return fail(429);
 const {data:validCohort,error:cohortError}=await admin.from("cohorts").select("id").eq("id",cohort).eq("course_id",course).maybeSingle();if(cohortError||!validCohort)return fail(503);
 let {data:profile,error:profileError}=await admin.from("learner_profiles").select("user_id,email,student_id").eq("course_id",course).eq("email",identity.email).maybeSingle();if(profileError)return fail(503);
 if(profile&&profile.student_id!==identity.studentId)return fail(409);
 if(!profile){
  const {data:conflict,error}=await admin.from("memberships").select("id").eq("cohort_id",cohort).eq("learner_id",identity.studentId).maybeSingle();if(error||conflict)return fail(409);
  // Never use the supplied email as the Auth principal: it may belong to a teacher.
  const synthetic=`learner-${crypto.randomUUID()}@learner.pelvic-trauma.invalid`;
  const created=await admin.auth.admin.createUser({email:synthetic,email_confirm:true,app_metadata:{identity_kind:"self_reported_learner"}});if(created.error||!created.data.user)return fail(503);
  const userId=created.data.user.id;
  const inserted=await admin.from("learner_profiles").insert({user_id:userId,course_id:course,cohort_id:cohort,email:identity.email,student_id:identity.studentId}).select("user_id,email,student_id").single();
  if(inserted.error){await admin.auth.admin.deleteUser(userId);return fail(409);}profile=inserted.data;
 }
 const {data:roles,error:roleError}=await admin.from("role_assignments").select("role").eq("user_id",profile.user_id);
 if(roleError||!learnerRolesOnly(roles??[]))return fail(403);
 const user=await admin.auth.admin.getUserById(profile.user_id);
 if(user.error||user.data.user.app_metadata?.identity_kind!=="self_reported_learner")return fail(403);
 const membership=await admin.from("memberships").upsert({user_id:profile.user_id,cohort_id:cohort,learner_id:identity.studentId},{onConflict:"cohort_id,user_id"});if(membership.error)return fail(409);
 const link=await admin.auth.admin.generateLink({type:"magiclink",email:user.data.user.email!});if(link.error||!link.data.properties?.hashed_token)return fail(503);
 const auth=createClient(url,Deno.env.get("SUPABASE_ANON_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
 const verified=await auth.auth.verifyOtp({token_hash:link.data.properties.hashed_token,type:"email"});
 if(verified.error||verified.data.user?.id!==profile.user_id||!verified.data.session)return fail(503);
 return Response.json({session:{access_token:verified.data.session.access_token,refresh_token:verified.data.session.refresh_token}},{headers});
}};
