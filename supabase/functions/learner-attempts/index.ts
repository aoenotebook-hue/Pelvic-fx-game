import {withSupabase} from "npm:@supabase/server@1.9.1";
export default {fetch:withSupabase({auth:"user"},async(request,ctx)=>{
 if(request.method!=="POST")return Response.json({error:"Method not allowed"},{status:405});
 let body;try{body=await request.json();}catch{return Response.json({error:"Invalid request"},{status:400});}
 if(!body||typeof body!=="object"||Array.isArray(body))return Response.json({error:"Invalid request"},{status:400});
 const owned=await ctx.supabaseAdmin.from("attempts").select("id,content_version,kind,original_attempt_id").eq("user_id",ctx.userClaims?.id).eq("course_id",body.courseId).order("created_at",{ascending:false});
 if(owned.error)return Response.json({error:"Saved attempts unavailable"},{status:503});
 const attempts=[];
 for(const attempt of owned.data??[]){const events=[];for(let offset=0;;offset+=500){const page=await ctx.supabaseAdmin.from("response_events").select("payload,server_receipt_timestamp").eq("attempt_id",attempt.id).eq("user_id",ctx.userClaims?.id).order("client_sequence").range(offset,offset+499);if(page.error)return Response.json({error:"Saved events unavailable"},{status:503});events.push(...page.data.map(row=>({...row.payload,serverReceiptTimestamp:row.server_receipt_timestamp})));if(page.data.length<500)break;}attempts.push({attemptId:attempt.id,contentVersion:attempt.content_version,kind:attempt.kind,originalAttemptId:attempt.original_attempt_id,events});}
 return Response.json({attempts});
})};
