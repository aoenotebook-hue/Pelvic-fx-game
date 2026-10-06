(async () => {
  const { pelvicTraumaContentV3: content } = await import('/src/content/content.v3.ts');
  const corrected = Boolean(window.__journeyCorrected);
  const delay = () => new Promise(resolve => setTimeout(resolve, 100));
  const click = (text) => {
    const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === text);
    if (!button || button.disabled) throw new Error('Unavailable button: ' + text);
    button.click();
  };
  const write = (text) => {
    const input = document.querySelector('textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input,text);
    input.dispatchEvent(new Event('input',{bubbles:true}));
  };
  for (const mission of content.missions) {
    click('Quests'); await delay();
    const card = [...document.querySelectorAll('.mission-card')].find(c=>c.textContent.includes(mission.title));
    card.querySelector('button').click(); await delay();
    for (const id of mission.nodeIds) {
      const node = content.nodes.find(n=>n.id===id);
      if(node.explanationBeforeChoices) { if(document.querySelector('.choices input'))throw Error('Handover choices revealed early'); write('I will report current findings, actions and uncertainty to my senior.');await delay();click('Save reason and reveal choices');await delay(); }
      const option = corrected ? node.options.find(o=>!node.correctOptionIds.includes(o.id)).id : node.correctOptionIds[0];
      document.querySelector('input[value="'+option+'"]').click();
      click('Lock in action'); await delay();
      click(corrected ? 'Open same-step retry' : 'Collect reward'); await delay();
      if(corrected) {
        const retry=content.corrections.find(r=>r.id===node.retryId);
        [...document.querySelectorAll('.choices input')]["ABC".indexOf(retry.correctOptionId.slice(-1))].click();
        await delay(); click('Check correction'); await delay();
        click('I reviewed the explanation · collect reward');await delay();
      }
      click(node.nextNodeId ? 'Reveal next clue' : mission.number===3 ? 'Enter team debrief' : 'Return to quest board'); await delay();
    }
  }
  const handovers=document.querySelectorAll('.handover-note').length;
  if(handovers!==3) throw Error('Expected three handover notes');
  click('Finish shift'); await delay();
  const metrics=[...document.querySelectorAll('.metric')].map(e=>e.textContent);
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('pelvic-trauma-decisions');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const events=await new Promise((resolve,reject)=>{const r=db.transaction('events').objectStore('events').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const result={route:corrected?'all-corrected':'all-correct',metrics,handovers,coreResponses:events.filter(e=>e.type==='core_response').length,corrections:events.filter(e=>e.type==='correction_response').length,optionalConfidenceOmitted:events.filter(e=>e.type==='core_response').every(e=>!e.confidence),notesOnlyAtHandovers:events.filter(e=>e.type==='core_response'&&e.rationale).length,podiumPlaces:document.querySelectorAll('.podium-place').length,receipt:document.body.innerText.includes('Completed on this device'),brokenImages:[...document.images].filter(i=>!i.complete || !i.naturalWidth).map(i=>i.src),overflow:document.documentElement.scrollWidth>innerWidth};
  if(!metrics[0].includes(corrected?'220 / 250':'250 / 250')) throw Error(JSON.stringify(result));
  return result;
})()
