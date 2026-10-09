import { createContext, useContext } from "react";
import type { CorrectionItem, Mission, Node, Resource } from "./domain/types";
import { REVISION_ID, revisionById, revisedMissionThai } from "./content/content.v2";
import { LEARNING_VERSION, learningRevisionById, teachingThaiById } from "./content/content.v3";
import { FOCUSED_VERSION } from "./games/spec";

export type Language = "en" | "th";

type I18nValue = { language: Language; setLanguage(language: Language): void };
export const I18nContext = createContext<I18nValue>({ language: "en", setLanguage: () => undefined });
export const useLanguage = () => useContext(I18nContext);

const uiThai: Record<string, string> = {
  "pre-class clinical quest": "เกมสถานการณ์คลินิกก่อนเรียน",
  "Home": "ห้องฉุกเฉิน",
  "Quests": "ภารกิจ",
  "Resources": "บัตรอ้างอิง",
  "My progress": "ความก้าวหน้า",
  "Faculty demo": "สำหรับอาจารย์",
  "Help": "ช่วยเหลือ",
  "Sync now": "ส่งความก้าวหน้า",
  "Saved and checked": "บันทึกแล้ว",
  "waiting to sync": "รายการรอส่ง",
  "CREATE YOUR PLAYER": "เลือกตัวละคร",
  "Choose your clinical learner": "เลือกตัวละครผู้เรียน",
  "Characters have no names or gameplay advantage. Choose the appearance you want for this quest.": "ตัวละครไม่มีชื่อและไม่มีใครได้เปรียบในการเล่น เลือกรูปลักษณ์ที่คุณต้องการใช้ในภารกิจนี้",
  "Character": "ตัวละคร",
  "Calm observer": "สังเกตอย่างสุขุม",
  "Pattern finder": "ค้นหารูปแบบ",
  "Team communicator": "สื่อสารกับทีม",
  "Focused coordinator": "ประสานงานอย่างมีสมาธิ",
  "Start quest": "เริ่มภารกิจ",
  "PRECLASS CLINICAL QUEST · 15 DECISIONS": "เกมก่อนเรียน · 15 การตัดสินใจ",
  "QUEST HUB · EMERGENCY ROOM": "ศูนย์ภารกิจ · ห้องฉุกเฉิน",
  "Approach a patient to open a case": "เดินเข้าใกล้ผู้ป่วยเพื่อเปิดเคส",
  "Use arrow keys or WASD. On touch screens, use the direction pad.": "ใช้ปุ่มลูกศรหรือ WASD และใช้แป้นทิศทางบนหน้าจอสัมผัส",
  "Change character": "เปลี่ยนตัวละคร",
  "Near patient — case available": "อยู่ใกล้ผู้ป่วย — เปิดเคสได้",
  "Move closer to a patient": "เดินเข้าใกล้ผู้ป่วย",
  "Enter case": "เข้าเคส",
  "steps cleared": "ขั้นผ่านแล้ว",
  "Haemorrhage Response Bay": "จุดดูแลภาวะเลือดออก",
  "Pelvic Imaging Review Bay": "จุดทบทวนภาพเชิงกราน",
  "Sensitive Injury Assessment Bay": "จุดประเมินการบาดเจ็บอ่อนไหว",
  "Emergency Room Quest": "ภารกิจห้องฉุกเฉิน",
  "Explore. Decide.\nLevel up your reasoning.": "สำรวจ ตัดสินใจ\nพัฒนาการให้เหตุผล",
  "Guide your character through three patient bays, collect clinical clues, unlock six safety badges, and complete exactly 15 authored decisions.": "พาตัวละครไปยังผู้ป่วย 3 จุด เก็บข้อมูลทางคลินิก ปลดล็อก safety badge 6 รายการ และทำการตัดสินใจที่เขียนไว้ครบ 15 ข้อ",
  "Open quest briefing": "เปิดคำชี้แจง",
  "Resume quest": "ทำภารกิจต่อ",
  "Quest rules": "กติกา",
  "Before you begin": "ก่อนเริ่ม",
  "This reviews reasoning; it does not certify clinical skill.": "เกมนี้ทบทวนการให้เหตุผล ไม่ใช่การรับรองทักษะทางคลินิก",
  "Four reference cards stay available during cases.": "เปิดบัตรอ้างอิง 4 ใบได้ตลอดเคส",
  "Download once to continue without a connection.": "ดาวน์โหลดหนึ่งครั้งเพื่อเรียนต่อแบบ offline",
  "QUEST BOARD · 15 TOTAL DECISIONS": "กระดานภารกิจ · รวม 15 การตัดสินใจ",
  "Three patients. Three clinical quests.": "ผู้ป่วย 3 ราย ภารกิจคลินิก 3 เรื่อง",
  "Each patient quest reveals evidence step by step. A missed choice opens a retry within the same quest decision.": "แต่ละภารกิจจะเปิดเผยข้อมูลทีละขั้น หากตอบพลาดจะมีการแก้ตัวภายในขั้นเดิม ไม่เพิ่มจำนวนข้อ",
  "Accept quest": "รับภารกิจ",
  "Not started": "ยังไม่เริ่ม",
  "In progress": "กำลังทำ",
  "Reviewed": "ทบทวนแล้ว",
  "quest steps": "ขั้นภารกิจ",
  "New clue discovered": "พบข้อมูลใหม่",
  "Confidence": "ความมั่นใจ",
  "low": "น้อย",
  "medium": "ปานกลาง",
  "high": "มาก",
  "One sentence is enough": "เขียนสั้น ๆ หนึ่งประโยคก็พอ",
  "Lock in action": "ยืนยันการตัดสินใจ",
  "Saving…": "กำลังบันทึก…",
  "Safety badge available": "มี safety badge ให้ปลดล็อก",
  "QUEST RESULT · AUTHORED FEEDBACK": "ผลภารกิจ · feedback ที่อาจารย์เขียนไว้",
  "Preferred action · reward unlocked": "แนวทางที่เหมาะสม · ได้รับ reward",
  "Retry available": "แก้ตัวได้ในขั้นเดิม",
  "Your first action": "คำตอบครั้งแรก",
  "Preferred action": "แนวทางที่เหมาะสม",
  "Collect reward": "รับ reward",
  "Open same-step retry": "แก้ตัวในขั้นเดิม",
  "QUEST STEP CLEARED": "ผ่านขั้นภารกิจ",
  "Reveal next clue": "เปิดข้อมูลถัดไป",
  "Return to quest board": "กลับกระดานภารกิจ",
  "Enter team debrief": "เข้าสู่การสรุปกับทีม",
  "Give one short reason, or write ‘I am unsure’.": "ให้เหตุผลสั้น ๆ หรือเขียนว่า ‘ยังไม่แน่ใจ’",
  "Reference inventory": "คลังบัตรอ้างอิง",
  "How the game works": "วิธีเล่นเกม",
  "QUEST BRIEFING · 3 MIN": "คำชี้แจงภารกิจ · 3 นาที",
  "Open reference inventory": "เปิดคลังบัตรอ้างอิง",
  "Offline": "ออฟไลน์",
  "Online": "ออนไลน์",
  "DEMO · fictional records": "DEMO · ข้อมูลสมมติ",
  "CONNECTED": "เชื่อมต่อแล้ว",
  "Game by Sorawut Thamyongkit": "สร้างโดย Sorawut Thamyongkit"
};

export function t(text: string, language: Language) {
  return language === "th" ? (uiThai[text] ?? text) : text;
}

const missionThai: Record<string, Pick<Mission, "title" | "entry">> = {
  "mission-1": { title: "ผู้ป่วยที่ระบบไหลเวียนไม่คงที่", entry: "ผู้ป่วยสมมติอายุ 24 ปี ประสบอุบัติเหตุรถจักรยานยนต์ 35 นาทีก่อน มีอาการปวดเชิงกราน ปลายมือเท้าเย็น HR 132/min และ BP 82/50 mmHg ทางเดินหายใจโล่ง คุณเป็นนักศึกษาแพทย์ที่ทำงานภายใต้การกำกับ และต้องระลึกว่าแหล่งเลือดออกอาจไม่ได้มีเพียงเชิงกราน" },
  "mission-2": { title: "ผู้ป่วยที่ดูเหมือน stable", entry: "ผู้ป่วยสมมติอายุ 40 ปี ถูกรถชน ขณะนี้ physiology stable หลังการประเมิน แต่ยังปวด posterior pelvis ภารกิจนี้ใช้คำบรรยายภาพที่มีป้ายกำกับ ไม่ใช่การแปลผลภาพที่หายไป" },
  "mission-3": { title: "การบาดเจ็บเปิดที่ซ่อนอยู่", entry: "ผู้ป่วยชายสมมติอายุ 32 ปี หลัง crush injury มี pelvic ring injury แผลเล็กบริเวณ perineum โดยไม่เห็นกระดูก และมีเลือดที่ urethral meatus ระบบไหลเวียนดีขึ้นแต่ยังต้องเฝ้าระวัง ไม่จำเป็นต้องใช้ภาพถ่ายบริเวณอ่อนไหว" }
};

type NodeTranslation = {
  stem: string; facts: string[]; question: string; options: [string, string, string]; reasons: [string, string, string]; textAlternative: string;
};

const nodeThai: Record<string, NodeTranslation> = {
  M1N1: { stem: missionThai["mission-1"].entry, facts: ["กลไกพลังงานสูง", "ปวดเชิงกราน", "ปลายมือเท้าเย็น", "ทางเดินหายใจโล่ง"], question: "อะไรควรเป็นตัวกำหนดการดำเนินการถัดไป?", options: ["ระบุ fracture subtype อย่างละเอียดก่อน", "สงสัย major haemorrhage ร่วมกับ physiological compromise", "พิจารณาเฉพาะ pain score"], reasons: ["การตั้งชื่อชนิดกระดูกหักไม่ควรทำให้การประเมินและ escalation เร่งด่วนล่าช้า", "ข้อมูล physiology ต้องได้รับการประเมินและ escalation เร่งด่วนสำหรับ possible major haemorrhage", "ความปวดสำคัญ แต่ไม่ตอบโจทย์ภัยคุกคามต่อระบบไหลเวียน"], textAlternative: "ไม่ต้องใช้ภาพ ให้ใช้ข้อมูลทางคลินิกที่ระบุ" },
  M1N2: { stem: "physiology ที่น่ากังวลยังคงอยู่ ขณะที่ทีมทำ trauma assessment ต่อเนื่อง", facts: ["สงสัย major haemorrhage", "ยังต้องประเมินภัยคุกคามและแหล่งเลือดออกอื่น"], question: "ชุดการดำเนินการทันทีใดเหมาะสมที่สุด?", options: ["ทำ CT ให้เสร็จก่อนเรียก senior team", "ตรวจ pelvic stability ซ้ำจนเห็นรูปแบบชัด", "ทำ primary survey ต่อ เปิดใช้ trauma/haemorrhage support และจัด temporary stabilization ตามข้อบ่งชี้"], reasons: ["อาจทำให้การดูแลล่าช้าขณะ physiology ไม่คงที่", "การกระตุ้นตรวจซ้ำไม่แก้ภัยคุกคามทันทีและอาจทำอันตราย", "assessment, resuscitation, escalation และ stabilization ที่มีข้อบ่งชี้ทำคู่ขนานกันได้"], textAlternative: "ข้อมูลข้อความครบถ้วน" },
  M1N3: { stem: "ทีมพิจารณาว่ามีข้อบ่งชี้ใช้ pelvic binder คำถามนี้ประเมินการระบุตำแหน่ง ไม่ใช่ทักษะการใส่", facts: ["มีข้อบ่งชี้ใช้ binder ตาม local pathway"], question: "ควรวางกึ่งกลาง binder ที่ระดับใด?", options: ["Iliac crests", "Greater trochanters", "Umbilicus"], reasons: ["ตำแหน่งนี้สูงเกินไป", "ระดับที่ต้องการคือ greater trochanters", "ตำแหน่งนี้สูงเกินไป"], textAlternative: "เลือกระหว่างระดับกายวิภาคที่ระบุ ไม่ต้องใช้ภาพ" },
  M1N4: { stem: "เริ่มมาตรการเบื้องต้นแล้ว แต่ BP ยังต่ำ การทำ CT ต้องเคลื่อนผู้ป่วยออกจาก resuscitation area", facts: ["physiological compromise ยังไม่แก้ไข", "CT อยู่ห่างจาก resuscitation"], question: "แผนถัดไปที่เหมาะสมที่สุดในสถานการณ์นี้คืออะไร?", options: ["ส่ง CT ตามปกติทันที", "เฝ้าดูอย่างเดียว", "ทำ resuscitation ต่อและวางแผน haemorrhage control เร่งด่วนกับ senior team"], reasons: ["การเคลื่อนย้ายไกลอาจทำให้ล่าช้าอย่างไม่ปลอดภัย", "การเฝ้าดูอย่างเดียวไม่แก้ภาวะที่ยังไม่คงที่", "การรักษาและ escalation ต้องดำเนินต่อ ส่วน imaging ขึ้นกับ physiology, response และศักยภาพของสถานพยาบาล"], textAlternative: "ข้อมูลข้อความครบถ้วน" },
  M1N5: { stem: "BP ดีขึ้นชั่วครู่แล้วลดลงอีก นี่เป็นข้อมูลที่กำหนดไว้เพื่อการสอน ไม่ใช่ผลคำนวณจากคำตอบก่อนหน้า", facts: ["ตอบสนองชั่วคราว", "ยังต้องคิดถึงแหล่งเลือดออกอื่น"], question: "การตอบสนองนี้หมายถึงอะไร?", options: ["ควบคุมเลือดออกได้แล้ว", "ภาวะที่ยังไม่คงที่ต้องประเมินซ้ำและ escalation", "ยืนยันว่าหลอดเลือด pelvic artery เส้นหนึ่งกำลังเลือดออก"], reasons: ["การตอบสนองสั้น ๆ ไม่ยืนยันว่าควบคุมได้", "แนวโน้มยังน่ากังวลและต้องประเมินซ้ำพร้อม escalation", "แนวโน้มนี้ระบุแหล่งเลือดออกจำเพาะไม่ได้"], textAlternative: "ข้อมูลข้อความครบถ้วน" },
  M1N6: { stem: "ทีมรับต่อจำเป็นต้องได้ referral ที่กระชับ ขณะที่การดูแลเร่งด่วนดำเนินต่อ", facts: ["กลไกพลังงานสูง", "แนวโน้ม physiology ที่น่ากังวล", "การดำเนินการเบื้องต้นและ response"], question: "referral ใดมีประโยชน์ที่สุดตอนนี้?", options: ["‘Pelvis fracture, please review.’", "บอกเฉพาะ fracture classification", "บอกกลไก แนวโน้ม physiology การดำเนินการ response ข้อกังวล และคำขอเร่งด่วน"], reasons: ["ขาดข้อมูลสำคัญต่อการตัดสินใจและความเร่งด่วน", "classification อย่างเดียวขาด physiology และ response", "ทีมรับต่อได้ข้อมูลปัญหาปัจจุบัน ความเร่งด่วน และคำขอชัดเจน"], textAlternative: "ข้อมูลข้อความครบถ้วน" },
  M2N1: { stem: missionThai["mission-2"].entry, facts: ["physiology ปัจจุบัน stable", "ยังปวด posterior pelvis"], question: "เมื่อทบทวน AP pelvis ควรเริ่มจากอะไร?", options: ["ตรวจคุณภาพภาพ orientation และสถานะ binder", "เดา subtype รายละเอียดทันที", "ถือว่าภาพที่ดูปกติตัด injury ออกได้"], reasons: ["ต้องกำหนดบริบทและข้อจำกัดของภาพก่อน", "การตั้งชื่อก่อนทบทวนหลักฐานตามลำดับเร็วเกินไป", "ภาพอาจมีข้อจำกัดหรือได้รับผลจาก binder"], textAlternative: "ภารกิจ imaging ใช้คำบรรยาย ไม่มี diagnostic image" },
  M2N2: { stem: "รายงาน AP สมมติระบุ pubic rami fractures และความไม่สมมาตรบริเวณ sacroiliac", facts: ["พบ anterior ring injury", "พบความไม่สมมาตรบริเวณ posterior"], question: "กลยุทธ์การแปลผลที่ดีที่สุดคืออะไร?", options: ["หยุดทบทวนเมื่อพบ rami fractures", "พิจารณา anterior และ posterior ring ร่วมกัน", "ไม่สนใจ posterior pain"], reasons: ["เสี่ยงต่อการประเมิน pelvic ring ไม่ครบ", "หลักฐานทั้ง anterior และ posterior สำคัญ", "posterior pain เป็นข้อมูลที่เกี่ยวข้อง"], textAlternative: "รายงานข้อความ: pubic rami fractures ร่วมกับ sacroiliac-region asymmetry" },
  M2N3: { stem: "ค่าปัจจุบัน BP 122/76 mmHg", facts: ["ระบบไหลเวียนขณะนี้ดู physiologically stable", "หลักฐานด้านโครงสร้างยังไม่ครบ"], question: "ข้อมูลนี้ยืนยันว่า pelvic ring mechanically stable หรือไม่?", options: ["ใช่", "ไม่ เพราะ physiological stability และ mechanical stability เป็นคนละการประเมิน", "heart rate เพียงอย่างเดียวกำหนด mechanical stability"], reasons: ["BP ขณะหนึ่งไม่ยืนยัน structural stability", "ต้องประเมินระบบไหลเวียนและโครงสร้างแยกกัน", "heart rate เป็นข้อมูล physiology ไม่ใช่หลักฐานโครงสร้าง"], textAlternative: "ข้อมูลข้อความครบถ้วน" },
  M2N4: { stem: "ผู้ป่วยยังอยู่ในการเฝ้าระวังและ physiologically stable แต่ยังมี posterior pain และ AP findings ที่น่ากังวล มี binder อยู่ และสามารถทำ CT กับ specialist review ได้อย่างเหมาะสม", facts: ["คงความ stable ภายใต้การเฝ้าระวัง", "ยังมี posterior concern", "ภาพขณะใส่ binder อาจบดบัง displacement", "เข้าถึง imaging ได้อย่างปลอดภัย"], question: "แผนใดเหมาะสมที่สุด?", options: ["ถอด binder ทันทีเพราะภาพแรกดู reassuring", "ทำ provocative pelvic examination ซ้ำ", "เฝ้าระวังต่อ ทำ imaging และ specialist review ที่เหมาะสม และใช้แผน reassessment/ถอด binder ที่ตกลงกับ senior team"], reasons: ["binder อาจลดและบดบัง disruption จึงต้องมีแผนถอดที่ตกลงกัน", "การตรวจแบบ provocative ซ้ำไม่ปลอดภัยและไม่ตอบคำถาม imaging", "สอดคล้องกับบริบท stable ภายใต้ monitoring ข้อจำกัดของภาพ และ senior reassessment"], textAlternative: "ข้อมูลข้อความครบถ้วน" },
  M2N5: { stem: "คุณต้องอธิบายสิ่งที่ทราบและสิ่งที่ยังไม่แน่ชัด", facts: ["พบ anterior injury", "posterior involvement และ stability ยังต้องชี้แจง"], question: "คำอธิบายใดเหมาะกับหลักฐานที่มีมากที่สุด?", options: ["‘BP ปกติจึงเป็น injury เล็กน้อย’", "‘เห็น anterior injury; posterior involvement และ stability ยังต้องชี้แจง’", "‘fracture แบบนี้ทุกกรณีต้องผ่าตัดเหมือนกัน’"], reasons: ["สับสนระหว่าง physiology ปัจจุบันกับความรุนแรงของ injury", "ระบุทั้งสิ่งที่ทราบและ uncertainty ที่เหลือ", "definitive treatment ไม่เหมือนกันทุกกรณีและสรุปจากข้อมูลนี้ไม่ได้"], textAlternative: "ข้อมูลข้อความครบถ้วน" },
  M3N1: { stem: missionThai["mission-3"].entry, facts: ["แผลเล็กบริเวณ perineum", "ไม่เห็นกระดูก", "pelvic ring injury"], question: "การแปลผลใดปลอดภัยที่สุด?", options: ["เป็น closed injury แน่นอนเพราะไม่เห็นกระดูก", "possible open injury ต้องได้รับการประเมินเร่งด่วน", "รอให้ติดเชื้อก่อนจึงประเมินแผล"], reasons: ["การไม่เห็นกระดูกไม่ได้ตัด communication", "แผลทำให้ต้องสงสัยและประเมินอย่างเหมาะสมโดยไม่กล่าวเกินหลักฐาน", "การรอ infection ทำให้การประเมินที่จำเป็นล่าช้า"], textAlternative: "คำบรรยายข้อความใช้แทนภาพถ่ายบริเวณอ่อนไหว" },
  M3N2: { stem: "พบเลือดที่ urethral meatus เพื่อนร่วมงานเสนอให้ใส่สายสวนแบบ blind ซ้ำ", facts: ["meatal bleeding เป็น warning sign", "ยังไม่ทราบชนิด urethral injury ที่แน่ชัด"], question: "การตอบสนองใดเหมาะสมที่สุด?", options: ["เห็นด้วยกับการทำ blind attempts ซ้ำ", "ไม่ต้องประเมินระบบปัสสาวะ", "หยุด blind attempts และ escalation เข้าสู่ urethral evaluation/drainage pathway"], reasons: ["การทำ blind attempts ซ้ำเสี่ยงเพิ่มอันตราย", "ละเลย warning ของ associated injury", "สื่อสารข้อกังวล และให้ทีมรักษาตัดสิน timing/drainage ตาม local pathway"], textAlternative: "ข้อมูลข้อความครบถ้วน" },
  M3N3: { stem: "trauma care ดำเนินต่อพร้อมประสานการดูแลแผลและ urinary concerns", facts: ["possible open injury", "suspected urethral injury", "ผู้เรียนอยู่ภายใต้การกำกับ"], question: "แผนใดเหมาะสมที่สุด?", options: ["ดูแลแผลอย่างเดียวโดยไม่ทบทวน trauma ต่อ", "ทำ trauma care ต่อ ประเมินแบบ multidisciplinary เร่งด่วน และใช้ local open-injury pathway", "นักศึกษาตรวจแผลด้วยการ probe เอง"], reasons: ["ไม่ครบและละเลย trauma กับ urinary concerns", "คง trauma priorities พร้อม escalation ของ associated injury", "การ probe เกินบทบาทผู้เรียนและอาจทำอันตราย"], textAlternative: "ข้อมูลข้อความครบถ้วน" },
  M3N4: { stem: "เตรียม focused referral ที่สื่อสารความกังวลโดยไม่อ้าง diagnosis ที่ยังไม่ยืนยัน", facts: ["possible open pelvic injury", "suspected urethral injury", "physiology ปัจจุบันและความเร่งด่วน"], question: "referral ใดสะท้อน uncertainty ได้ดีที่สุด?", options: ["‘ยืนยัน complete urethral transection แล้ว’", "‘ไม่มีข้อกังวลเพราะ BP ดีขึ้น’", "‘มี possible open pelvic injury และ suspected urethral injury; นี่คือ physiology ปัจจุบันและคำขอ urgent review’"], reasons: ["กล่าวเกินสิ่งที่ warning sign หนึ่งอย่างยืนยันได้", "BP ที่ดีขึ้นไม่ลบ wound และ urinary concerns", "สื่อสารข้อกังวลตามหลักฐาน สถานะปัจจุบัน และคำขอชัดเจน"], textAlternative: "ข้อมูลข้อความครบถ้วน" }
};

export function localizeMission(mission: Mission, language: Language): Mission {
  if (language === "th" && [REVISION_ID, LEARNING_VERSION].includes(mission.contentVersion ?? "")) return { ...mission, ...revisedMissionThai[mission.id] };
  return language === "th" && missionThai[mission.id] ? { ...mission, ...missionThai[mission.id] } : mission;
}

export function localizeNode(node: Node, language: Language): Node {
  if (node.contentVersion === FOCUSED_VERSION && language === "th") return { ...node, stem: node.translation!.story.th, question: node.translation!.title.th, teaching: teachingThaiById.get(node.id) ?? node.teaching };
  if(node.translation)return {...node,stem:node.translation.story[language],question:node.translation.title[language],teaching:node.teaching?{...node.teaching,keyMessage:node.translation.key[language],suggestedFeedback:node.translation.key[language]}:undefined};
  const revision = (node.contentVersion === LEARNING_VERSION ? learningRevisionById : revisionById).get(node.id);
  if (language === "th" && [REVISION_ID, LEARNING_VERSION].includes(node.contentVersion) && revision) {
    const copy = revision.th;
    return { ...node, ...(node.contentVersion===LEARNING_VERSION?{teaching:teachingThaiById.get(node.id)}:{}), stem: copy.stem, factsAvailableNow: copy.facts, question: copy.question, scenePhase: copy.phase, textAlternative: "ใช้ข้อมูลของเคส ภาพตัวอย่างการสอนไม่ใช่ภาพของผู้ป่วยสมมติรายนี้", rationalePrompt: node.explanationBeforeChoices ? "ก่อนดูตัวเลือก: เขียนเหตุผลเชื่อม findings, priorities และ uncertainty สั้น ๆ" : node.rationaleRequired ? "เพิ่มเหตุผลหรือความไม่แน่ใจใน handover สั้น ๆ" : "บันทึกเพิ่มเติมได้ตามต้องการ", options: node.options.map((option, index) => ({ ...option, text: copy.choices[index], explanation: `${index === revision.key ? "แนะนำ" : "เหตุผลที่ไม่เลือก"}: ${copy.reasons[index]}` })) };
  }
  const value = nodeThai[node.id];
  if (language !== "th" || !value) return node;
  return {
    ...node,
    stem: value.stem,
    factsAvailableNow: value.facts,
    question: value.question,
    textAlternative: value.textAlternative,
    rationalePrompt: uiThai["Give one short reason, or write ‘I am unsure’."] ,
    options: node.options.map((option, index) => ({
      ...option,
      text: value.options[index],
      explanation: `${node.correctOptionIds.includes(option.id) ? "แนะนำ: " : "เหตุผลที่ไม่เลือก: "}${value.reasons[index]}`
    }))
  };
}

const correctionThai: Record<string, { stem: string; options: [string, string, string] }> = {
  M1N1_R: { stem: "ผู้ป่วยอุบัติเหตุพลังงานสูงยัง hypotensive และปลายมือเท้าเย็น ระหว่างชี้แจงรายละเอียด injury อะไรควรกำหนดการดูแล?", options: ["รอชื่อ subtype", "escalation เรื่อง possible haemorrhage พร้อมประเมินต่อ", "รักษาเฉพาะ pain score"] },
  M1N2_R: { stem: "กำลังเรียก senior trauma team งานคู่ใดทำพร้อมกันได้?", options: ["ทำ primary survey ต่อพร้อม resuscitation และ stabilization ที่มีข้อบ่งชี้", "หยุด monitoring และรอ", "ทำ pelvic compression ซ้ำและเลื่อน escalation"] },
  M1N3_R: { stem: "มีคำบรรยายว่า binder อยู่ระดับเอว ควรตอบอย่างไร?", options: ["ยอมรับว่าเอวถูกต้อง", "ย้ายไป umbilicus", "ขอให้ผู้มีทักษะทบทวนและแก้ให้อยู่ระดับ greater trochanters ขณะดูแลต่อ"] },
  M1N4_R: { stem: "เทียบผู้ป่วย X ที่ BP ต่ำต่อเนื่องและ CT ไกล กับ Y ที่ตอบสนองต่อเนื่องและเข้า CT แบบ monitored ได้ หลักการใดถูกต้อง?", options: ["ทั้งคู่ต้องมี timing imaging เหมือนกัน", "physiology, response และ capability กำหนด imaging ขณะรักษาต่อ", "CT ต้องมาก่อน resuscitation เสมอ"] },
  M1N5_R: { stem: "handover ระบุว่า BP สูงขึ้นชั่วครู่แล้วลดลง ข้อมูลใดช่วยได้?", options: ["physiology ปัจจุบัน treatment response และแหล่งเลือดออกอื่นที่กังวล", "ชื่อ fracture เท่านั้น", "ยืนยัน artery หนึ่งเส้นว่าเลือดออก"] },
  M1N6_R: { stem: "‘Pelvic fracture after a collision’ คือ referral ทั้งหมด ควรเติมอะไรก่อน?", options: ["คำศัพท์ตกแต่ง", "subtype ที่มั่นใจขึ้นโดยไม่มีหลักฐาน", "แนวโน้ม physiology การดำเนินการ response และคำขอเร่งด่วน"] },
  M2N1_R: { stem: "รายงาน fracture แต่ไม่ระบุคุณภาพภาพหรือ binder ขาดอะไร?", options: ["ไม่ขาด", "บริบทสำหรับแปลผลภาพและข้อจำกัด", "หลักฐานว่า posterior structures ปกติทั้งหมด"] },
  M2N2_R: { stem: "รายงาน rami fractures ร่วมกับ sacroiliac asymmetry ยังต้องชี้แจงบริเวณใด?", options: ["posterior ring และ sacroiliac region", "ไม่ต้องเพิ่ม", "ผิวหนังบริเวณเข่าเท่านั้น"] },
  M2N3_R: { stem: "vital signs ปัจจุบันปกติ ข้อใดยังไม่แน่ชัด?", options: ["มีชีพจรหรือไม่", "วัด BP หรือไม่", "pelvic ring mechanically stable หรือไม่"] },
  M2N4_R: { stem: "ยังมี binder และ AP ภาพแรกดู reassuring ขั้นต่อไปควรยึดอะไร?", options: ["ถอดทันทีเพราะภาพดูปกติ", "ขอ senior reassessment และทำตามแผน imaging/ถอด binder ที่ตกลง ขณะ monitoring ต่อ", "กดเชิงกรานซ้ำเพื่อพิสูจน์ stability"] },
  M2N5_R: { stem: "แทนข้อความ ‘BP ปกติ จึงไม่มีอะไรสำคัญต้องประเมิน’", options: ["‘พบ anterior injury และ posterior findings ที่ยังไม่ชัด ต้องประเมินต่อพร้อม monitoring physiology’", "‘fracture ทุกแบบต้องผ่าตัดเหมือนกัน’", "‘posterior pain ไม่สำคัญ’"] },
  M3N1_R: { stem: "พบแผล perineum เล็กใน pelvic trauma และไม่เห็นกระดูก ตัด open injury ได้หรือไม่?", options: ["ได้", "ขนาดแผลกำหนดทั้งหมด", "ไม่ได้; possible communication ต้องประเมินเร่งด่วน"] },
  M3N2_R: { stem: "มี meatal bleeding หลัง pelvic trauma นักศึกษาควรตอบอย่างปลอดภัยอย่างไร?", options: ["ลอง blind catheterization ต่อ", "escalation suspected urethral injury เพื่อวางแผน evaluation/drainage", "วินิจฉัย complete transection จาก sign นี้"] },
  M3N3_R: { stem: "referral กล่าวเฉพาะ ring fracture แต่ไม่กล่าวถึงแผลและ urinary finding ต้องเพิ่มอะไร?", options: ["possible open injury และ suspected urethral injury พร้อม physiology ปัจจุบัน", "final fracture code เท่านั้น", "ไม่ต้องเพิ่ม"] },
  M3N4_R: { stem: "แทนข้อความ ‘ยืนยัน complete urethral transection เพราะเห็นเลือด’", options: ["‘ไม่มี urinary concern’", "‘BP ดีขึ้นจึงไม่ต้องทบทวน’", "‘สงสัย urethral injury ขอ urgent assessment พร้อมสื่อสาร physiology และ wound concerns’"] }
};

export function localizeCorrection(item: CorrectionItem, language: Language): CorrectionItem {
  const revision = item.parentNodeId ? (item.contentVersion === LEARNING_VERSION ? learningRevisionById : revisionById).get(item.parentNodeId) : undefined;
  if (language === "th" && [REVISION_ID, LEARNING_VERSION].includes(item.contentVersion ?? "") && revision) return { ...item, stem: revision.th.retry, options: item.options.map((option, index) => ({ ...option, text: revision.th.retryChoices[index], explanation: `${index === revision.retryKey ? "แนะนำ" : "เหตุผลที่ไม่เลือก"}: ${revision.th.retryReasons[index]}` })), workedExample: `${revision.th.retryChoices[revision.retryKey]} ${revision.th.retryReasons[revision.retryKey]}` };
  const value = correctionThai[item.id];
  if (language !== "th" || !value) return item;
  return { ...item, stem: value.stem, options: item.options.map((option, index) => ({ ...option, text: value.options[index] })), workedExample: `ทบทวน ${item.resourceId} แล้วเลือกคำตอบที่ปลอดภัยที่สุดตามข้อมูลที่มี` };
}

const resourceThai: Record<string, { title: string; body: string[]; selfPrompt?: string }> = {
  R1: { title: "Pelvic ring หลักฐาน และ stability", body: ["Pelvic ring มีส่วน anterior และ posterior เมื่อพบ anterior fracture ควรทบทวน ring ส่วนที่เหลืออย่างเป็นระบบ กลไกช่วยคาดการณ์ปัญหา แต่ไม่ได้ยืนยันสภาวะปัจจุบัน", "ทบทวน AP pelvis ตามลำดับ: คุณภาพและ orientation ของภาพ, มี binder หรือไม่, alignment, anterior structures รวม pubic rami/symphysis และ posterior clues ที่ sacrum/sacroiliac region ระบุสิ่งที่เห็นและ uncertainty", "Physiological stability คือระบบไหลเวียนและ response ตามเวลา ส่วน mechanical stability คือโครงสร้างที่บาดเจ็บ BP ปกติครั้งหนึ่งไม่ยืนยันว่า ring ปกติหรือ mechanically stable", "ใช้คำกลไกกว้าง ๆ เพื่อจัดระบบการเรียน แต่อย่าให้การหา subtype ทำให้ assessment และ escalation เร่งด่วนล่าช้า"], selfPrompt: "ฉันรู้อะไรเกี่ยวกับ circulation, ring และหลักฐานใดยังขาด?" },
  R2: { title: "ลำดับความสำคัญ การประเมินที่ปลอดภัย และ associated injuries", body: ["ใช้ structured trauma assessment สังเกต physiology และแนวโน้มที่น่ากังวล ประเมินภัยคุกคามอื่น และเรียก senior trauma/haemorrhage support เร็ว การ resuscitation และ temporary stabilization ที่มีข้อบ่งชี้ทำพร้อม assessment ได้", "การตัดสินใจ imaging ขึ้นกับ physiological response และความสามารถดูแลอย่างปลอดภัย ผู้ป่วยที่ยัง unstable และ CT อยู่ไกลย่อมต่างจากผู้ป่วย monitored ที่ตอบสนองต่อเนื่อง", "นักศึกษาไม่ควรทำ provocative pelvic compression ซ้ำ แผล perineum อาจเชื่อมกับ pelvic injury แม้ไม่เห็นกระดูก ต้องสื่อสารและขอ urgent review ไม่ probe แผลเอง", "เลือดที่ urethral meatus เป็น warning sign ให้หยุด blind attempts และ escalation สู่ evaluation/drainage pathway ที่เหมาะสม sign เพิ่มความสงสัยแต่ไม่ยืนยัน injury เฉพาะ"], selfPrompt: "อะไรต้องทำตอนนี้ อะไรทำคู่ขนานได้ และข้อกังวลใดต้องสื่อสารชัดเจน?" },
  R3: { title: "การให้เหตุผลเรื่อง binder และ reassessment", body: ["เมื่อมีข้อบ่งชี้ใช้ binder ตาม local pathway ตำแหน่งสำคัญ กึ่งกลางควรอยู่ระดับ greater trochanters ไม่ใช่เอว iliac crests หรือ umbilicus โมดูลนี้ประเมินการระบุตำแหน่ง ไม่ใช่ทักษะการใส่", "Binder อาจลด displacement และบดบัง injury บนภาพ AP ที่ดูปกติขณะมี binder ไม่ตัด ring injury และไม่ใช่เหตุให้ถอดทันที ต้องสื่อสารการมี binder และขอแผน senior reassessment, imaging และ removal", "ประเมิน physiology และ response ซ้ำ การดีขึ้นชั่วคราวไม่ยืนยันว่าควบคุมเลือดออกหรือระบุ vessel ได้ หาก binder สูงเกินไป ให้ขอผู้มีทักษะทบทวนและแก้ขณะดูแลเร่งด่วนต่อ"], selfPrompt: "ตำแหน่งเหมาะสมหรือไม่ binder กระทบการแปลผลอย่างไร และแผน reassessment คืออะไร?" },
  R4: { title: "การตัดสินใจและ specialist consultation", body: ["ระบุภัยคุกคามจาก physiology, mechanism และ trend ทำ structured assessment พร้อม treatment/escalation แยก physiological กับ mechanical stability ทบทวน anterior/posterior evidence ระบุ wound/urinary concerns หลีกเลี่ยง repeated testing หรือ blind attempts ที่อาจเป็นอันตราย", "การปรึกษาหรือส่งต่อ specialist ควรบอกกลไก physiology และ trend ปัจจุบัน ผลตรวจและ imaging, associated-injury concerns, การรักษาที่เริ่มแล้ว, response และความช่วยเหลือที่ต้องการ", "การฝึก consultation ไม่ใช่หลักฐานของ diagnosis หรือ procedural competence ผู้เรียนภายใต้การกำกับควรระบุ uncertainty และใช้ local referral pathway"] },
  ORIENTATION: { title: "วิธีเล่นเกม", body: ["คุณเข้าร่วม trauma team ในฐานะนักศึกษาแพทย์ภายใต้การกำกับ ในแต่ละจุดให้ทบทวนข้อมูลที่มี เลือกการดำเนินการ ระบุความมั่นใจ และให้เหตุผลสั้น ๆ เปิดบัตรอ้างอิงได้ อ่าน feedback และแก้การตัดสินใจที่ยังไม่แน่ใจ การหยุดพักไม่เสียคะแนน", "ตัวอย่าง: referral มีเพียงชื่อ fracture ควรเพิ่มอะไร? แนวทางที่เหมาะสมคือ physiology ปัจจุบันและคำขอ เพราะทีมรับต่อจำเป็นต้องทราบสถานการณ์และสิ่งที่ต้องการ ตัวอย่างนี้ไม่คิดคะแนน", "การทำครบหมายถึงทบทวนข้อกำหนดการเรียน ไม่ได้รับรองทักษะปฏิบัติหรือการดูแล trauma อย่างอิสระ"] }
};

export function localizeResource(resource: Resource, language: Language): Resource {
  if (language === "th" && [REVISION_ID, LEARNING_VERSION].includes(resource.contentVersion ?? "") && resource.id === "ORIENTATION") return { ...resource, title: "วิธีเล่นเกม", body: ["เดินเข้าหาผู้ป่วย อ่าน team update และเลือก action เปิด patient chart และบัตรอ้างอิงได้ตลอด บันทึกและความมั่นใจเป็นตัวเลือก ยกเว้นเหตุผลหรือ uncertainty สั้น ๆ ใน handover ของแต่ละเคส", "อ่าน feedback และแก้คำตอบในขั้นเดิม เก็บ safety badges, case stamps และ reward เพื่อปลดล็อกชุด 5 ระดับ เรียนผ่านการแก้ตัวก็ไปถึงชุดระดับสูงสุดได้", "ทำครบ 3 เรื่องราว ทบทวน handovers และจบเวร เกมฝึกการให้เหตุผลภายใต้การกำกับ ไม่รับรอง independent trauma care หรือ procedural competence"] };
  const value = resourceThai[resource.id];
  return language === "th" && value ? { ...resource, ...value } : resource;
}

export const thaiCoverage = {
  missions: Object.keys(missionThai), nodes: Object.keys(nodeThai), corrections: Object.keys(correctionThai), resources: Object.keys(resourceThai)
};
