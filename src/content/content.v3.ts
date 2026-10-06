import { pelvicTraumaContentV2, revisions } from "./content.v2";
import type { ContentVersion, Node } from "../domain/types";
export const LEARNING_VERSION = "ptd-learning-draft-2026-10-03";
export const teachingBlueprint: Record<string, NonNullable<Node["teaching"]>> = {
  "M1N1": {
    "objective": "Recognize physiological threat",
    "keyMessage": "Hypotension, tachycardia and cool peripheries justify urgent haemorrhage concern; the source remains uncertain.",
    "misconception": "Classifying the fracture before addressing physiology",
    "discussionPrompt": "Which observations make this urgent before the fracture is classified?",
    "suggestedFeedback": "Start with the observations, distinguish concern from confirmed source, and request senior support.",
    "sources": [
      "Handout: initial assessment",
      "slides: emergency management"
    ]
  },
  "M1N2": {
    "objective": "Parallel trauma priorities",
    "keyMessage": "Assessment, resuscitation and senior escalation proceed in parallel.",
    "misconception": "Waiting for a completed pelvic assessment before resuscitation",
    "discussionPrompt": "Compare a sequential plan with parallel assessment and support.",
    "suggestedFeedback": "Name what continues now and what needs senior coordination.",
    "sources": [
      "Handout: emergency management"
    ]
  },
  "M1N3": {
    "objective": "Binder landmark",
    "keyMessage": "The supervised team uses the greater trochanters as the binder landmark.",
    "misconception": "Confusing iliac crests with greater trochanters",
    "discussionPrompt": "Where is the landmark, and who checks positioning?",
    "suggestedFeedback": "Use the supplied teaching photograph; do not infer clinical competence from identifying it.",
    "sources": [
      "Handout p17",
      "slides: emergency management"
    ]
  },
  "M1N5": {
    "objective": "Interpret transient response",
    "keyMessage": "Temporary physiological improvement does not establish bleeding control.",
    "misconception": "Treating transient improvement as sustained control",
    "discussionPrompt": "What would make you concerned despite a temporary improvement?",
    "suggestedFeedback": "Connect the supplied reassessment to continuing monitoring and escalation.",
    "sources": [
      "Handout: haemorrhage assessment"
    ]
  },
  "M1N4": {
    "objective": "Imaging during unresolved shock",
    "keyMessage": "Imaging choices must fit physiology and available urgent haemorrhage-control pathways.",
    "misconception": "Prioritizing CT regardless of unresolved shock",
    "discussionPrompt": "How does transient response change the discussion about imaging?",
    "suggestedFeedback": "Discuss the stated setting and senior control plan without prescribing a definitive intervention.",
    "sources": [
      "Handout: initial management and imaging"
    ]
  },
  "M1N6": {
    "objective": "Urgent handover",
    "keyMessage": "Connect concerning physiology, transient response and urgent coordinated senior action.",
    "misconception": "Reporting a fracture label without physiological trajectory",
    "discussionPrompt": "Give a short handover without looking at the choices; what remains uncertain?",
    "suggestedFeedback": "Ask for evidence, priority and an explicit senior request, not a memorized diagnosis.",
    "sources": [
      "Handout: emergency management"
    ]
  },
  "M2N1": {
    "objective": "Establish imaging context",
    "keyMessage": "Binder status at arrival affects interpretation of the supplied imaging report.",
    "misconception": "Interpreting an image without the binder context",
    "discussionPrompt": "What context must accompany the AP report?",
    "suggestedFeedback": "The fictional report is authoritative; the teaching image is not this patient's diagnostic image.",
    "sources": [
      "Slides p14",
      "handout: imaging"
    ]
  },
  "M2N2": {
    "objective": "Review the pelvic ring",
    "keyMessage": "Review anterior and posterior findings together.",
    "misconception": "Using anterior findings alone to characterize the ring",
    "discussionPrompt": "Compare an anterior-only reading with a whole-ring reading.",
    "suggestedFeedback": "Use only documented findings; distinguish report evidence from inferred injury.",
    "sources": [
      "Slides p5,p14",
      "handout: anatomy and imaging"
    ]
  },
  "M2N3": {
    "objective": "Two meanings of stability",
    "keyMessage": "Physiological and mechanical stability are distinct judgments.",
    "misconception": "Inferring mechanical stability from improved circulation",
    "discussionPrompt": "Can improved observations establish mechanical stability?",
    "suggestedFeedback": "Explain which evidence supports each judgment and which remains uncertain.",
    "sources": [
      "Slides p5",
      "handout: stability"
    ]
  },
  "M2N4": {
    "objective": "Supervised binder reassessment",
    "keyMessage": "Further imaging, senior reassessment and an agreed removal plan belong together.",
    "misconception": "Removing a binder on a reassuring AP image alone",
    "discussionPrompt": "How could a binder affect apparent alignment and the reassessment plan?",
    "suggestedFeedback": "Retain supervised seed wording; discuss the handout/BOAST discrepancy before teaching.",
    "sources": [
      "Handout pp17–18",
      "BOAST pelvic fractures"
    ]
  },
  "M2N5": {
    "objective": "Imaging handover",
    "keyMessage": "Communicate documented ring findings, binder context and uncertainty.",
    "misconception": "Presenting an unqualified stability conclusion",
    "discussionPrompt": "Compare the physiological and mechanical claims in your handover.",
    "suggestedFeedback": "Request appropriate senior review and explain why the report alone cannot settle every question.",
    "sources": [
      "Slides p14",
      "handout: imaging"
    ]
  },
  "M3N1": {
    "objective": "Possible open injury",
    "keyMessage": "A perineal wound raises possible communication even without visible bone.",
    "misconception": "Underestimating a small wound without visible bone",
    "discussionPrompt": "Why can a small perineal wound still matter?",
    "suggestedFeedback": "Report possible open injury and request appropriate senior assessment, without claiming proof.",
    "sources": [
      "Handout: associated injuries",
      "slides p11"
    ]
  },
  "M3N2": {
    "objective": "Urethral warning",
    "keyMessage": "Meatal bleeding raises suspicion; the experienced team determines evaluation and drainage.",
    "misconception": "Treating urinary monitoring as independent of the urethral warning",
    "discussionPrompt": "What does meatal bleeding establish, and what does it not establish?",
    "suggestedFeedback": "Distinguish suspicion from injury extent. Avoid student or repeated blind attempts; experienced clinicians follow the local pathway.",
    "sources": [
      "Handout: associated urinary injury",
      "slides p11",
      "BOAST urological trauma"
    ]
  },
  "M3N3": {
    "objective": "Coordinated associated-injury review",
    "keyMessage": "Trauma care continues alongside urgent wound and urinary review.",
    "misconception": "Handling wound or urinary concerns as a separate later task",
    "discussionPrompt": "Compare isolated drainage planning with coordinated trauma review.",
    "suggestedFeedback": "Name all current concerns and the senior coordination needed; do not invent a definitive operation.",
    "sources": [
      "Handout: associated injuries",
      "slides p11"
    ]
  },
  "M3N4": {
    "objective": "Uncertainty in handover",
    "keyMessage": "Communicate suspected open and urethral injuries without unproven diagnoses.",
    "misconception": "Overstating a suspected associated injury as established",
    "discussionPrompt": "Which words distinguish suspicion from confirmation in your handover?",
    "suggestedFeedback": "Give the findings, the concerns, what remains unconfirmed and the senior request.",
    "sources": [
      "Handout: associated injuries",
      "slides p11"
    ]
  }
};
export const learningRevisions = structuredClone(revisions);
const binder=learningRevisions.find(item=>item.id==="M1N3")!;
binder.en.choices[2]="Centre the binder over the anterior superior iliac spines.";
binder.th.choices[2]="กึ่งกลาง binder อยู่ระดับ anterior superior iliac spines";
binder.en.reasons[2]="The anterior superior iliac spines are too high; confirm the greater-trochanter landmark with trained staff.";
binder.th.reasons[2]="Anterior superior iliac spines สูงเกินไป ให้ผู้มีทักษะยืนยัน landmark ที่ greater trochanters";
const parallel=learningRevisions.find(item=>item.id==="M1N2")!;
parallel.en.retryChoices[1]="Imaging classification and review before updating resuscitation priorities.";
parallel.th.retryChoices[1]="จำแนก imaging และ review ก่อนปรับ resuscitation priorities";
parallel.en.retryReasons[1]="Classification must not hold up reassessment and urgent support in parallel.";
parallel.th.retryReasons[1]="Classification ต้องไม่ทำให้ reassessment และ urgent support ที่ทำคู่ขนานล่าช้า";
const response=learningRevisions.find(item=>item.id==="M1N5")!;
response.en.choices[1]="The recurrent fall supports a pelvis-focused review before other sources.";
response.th.choices[1]="BP ที่ลดอีกสนับสนุนให้ review pelvis ก่อนแหล่งเลือดออกอื่น";
response.en.reasons[1]="The trend does not localize the bleeding; assessment for other sources continues in parallel.";
response.th.reasons[1]="Trend ไม่ระบุแหล่งเลือดออก ต้องประเมินแหล่งอื่นคู่ขนานต่อ";
response.en.retryChoices[2]="It supports narrowing the reassessment to the pelvic injury.";
response.th.retryChoices[2]="สนับสนุนให้จำกัด reassessment เฉพาะ pelvic injury";
response.en.retryReasons[2]="The trend does not exclude other sources; retain the broader trauma reassessment.";
response.th.retryReasons[2]="Trend ไม่ตัดแหล่งเลือดออกอื่น ต้องคง trauma reassessment โดยรวม";
const handover=learningRevisions.find(item=>item.id==="M3N4")!;
handover.en.question="Which opening communicates the current joint concerns most accurately?";
handover.th.question="คำเปิดใดสื่อสารข้อกังวลร่วมตอนนี้ได้ตรงหลักฐานที่สุด?";
handover.en.choices[1]="Suspected urethral injury; urgent urinary review requested first.";
handover.th.choices[1]="สงสัย urethral injury ขอ urgent urinary review ก่อน";
handover.en.reasons[1]="This communicates the urinary warning but leaves the possible open injury out of the joint review.";
handover.th.reasons[1]="สื่อสาร urinary warning แต่ขาด possible open injury ใน joint review";
handover.en.retryChoices[0]="Keep the injury label and add the current circulation.";
handover.th.retryChoices[0]="คง injury label เดิมและเพิ่ม circulation ปัจจุบัน";
handover.en.retryReasons[0]="Adding observations does not correct the unsupported certainty in the draft.";
handover.th.retryReasons[0]="เพิ่ม observations ยังไม่แก้ความแน่นอนที่เกินหลักฐานใน draft";
// Preserve clinical facts and key positions; revise distractors in a new immutable edition.
const urinary = learningRevisions.find(item => item.id === "M3N2")!;
urinary.en.choices = ["Arrange urine monitoring first; revisit the meatal bleeding later.", "Request a drainage plan based on meatal bleeding without further evaluation.", "Raise suspected urethral injury and seek the senior evaluation plan."];
urinary.th.choices = ["จัด urine monitoring ก่อน แล้วทบทวน meatal bleeding ภายหลัง", "ขอ drainage plan จาก meatal bleeding โดยยังไม่ประเมินเพิ่ม", "รายงาน suspected urethral injury และขอ senior evaluation plan"];
urinary.en.reasons[0] = "The urethral warning must inform the senior evaluation plan before urinary instrumentation is considered.";
urinary.th.reasons[0] = "ต้องนำ urethral warning เข้าสู่ senior evaluation plan ก่อนพิจารณา urinary instrumentation";
urinary.en.reasons[1] = "Meatal bleeding does not determine injury extent or the appropriate drainage approach without evaluation.";
urinary.th.reasons[1] = "Meatal bleeding ไม่ระบุ extent หรือ drainage ที่เหมาะสมโดยยังไม่ประเมิน";
urinary.en.retryChoices = ["Suspicion of urethral injury requiring appropriate team evaluation.", "An injury extent that can be inferred without additional assessment.", "A urinary concern that can wait until routine monitoring is complete."];
urinary.th.retryChoices = ["สงสัย urethral injury ที่ต้องให้ทีมประเมินอย่างเหมาะสม", "ระบุ extent ของ injury ได้โดยไม่ต้องประเมินเพิ่ม", "Urinary concern รอจน routine monitoring เสร็จได้"];
urinary.en.retryReasons[2] = "The warning belongs in the current coordinated assessment, not a later routine task.";
urinary.th.retryReasons[2] = "Warning ต้องอยู่ในการประเมินร่วมตอนนี้ ไม่เลื่อนไปเป็น routine task ภายหลัง";
const coordinated = learningRevisions.find(item => item.id === "M3N3")!;
coordinated.en.retryChoices[0] = "A fracture-focused senior review with associated concerns deferred.";
coordinated.th.retryChoices[0] = "Senior review เน้น fracture โดยเลื่อน associated concerns ออกไป";
coordinated.en.retryReasons[0] = "The wound and urinary warning already warrant coordinated review.";
coordinated.th.retryReasons[0] = "แผลและ urinary warning ต้องอยู่ในการ review ร่วมตอนนี้";
export const learningRevisionById = new Map(learningRevisions.map(item => [item.id,item]));
export const teachingThaiById=new Map(learningRevisions.map(item=>[item.id,{
 ...teachingBlueprint[item.id],objective:item.th.question,keyMessage:item.th.reasons[item.key],
 misconception:`ทบทวนเหตุผลของตัวเลือกที่ยังไม่เหมาะสม: ${item.th.reasons.filter((_,index)=>index!==item.key).join(" · ")}`,
 discussionPrompt:`ลองอธิบายจากข้อมูลของเคสโดยยังไม่ดูตัวเลือก: ${item.th.question}`,
 suggestedFeedback:`เชื่อมข้อมูลที่มี เหตุผลและ action ภายใต้การกำกับ: ${item.th.reasons[item.key]}`
}]));
export const pelvicTraumaContentV3: ContentVersion = {
 ...pelvicTraumaContentV2, id: LEARNING_VERSION,
 governance: {...pelvicTraumaContentV2.governance, supersedesVersion: pelvicTraumaContentV2.id, status: "draft"},
 missions: pelvicTraumaContentV2.missions.map(item => ({...item,contentVersion:LEARNING_VERSION})),
 resources: pelvicTraumaContentV2.resources.map(item => ({...item,contentVersion:LEARNING_VERSION,...(item.id==="ORIENTATION"?{body:["Walk to a patient, read the team update and choose an action. Use the chart and references whenever helpful.","At each of three handovers, write one brief reason before revealing choices. Confidence is optional and never changes rewards.","Review feedback. After a correction, explicitly review its explanation to collect reward. Finish the shift after all 15 decisions and review your three handover notes.","Bring your learning summary to class. Rewards are game progress, not evidence of independent clinical competence."]}:{})})),
 nodes: pelvicTraumaContentV2.nodes.map(node => { const copy = learningRevisionById.get(node.id)!; return {...node,contentVersion:LEARNING_VERSION,stem:copy.en.stem,question:copy.en.question, teaching:teachingBlueprint[node.id], explanationBeforeChoices: Boolean(node.rationaleRequired), options:node.options.map((option,index)=>({...option,text:copy.en.choices[index], explanation:copy.en.reasons[index]})), rationalePrompt:node.rationaleRequired ? "Before seeing choices: connect the findings, priority and uncertainty in one short handover." : node.rationalePrompt}; }),
 corrections: pelvicTraumaContentV2.corrections.map(item => { const copy=learningRevisionById.get(item.parentNodeId!)!; return {...item,contentVersion:LEARNING_VERSION,stem:copy.en.retry,options:item.options.map((option,index)=>({...option,text:copy.en.retryChoices[index],explanation:copy.en.retryReasons[index]})),workedExample:copy.en.retryReasons[copy.retryKey]}; })
};
