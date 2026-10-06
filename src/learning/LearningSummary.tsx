import { deriveProgress } from "../domain/engine";
import type { ContentVersion, LearningEvent } from "../domain/types";
import {localizeNode} from "../i18n";
export function LearningSummary({content,events,language}:{content:ContentVersion;events:LearningEvent[];language:"en"|"th"}) {
  const progress=deriveProgress(content,events);
  if(!progress.answeredNodeIds.length) return null;
  const text=(en:string,th:string)=>language==="th"?th:en;
  const label=(id:string)=>{const node=content.nodes.find(node=>node.id===id)!;return language==="th"?localizeNode(node,language).question:node.teaching?.objective??node.question;};
  return <article className="panel"><h2>{text("Your learning evidence","หลักฐานการเรียนรู้ของคุณ")}</h2><p>{text("These responses guide discussion; they do not establish clinical competence.","คำตอบเหล่านี้ใช้วางแผนการอภิปราย ไม่รับรอง clinical competence")}</p><p>{text("First-response points demonstrated","ตอบถูกครั้งแรก")}: {progress.firstCorrectNodeIds.length}/15 · {text("Corrected after feedback","แก้หลัง feedback")}: {progress.correctedNodeIds.length}/15</p><details><summary>{text("First-response evidence","หลักฐานจากคำตอบแรก")}</summary>{progress.firstCorrectNodeIds.map(id=><p key={id}>{id} · {label(id)}</p>)}</details><details><summary>{text("Corrected after explanation review","แก้หลังอ่านคำอธิบาย")}</summary>{progress.correctedNodeIds.map(id=><p key={id}>{id} · {label(id)}</p>)}</details><details><summary>{text("Topics to revisit in class","หัวข้อที่ควรทบทวนในชั้นเรียน")}</summary>{content.nodes.filter(node=>!progress.firstCorrectNodeIds.includes(node.id)||node.interaction==="handover").map(node=><p key={node.id}>{node.id}: {language==="th"?localizeNode(node,language).question:node.teaching?.discussionPrompt ?? node.question} {!progress.answeredNodeIds.includes(node.id) && text("(no response yet)","(ยังไม่มีคำตอบ)")}</p>)}</details></article>;
}
