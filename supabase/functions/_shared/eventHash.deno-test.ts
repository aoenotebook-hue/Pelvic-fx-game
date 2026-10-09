import {canonicalJson, canonicalEventJson} from "./eventHash.ts";
Deno.test("database object-key reordering preserves immutable event identity",()=>{
  const a={eventId:"same",nested:{z:1,a:"reason"},answers:["a","b"]};
  const b={answers:["a","b"],nested:{a:"reason",z:1},eventId:"same"};
  if(canonicalJson(a)!==canonicalJson(b))throw new Error("Key ordering changed identity");
});
Deno.test("receipt metadata does not alter recovered learner evidence",()=>{
  const event={eventId:"same",answer:"original"};
  for(const receipt of [null,"2026-10-09T00:00:00Z"]){
    if(canonicalEventJson(event)!==canonicalEventJson({...event,serverReceiptTimestamp:receipt}))throw new Error("Receipt changed identity");
  }
});
Deno.test("altered answers and array order remain different",()=>{
  const a={answers:["a","b"],reason:"original"};
  for(const b of [{answers:["b","a"],reason:"original"},{answers:["a","b"],reason:"changed"}]){
    if(canonicalJson(a)===canonicalJson(b))throw new Error("Changed payload accepted");
  }
});
