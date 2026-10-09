import {withSupabase} from "npm:@supabase/server@1.9.1";
export default {fetch:withSupabase({auth:"user"},async(request,ctx)=>{
 if(request.method!=="POST")return Response.json({error:"Method not allowed"},{status:405});
 let body;try{body=await request.json();}catch{return Response.json({error:"Invalid request"},{status:400});}
 if(!body||typeof body!=="object"||Array.isArray(body))return Response.json({error:"Invalid request"},{status:400});
 const {data,error}=await ctx.supabaseAdmin.from("memberships").select("learner_id,cohort_id,cohorts!inner(course_id)").eq("user_id",ctx.userClaims?.id).eq("cohorts.course_id",body.courseId);
 if(error||!data?.length)return Response.json({error:"Membership required"},{status:403});
 const profile=await ctx.supabaseAdmin.from("learner_profiles").select("email,student_id,identity_status").eq("user_id",ctx.userClaims?.id).eq("course_id",body.courseId).maybeSingle();
 if(profile.error)return Response.json({error:"Profile unavailable"},{status:503});
 return Response.json({profile:{studentId:profile.data?.student_id??data[0].learner_id,email:profile.data?.email??"",identityStatus:profile.data?.identity_status??"verified_account"}});
})};
