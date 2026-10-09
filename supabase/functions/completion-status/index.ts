import { withCors } from "../_shared/http.ts";
import {withSupabase} from "npm:@supabase/server@1.9.1";
export default {fetch: withCors(withSupabase({auth:"user"},async(request,ctx)=>{
 if(request.method!=="POST")return Response.json({error:"Method not allowed"},{status:405});
 let body;try{body=await request.json();}catch{return Response.json({error:"Invalid JSON"},{status:400});}
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(typeof body?.attemptId!=="string"||!uuid.test(body.attemptId)||typeof body?.courseId!=="string"||!uuid.test(body.courseId))return Response.json({error:"Invalid request"},{status:400});
 const {data,error}=await ctx.supabaseAdmin.from("attempts").select("id,reporting_status,attempt_summaries(completed,completed_at)").eq("id",body.attemptId).eq("course_id",body.courseId).eq("user_id",ctx.userClaims?.id).maybeSingle();
 if(error||!data)return Response.json({error:"Attempt unavailable"},{status:403});
 const summary=Array.isArray(data.attempt_summaries)?data.attempt_summaries[0]:data.attempt_summaries;
 return Response.json({completionReceipt:data.reporting_status==="reporting"&&summary?.completed&&summary.completed_at?{status:"server_confirmed",completedAt:summary.completed_at,reportingAttemptId:data.id}:null});
}))};
