import {managedTabs,safeSheetCell,type SheetRow} from "../../../src/reporting/sheets.ts";
const encode=(value:string)=>btoa(value).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
export async function googleAccessToken(){
 const email=Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL"),pem=Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")?.replaceAll("\\n","\n");if(!email||!pem)throw new Error("Google service account is not configured");
 const bytes=Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g,"").replace(/\s/g,"")),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey("pkcs8",bytes,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]),now=Math.floor(Date.now()/1000);
 const unsigned=encode(JSON.stringify({alg:"RS256",typ:"JWT"}))+"."+encode(JSON.stringify({iss:email,scope:"https://www.googleapis.com/auth/spreadsheets",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600}));
 const signature=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(unsigned));
 const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:unsigned+"."+encode(String.fromCharCode(...new Uint8Array(signature)))})});
 const data=await response.json();if(!response.ok||!data.access_token)throw new Error("Google service account authentication failed");return data.access_token as string;
}
export class GoogleWorkbook {
 constructor(private id:string,private token:string){}
 async audit(){
  const query=managedTabs.map(title=>`ranges=${encodeURIComponent("'"+title.replaceAll("'","''")+"'!A1:X10000")}`).join("&");
  const data=await this.api(`/values:batchGet?${query}&valueRenderOption=UNFORMATTED_VALUE`);
  const tabs=(data.valueRanges??[]).map((range:{values?:unknown[][]},index:number)=>{
   const rows=range.values??[],ids=rows.slice(1).map(row=>String(row[0]??"")).filter(id=>id.startsWith("ptd:"));
   return {title:managedTabs[index],managedRecords:ids.length,duplicateIds:ids.length-new Set(ids).size,formulaErrors:rows.flat().filter(cell=>typeof cell==="string"&&/^#(REF!|ERROR!|VALUE!|DIV\/0!|N\/A$|NAME\?|NUM!|SPILL!)/.test(cell)).length};
  });
  const demo=data.valueRanges?.[managedTabs.indexOf("Demo Examples")]?.values??[];
  const overview=data.valueRanges?.[managedTabs.indexOf("Class Overview")]?.values??[];
  const learners=data.valueRanges?.[managedTabs.indexOf("Learner Results")]?.values??[];
  const qaRecords=learners.slice(1).filter((row:unknown[])=>String(row[1]).startsWith("QA-")).map((row:unknown[])=>({recordId:row[0],qaLabel:row[1],kind:row[6],answered:row[13],reward:row[17],completed:Boolean(row[10])}));
  return {tabs,demoHeader:demo[0]??[],demoExamples:demo.slice(1),qaRecords,overviewMetrics:overview.slice(6,10).map((row:unknown[])=>({label:row[0],value:row[1]})),ok:tabs.length===managedTabs.length&&tabs.every((tab:{duplicateIds:number;formulaErrors:number})=>!tab.duplicateIds&&!tab.formulaErrors)};
 }
 async api(path:string,method="GET",body?:unknown){const response=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(this.id)}${path}`,{method,headers:{Authorization:`Bearer ${this.token}`,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});if(!response.ok)throw new Error(`Sheets API request failed (${response.status}); check workbook sharing and API configuration`);return response.status===204?{}:await response.json();}
 async ensureTabs(){
  const metadata=await this.api("?fields=sheets(properties,developerMetadata)");const sheets=metadata.sheets??[];const requests=[];
  for(const [index,title] of managedTabs.entries()){
   const existing=sheets.find((s:{properties:{title:string}})=>s.properties.title===title);
   if(existing&&!existing.developerMetadata?.some((m:{metadataKey:string;metadataValue:string})=>m.metadataKey==="ptd_owner"&&m.metadataValue==="pelvic-trauma-decisions-v1"))throw new Error(`Existing tab '${title}' is not application-managed; preserve it and choose a different tab name before setup`);
   if(existing)continue;
   const sheetId=710000+index;if(sheets.some((s:{properties:{sheetId:number}})=>s.properties.sheetId===sheetId))throw new Error("Managed sheet ID collision");
   requests.push({addSheet:{properties:{sheetId,title,gridProperties:{rowCount:10000,columnCount:24,frozenRowCount:1}}}},{createDeveloperMetadata:{developerMetadata:{metadataKey:"ptd_owner",metadataValue:"pelvic-trauma-decisions-v1",visibility:"DOCUMENT",location:{sheetId}}}},{repeatCell:{range:{sheetId,startRowIndex:0,endRowIndex:1},cell:{userEnteredFormat:{backgroundColor:{red:.12,green:.28,blue:.36},textFormat:{bold:true,foregroundColor:{red:1,green:1,blue:1}},wrapStrategy:"WRAP"}},fields:"userEnteredFormat"}},{repeatCell:{range:{sheetId,startColumnIndex:0,endColumnIndex:24,startRowIndex:1},cell:{userEnteredFormat:{numberFormat:{type:"TEXT"},wrapStrategy:"WRAP"}},fields:"userEnteredFormat"}},{updateDimensionProperties:{range:{sheetId,dimension:"COLUMNS",startIndex:0,endIndex:24},properties:{pixelSize:175},fields:"pixelSize"}});
   if(title!=="Class Overview")requests.push({setBasicFilter:{filter:{range:{sheetId,startRowIndex:0,endRowIndex:10000,endColumnIndex:24}}}});
   if(title==="Decision Evidence")requests.push({addConditionalFormatRule:{index:0,rule:{ranges:[{sheetId,startRowIndex:1,startColumnIndex:9,endColumnIndex:10}],booleanRule:{condition:{type:"TEXT_EQ",values:[{userEnteredValue:"unresolved"}]},format:{backgroundColor:{red:1,green:.88,blue:.76}}}}}});
  }
  if(requests.length)await this.api(":batchUpdate","POST",{requests});
 }
 async upsert(title:string,rows:SheetRow[]){
  const escaped=title.replaceAll("'","''"),prefix=`'${escaped}'!`;
  const current=await this.api(`/values/${encodeURIComponent(prefix+"A1:A10000")}?valueRenderOption=UNFORMATTED_VALUE`);
  const values=current.values??[],index=new Map<string,number>();for(let row=1;row<values.length;row++){const id=String(values[row]?.[0]??"");if(id.startsWith("ptd:")){if(index.has(id))throw new Error(`Duplicate managed record in ${title}`);index.set(id,row+1);}}
  const desired=new Set(rows.slice(1).map(row=>String(row[0])));let next=Math.max(2,values.length+1);
  const data:Array<{range:string;values:SheetRow[]}>= [{range:prefix+"A1",values:[rows[0].map(safeSheetCell)]}];
  for(const row of rows.slice(1)){const target=index.get(String(row[0]))??next++;if(target>10000)throw new Error("Workbook tab exceeds configured row capacity");data.push({range:prefix+`A${target}`,values:[row.map(cell=>typeof cell==="string"?safeSheetCell(cell):cell)]});}
  // RAW ensures leading-zero IDs remain strings and authored text never becomes a formula.
  for(let offset=0;offset<data.length;offset+=200)await this.api("/values:batchUpdate","POST",{valueInputOption:"RAW",data:data.slice(offset,offset+200)});
  const stale=[...index].filter(([id])=>!desired.has(id)).map(([,row])=>prefix+`A${row}:X${row}`);
  if(stale.length)await this.api("/values:batchClear","POST",{ranges:stale});
 }
 async overview(){
  const range="'Class Overview'!A1:B18",existing=await this.api(`/values/${encodeURIComponent("'Class Overview'!A1")}`);if(existing.values?.length)return;
  const rows:SheetRow[]=[["Class briefing","Filters use Bangkok received dates"],["From date (YYYY-MM-DD)",""],["To date (YYYY-MM-DD)",""],["Cohort (blank = all)",""],["Content version (blank = all)",""],["Denominator","Registered learners"],["Registered learners","=COUNTA(UNIQUE(FILTER('Learner Results'!B2:B10000,'Learner Results'!B2:B10000<>\"\")))"],["Assessed attempts in range",""],["Completed in range",""],["Unresolved responses in range",""],["Assessment advice","Use first answers, corrections and authored handovers to choose discussion topics."],["Missing evidence","Missing answers mean not observed; do not count them as incorrect."],["Practice","Practice appears in Learner Results and is excluded from the assessed totals here."],["Identity","Email/student ID is self-reported. Teacher access uses verified accounts."],["Demo examples","Six fictional examples appear only on Demo Examples; excluded from class totals."],["Objective analysis","Filter cohort, version and date in Objective Analysis. Sum observed/expected; divide summed first-correct by summed observed."],["Teacher discussion","Open the app link to record observations and advice. Sheets is a read-only mirror of app evidence."],["Reward","Rewards describe game progress, not clinical competence."]];
  rows[6][1]="=IFERROR(ROWS(UNIQUE(FILTER('Learner Results'!E2:E10000&\"|\"&'Learner Results'!B2:B10000,'Learner Results'!B2:B10000<>\"\",IF($B$4=\"\",'Learner Results'!B2:B10000<>\"\",'Learner Results'!E2:E10000=$B$4),IF($B$5=\"\",'Learner Results'!B2:B10000<>\"\",'Learner Results'!F2:F10000=$B$5)))),0)";
  const conditions="('Learner Results'!G2:G10000=\"initial\")*(LEFT('Learner Results'!L2:L10000,9)=\"reporting\")*IF($B$2=\"\",1,'Learner Results'!J2:J10000>=$B$2)*IF($B$3=\"\",1,'Learner Results'!J2:J10000<=$B$3)*IF($B$4=\"\",1,'Learner Results'!E2:E10000=$B$4)*IF($B$5=\"\",1,'Learner Results'!F2:F10000=$B$5)";
  rows[7][1]=`=SUMPRODUCT(${conditions})`;rows[8][1]=`=SUMPRODUCT(${conditions}*('Learner Results'!K2:K10000<>\"\"))`;rows[9][1]=`=SUMPRODUCT(${conditions}*N('Learner Results'!P2:P10000))`;
  await this.api("/values:batchUpdate","POST",{valueInputOption:"USER_ENTERED",data:[{range,values:rows}]});
  const priorities=`=IFERROR(QUERY('Decision Evidence'!A1:T10000,"select Q, count(Q) where S = 'reporting' and (J = 'corrected' or J = 'unresolved') and Q is not null"&IF($B$2="",""," and F >= '"&$B$2&"'")&IF($B$3="",""," and F <= '"&$B$3&"'")&IF($B$4="",""," and D = '"&$B$4&"'")&IF($B$5="",""," and E = '"&$B$5&"'")&" group by Q order by count(Q) desc label Q 'Discussion priority', count(Q) 'First responses needing discussion'",1),"No matching misconceptions recorded")`;
  await this.api("/values:batchUpdate","POST",{valueInputOption:"USER_ENTERED",data:[{range:"'Class Overview'!A20",values:[[priorities]]}]});
 }
 /** Evaluation tabs (medical-education analysis): created if missing and fully rewritten on each sync. */
 async ensureEvaluationTabs(titles:readonly string[],teacherTabs:ReadonlyArray<{name:string;headers:readonly string[]}>){
  const metadata=await this.api("?fields=sheets(properties,developerMetadata)");const sheets=metadata.sheets??[];const requests:unknown[]=[];const headerWrites:Array<{range:string;values:SheetRow[]}>=[];
  const owned=(sheet:{developerMetadata?:Array<{metadataKey:string;metadataValue:string}>})=>sheet.developerMetadata?.some(m=>m.metadataKey==="ptd_owner"&&m.metadataValue==="pelvic-trauma-evaluation-v1");
  const all=[...titles.map(title=>({title,teacher:false,headers:[] as readonly string[]})),...teacherTabs.map(tab=>({title:tab.name,teacher:true,headers:tab.headers}))];
  for(const [index,tab] of all.entries()){
   const existing=sheets.find((sheet:{properties:{title:string}})=>sheet.properties.title===tab.title);
   // A tab the teacher made with the same name is never overwritten; teacher tabs are only created when missing.
   if(existing){if(!tab.teacher&&!owned(existing))throw new Error(`Existing tab '${tab.title}' is not application-managed; rename it so the evaluation tabs can be created`);continue;}
   const sheetId=720000+index;if(sheets.some((sheet:{properties:{sheetId:number}})=>sheet.properties.sheetId===sheetId))throw new Error("Managed sheet ID collision");
   requests.push({addSheet:{properties:{sheetId,title:tab.title,gridProperties:{rowCount:10000,columnCount:40,frozenRowCount:1}}}},{createDeveloperMetadata:{developerMetadata:{metadataKey:"ptd_owner",metadataValue:"pelvic-trauma-evaluation-v1",visibility:"DOCUMENT",location:{sheetId}}}},{repeatCell:{range:{sheetId,startRowIndex:0,endRowIndex:1},cell:{userEnteredFormat:{backgroundColor:{red:.12,green:.28,blue:.4},textFormat:{bold:true,foregroundColor:{red:1,green:1,blue:1}}}},fields:"userEnteredFormat(backgroundColor,textFormat)"}});
   if(tab.teacher)headerWrites.push({range:`'${tab.title.replaceAll("'","''")}'!A1`,values:[[...tab.headers]]});
  }
  if(requests.length)await this.api(":batchUpdate","POST",{requests});
  if(headerWrites.length)await this.api("/values:batchUpdate","POST",{valueInputOption:"RAW",data:headerWrites});
 }
 async read(range:string){const data=await this.api(`/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`);return (data.values??[]) as unknown[][];}
 /** Clears and rewrites a generated tab. RAW keeps leading-zero IDs as text; only listed formula cells are interpreted. */
 async replace(title:string,rows:SheetRow[],formulaCells:Array<{row:number;col:number}>=[]){
  const prefix=`'${title.replaceAll("'","''")}'!`;
  await this.api("/values:batchClear","POST",{ranges:[prefix+"A1:AN10000"]});
  if(rows.length>10000)throw new Error(`Workbook tab '${title}' exceeds configured row capacity`);
  const data:Array<{range:string;values:SheetRow[]}>=[];
  for(let offset=0;offset<rows.length;offset+=500)data.push({range:prefix+`A${offset+1}`,values:rows.slice(offset,offset+500).map(row=>row.map(cell=>typeof cell==="string"?safeSheetCell(cell):cell))});
  for(let offset=0;offset<data.length;offset+=20)await this.api("/values:batchUpdate","POST",{valueInputOption:"RAW",data:data.slice(offset,offset+20)});
  const formulas=formulaCells.map(cell=>({range:prefix+`${String.fromCharCode(65+cell.col)}${cell.row+1}`,values:[[rows[cell.row][cell.col]]]}));
  if(formulas.length)await this.api("/values:batchUpdate","POST",{valueInputOption:"USER_ENTERED",data:formulas});
 }
 async append(title:string,rows:SheetRow[]){if(!rows.length)return;await this.api(`/values/${encodeURIComponent(`'${title.replaceAll("'","''")}'!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,"POST",{values:rows.map(row=>row.map(cell=>typeof cell==="string"?safeSheetCell(cell):cell))});}
}
