(async()=>{
 const unhandled=[];const listener=event=>unhandled.push(String(event.reason));window.addEventListener('unhandledrejection',listener);
 const {appendEventAtomically,loadEvents}=await import('/src/storage/db.ts');
 const account='browser-storage-check',attemptId=crypto.randomUUID();
 const events=[1,2,3].map(index=>({type:'resource_viewed',eventId:crypto.randomUUID(),attemptId,learnerId:account,contentVersion:'ptd-learning-draft-2026-10-03',clientSequence:1,clientTimestamp:new Date().toISOString(),serverReceiptTimestamp:null,resourceId:'R'+index}));
 const saved=await Promise.all(events.map(event=>appendEventAtomically(account,event)));
 const repeated=await appendEventAtomically(account,events[1]);
 let alterationRejected=false;try{await appendEventAtomically(account,{...events[1],resourceId:'R4'});}catch{alterationRejected=true;}
 const loaded=await loadEvents(account,attemptId);
 const sources=await Promise.all(['/resources/pelvic-fracture-medical-student-2024.pdf','/resources/pelvic-fracture-teaching-handout-th.pdf','/resources/pelvic-injury-teaching-plan-th.pdf'].map(async path=>({path,status:(await fetch(path)).status})));
 await new Promise(resolve=>setTimeout(resolve,50));window.removeEventListener('unhandledrejection',listener);
 const result={sequences:saved.map(event=>event.clientSequence),repeatedSequence:repeated.clientSequence,records:loaded.length,alterationRejected,sources,unhandled};
 if(loaded.length!==3||!alterationRejected||unhandled.length||saved.some((event,index)=>event.clientSequence!==index+1))throw Error(JSON.stringify(result));return result;
})()
