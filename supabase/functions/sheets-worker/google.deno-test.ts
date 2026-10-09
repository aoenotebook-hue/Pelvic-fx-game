// Deno integration fixtures are run separately from the browser test suite.
import {GoogleWorkbook} from "./google.ts";
function assert(value:boolean,message:string){if(!value)throw new Error(message);}
Deno.test("stable record IDs reuse rows on repeated delivery, preserve foreign rows and use RAW",async()=>{
 const savedFetch=globalThis.fetch;const rows:unknown[][]=[["Record ID"],["human-note","Keep this"],["ptd:attempt:one","001234"]];let writes=0;
 globalThis.fetch=async(input,init)=>{const url=decodeURIComponent(String(input));if(url.includes("/values/")&&!init?.body)return Response.json({values:rows.map(row=>[row[0]])});const body=JSON.parse(String(init?.body));assert(body.valueInputOption==="RAW","Use RAW for identity and authored content");for(const item of body.data){const index=Number(item.range.match(/A(\d+)$/)[1])-1;rows[index]=item.values[0];}writes++;return Response.json({});};
 try{const workbook=new GoogleWorkbook("fixture","fixture-token"),data=[['Record ID','Student ID'],['ptd:attempt:one','001234'],['ptd:attempt:two','=unsafe']];await workbook.upsert("Learner Results",data);await workbook.upsert("Learner Results",data);assert(rows.length===4,"Repeated delivery must not duplicate rows");assert(rows[1][1]==="Keep this","Foreign rows must remain");assert(rows[2][1]==="001234","Leading zeros must remain");assert(rows[3][1]==="'=unsafe","Formula injection must be neutralized");assert(writes===2,"Both deliveries completed");}finally{globalThis.fetch=savedFetch;}
});
Deno.test("a failed write can be retried without duplicate records",async()=>{
 const savedFetch=globalThis.fetch;let fail=true;const rows:unknown[][]=[["Record ID"]];
 globalThis.fetch=async(input,init)=>{if(!init?.body)return Response.json({values:rows});if(fail){fail=false;return new Response("Unavailable",{status:503});}const body=JSON.parse(String(init.body));for(const item of body.data){const index=Number(item.range.match(/A(\d+)$/)[1])-1;rows[index]=item.values[0];}return Response.json({});};
 try{const workbook=new GoogleWorkbook("fixture","fixture-token"),data=[['Record ID'],['ptd:one','001']];let rejected=false;try{await workbook.upsert("Demo Examples",data);}catch{rejected=true;}assert(rejected,"Failed delivery must propagate");await workbook.upsert("Demo Examples",data);await workbook.upsert("Demo Examples",data);assert(rows.length===2,"Retried delivery must not duplicate rows");}finally{globalThis.fetch=savedFetch;}
});
Deno.test("existing unowned tabs cause a safe failure before writes",async()=>{const savedFetch=globalThis.fetch;globalThis.fetch=async()=>Response.json({sheets:[{properties:{title:"Learner Results",sheetId:3}}]});try{let rejected=false;try{await new GoogleWorkbook("fixture","fixture-token").ensureTabs();}catch{rejected=true;}assert(rejected,"Do not overwrite an existing unowned tab");}finally{globalThis.fetch=savedFetch;}});
Deno.test("readback flags duplicate IDs and formula errors without returning learner rows",async()=>{
 const savedFetch=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({valueRanges:[{values:[["Overview"],["#REF!"]]},{values:[["Record ID","Email"],["ptd:one","private@example.edu"],["ptd:one","private@example.edu"]]},...Array.from({length:6},()=>({values:[["Record ID"]]}))]});
 try{const result=await new GoogleWorkbook("fixture","fixture-token").audit();assert(!result.ok,"Invalid readback must fail");assert(result.tabs[0].formulaErrors===1,"Formula errors must be identified");assert(result.tabs[1].duplicateIds===1,"Duplicate IDs must be identified");assert(!JSON.stringify(result).includes("private@example.edu"),"Learner details must not be returned by diagnostics");}finally{globalThis.fetch=savedFetch;}
});
