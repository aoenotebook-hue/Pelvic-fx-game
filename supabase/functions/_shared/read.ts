import type {SupabaseClient} from "npm:@supabase/supabase-js@2";
import type {LearningEvent} from "../../../src/domain/types.ts";
// Explicit ranges prevent the provider's default row limit from truncating evidence.
export async function readAttemptEvents(client:SupabaseClient,attemptId:string,userId:string){
 const result:Array<{payload:LearningEvent;server_receipt_timestamp:string}>=[];
 for(let offset=0;;offset+=500){
  const page=await client.from("response_events").select("payload,server_receipt_timestamp").eq("attempt_id",attemptId).eq("user_id",userId).order("client_sequence").range(offset,offset+499);
  if(page.error)throw new Error("Evidence unavailable");
  result.push(...page.data);
  if(page.data.length<500)return result;
 }
}
