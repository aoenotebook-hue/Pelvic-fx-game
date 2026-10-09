import {readAttemptEvents} from "./read.ts";
import type {SupabaseClient} from "npm:@supabase/supabase-js@2";
Deno.test("complete attempt history uses explicit owner-filtered pagination",async()=>{
 const records=Array.from({length:1201},(_,i)=>({payload:{clientSequence:i+1},server_receipt_timestamp:"received"}));const ranges:number[][]=[],filters:string[][]=[];
 const query={select(){return this;},eq(key:string,value:string){filters.push([key,value]);return this;},order(){return this;},async range(from:number,to:number){ranges.push([from,to]);return{data:records.slice(from,to+1),error:null};}};
 const client={from:()=>query} as unknown as SupabaseClient;
 const result=await readAttemptEvents(client,"attempt","owner");
 if(result.length!==1201||JSON.stringify(ranges)!==JSON.stringify([[0,499],[500,999],[1000,1499]]))throw new Error("History was truncated");
 if(filters.filter(([key,value])=>key==="user_id"&&value==="owner").length!==3)throw new Error("Owner filter missing");
});
