import {withSupabase} from "npm:@supabase/server@1.9.1";
import {assignedFaculty} from "../../../src/domain/authorization.ts";
export default {fetch:withSupabase({auth:"user"},async(request,ctx)=>{
 if(request.method!=="POST")return Response.json({error:"Method not allowed"},{status:405});
 let body;try{body=await request.json();}catch{return Response.json({error:"Invalid request"},{status:400});}
 if(!body||typeof body!=="object"||Array.isArray(body))return Response.json({error:"Invalid request"},{status:400});
 const roles=await ctx.supabaseAdmin.from("role_assignments").select("role,cohort_id").eq("user_id",ctx.userClaims?.id),cohorts=await ctx.supabaseAdmin.from("cohorts").select("id").eq("course_id",body.courseId);
 if(roles.error||cohorts.error||!cohorts.data?.some(c=>assignedFaculty(roles.data??[],c.id)))return Response.json({error:"Assigned faculty required"},{status:403});
 if(body.requestSync){const queued=await ctx.supabaseAdmin.rpc("queue_sheet_course",{target_course:body.courseId});if(queued.error)return Response.json({error:"Could not queue export"},{status:503});}
 const queue=await ctx.supabaseAdmin.from("sheets_export_queue").select("revision,delivered_revision,last_success,last_error").eq("course_id",body.courseId).maybeSingle();if(queue.error)return Response.json({error:"Status unavailable"},{status:503});
 return Response.json({configured:Boolean(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL")&&Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")&&Deno.env.get("GOOGLE_SHEET_ID")&&Deno.env.get("SHEETS_WORKER_SECRET")),pending:Math.max(0,(queue.data?.revision??0)-(queue.data?.delivered_revision??0)),lastSuccess:queue.data?.last_success??null,error:queue.data?.last_error??null});
})};
