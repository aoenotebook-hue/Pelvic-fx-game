import { pelvicTraumaContentV3 as previous } from "./content.v3.ts";
import type { ContentVersion, Node, SafetyConceptId } from "../domain/types.ts";
import {
  MINIGAME_VERSION,
  type MiniGameSpec,
  type LocalText,
  type LOId,
} from "../games/spec.ts";
export const bi = (en: string, th: string): LocalText => ({ en, th });
type Card = MiniGameSpec["cards"][number];
const c = (
  id: string,
  en: string,
  th: string,
  icon = "pelvis",
  target?: string,
): Card => ({
  id,
  label: bi(en, th),
  icon,
  target,
  mistake: `misplaced_${id}`,
});
const s = (
  kind: MiniGameSpec["kind"],
  cards: Card[],
  extra: Partial<MiniGameSpec> = {},
): MiniGameSpec => ({
  kind,
  cards,
  instruction: bi("Build your answer, then check it.", "จัดคำตอบ แล้วกดตรวจ"),
  art: "pelvis",
  alt: bi(
    "Teaching schematic, not a diagnostic image",
    "แผนภาพเพื่อเรียน ไม่ใช่ภาพวินิจฉัย",
  ),
  mistake: "review_key_evidence",
  ...extra,
});
const pick = (cards: Card[], targets: string[], art = "team") =>
  s("card_pick", cards, { targets, count: targets.length, art });
const image = (cards: Card[], target: string) =>
  s("image_pick", cards, { targets: [target] });
const sort = (cards: Card[], bins: [string, string, string][]) =>
  s("card_sort", cards, {
    bins: bins.map(([id, en, th]) => ({ id, label: bi(en, th) })),
  });
const sequence = (cards: Card[], order: string[]) =>
  s("sequence", cards, { order, art: "team" });
const match = (pairs: [string, string, string, string][], art = "ligament") =>
  s(
    "memory_match",
    pairs.flatMap(([en, th, en2, th2], i) => [
      c(`p${i}a`, en, th, art, `p${i}`),
      c(`p${i}b`, en2, th2, art, `p${i}`),
    ]),
    { art },
  );
const combo = (rounds: MiniGameSpec[]) => ({ ...rounds[0], rounds });
const handover = (patient: number) =>
  s(
    "handover_builder",
    [
      c(
        "s",
        "Physiological threat / suspected injury",
        "physiology / สงสัยการบาดเจ็บ",
        "blood",
        "S",
      ),
      c(
        "b",
        "Mechanism and supplied vital-sign trend",
        "กลไกและแนวโน้ม vital signs",
        "body",
        "B",
      ),
      c(
        "a",
        "Actions, response and diagnostic uncertainty",
        "สิ่งที่ทำ response และความไม่แน่ชัด",
        "lab",
        "A",
      ),
      c(
        "r",
        patient === 3
          ? "Urgent general surgery + orthopaedics + urology"
          : "Urgent general surgery + orthopaedics",
        patient === 3
          ? "ขอ general surgery + ortho + urology ด่วน"
          : "ขอ general surgery + ortho ด่วน",
        "phone",
        "R",
      ),
      c(
        "trap",
        "Confirmed diagnosis without supporting evidence",
        "ยืนยัน diagnosis โดยไม่มีหลักฐาน",
        "pelvis",
      ),
    ],
    {
      art: "team",
      bins: ["S", "B", "A", "R"].map((id) => ({ id, label: bi(id, id) })),
      instruction: bi(
        "Place four supported snippets into SBAR. Leave unsupported claims out.",
        "วาง 4 ข้อความใน SBAR ไม่ใช้ข้อความที่ไม่มีหลักฐาน",
      ),
    },
  );
const shock = s("gauge", [], {
  art: "blood",
  range: [0, 2500],
  band: [1500, 2000],
  unit: "mL",
  instruction: bi(
    "Recall the source's Class III estimate, not a measured blood loss.",
    "ทบทวนค่าประมาณ Class III จากเอกสาร ไม่ใช่ปริมาณที่วัดจากผู้ป่วย",
  ),
});
const shockClasses = sort(
  [
    c(
      "I",
      "<750 mL (<15%); HR normal/slightly up; RR normal; SBP normal; urine normal",
      "<750 mL (<15%); HR ปกติ/เพิ่มเล็กน้อย RR ปกติ SBP ปกติ ปัสสาวะปกติ",
      "blood",
      "I",
    ),
    c(
      "II",
      "750–1500 mL (15–30%); HR >100; RR 20–30; SBP normal; urine 20–30 mL/h",
      "750–1500 mL (15–30%); HR >100 RR 20–30 SBP ปกติ ปัสสาวะ 20–30 mL/h",
      "blood",
      "II",
    ),
    c(
      "III",
      "1500–2000 mL (30–40%); HR >120; RR 30–40; SBP falls; urine 5–15 mL/h",
      "1500–2000 mL (30–40%); HR >120 RR 30–40 SBP ลด ปัสสาวะ 5–15 mL/h",
      "blood",
      "III",
    ),
    c(
      "IV",
      ">2000 mL (>40%); HR >140; RR >35; SBP falls greatly; minimal urine",
      ">2000 mL (>40%); HR >140 RR >35 SBP ลดมาก ปัสสาวะน้อยมาก",
      "blood",
      "IV",
    ),
  ],
  [
    ["I", "Class I", "Class I"],
    ["II", "Class II", "Class II"],
    ["III", "Class III", "Class III"],
    ["IV", "Class IV", "Class IV"],
  ],
);
const binder = combo([
  s(
    "hotspot",
    [
      c("crest", "Iliac crest", "Iliac crest", "body"),
      c("navel", "Umbilicus", "สะดือ", "body"),
      c("troch", "Greater trochanters", "Greater trochanters", "binder"),
    ],
    { targets: ["troch"], art: "body", mistake: "binder_iliac_crest" },
  ),
  s("gauge", [], {
    art: "binder",
    range: [0, 100],
    band: [40, 60],
    unit: "illustration only",
    instruction: bi(
      "Choose the illustrated snug band. This is NOT a pressure measurement.",
      "เลือกช่วงกระชับในภาพ ไม่ใช่ค่าความดันสำหรับใช้จริง",
    ),
    mistake: "binder_tightness",
  }),
  pick(
    [
      c(
        "all",
        "Apply initially in every suspected pelvic fracture",
        "ใส่ตั้งแต่แรกในผู้ป่วยทุกรายที่สงสัย pelvic fracture",
        "binder",
      ),
      c(
        "knees",
        "Slide it in under the knees, then move it up to the trochanters",
        "สอดใต้เข่า แล้วเลื่อนขึ้นไปที่ greater trochanter",
        "binder",
      ),
      c(
        "legs",
        "Legs internally rotated and adducted; pad between knees and ankles",
        "จัดขาหมุนเข้าและหุบเข้าหากัน รองผ้าระหว่างเข่าและข้อเท้า",
        "body",
      ),
      c(
        "wound",
        "Dress any wound under the binder first",
        "ทำแผลบริเวณที่จะใส่ binder ก่อน",
        "wound",
      ),
      c(
        "sheet",
        "No binder? Use a folded sheet tightened with 2 large clamps",
        "ไม่มี binder ใช้ผ้าปูเตียงพับรัดแล้วหนีบด้วย clamp ใหญ่ 2 ตัว",
        "binder",
      ),
      c(
        "crest",
        "Centre it on the iliac crests",
        "วางตรง iliac crest",
        "body",
      ),
      c(
        "days",
        "Leave it on for several days until surgery",
        "ใส่ค้างไว้หลายวันจนผ่าตัด",
        "binder",
      ),
    ],
    ["all", "knees", "legs", "wound", "sheet"],
    "binder",
  ),
]);
const resus = pick(
  [
    c("iv", "Two large-bore IVs (16/18G)", "IV ใหญ่ 2 เส้น (16/18G)", "iv"),
    c(
      "lab",
      "Labs, lactate and group match",
      "Labs, lactate และ group match",
      "lab",
    ),
    c(
      "fluid",
      "Crystalloid loading 2 L (e.g. 0.9% NSS), then reassess",
      "ให้ crystalloid 2 L (เช่น 0.9% NSS) แล้วประเมินซ้ำ",
      "fluid",
    ),
    c(
      "mtp",
      "Prepare MTP: RBC/FFP/platelets 1:1:1",
      "เตรียม MTP 1:1:1",
      "blood",
    ),
    c(
      "binder",
      "Pelvic binder now for suspected pelvic fracture",
      "ใส่ pelvic binder ทันทีเมื่อสงสัย pelvic fracture",
      "binder",
    ),
    c(
      "ct",
      "Transfer to CT before reassessment",
      "ไป CT ก่อน reassessment",
      "ct",
    ),
    c("repeat", "Repeat compression testing", "ตรวจ compression ซ้ำ", "body"),
    c(
      "foley",
      "Prioritise Foley before GU assessment",
      "ใส่ Foley ก่อนประเมิน GU",
      "foley",
    ),
    c("wait", "Wait for a film before escalating", "รอภาพก่อนแจ้งทีม", "lab"),
    c(
      "oral",
      "Choose fluid escalation from a single BP reading",
      "เลือกเพิ่ม fluid จาก BP ครั้งเดียว",
      "fluid",
    ),
  ],
  ["iv", "lab", "fluid", "mtp", "binder"],
);
const wound = sort(
  [
    c("fat", "Fat globules in a wound", "Fat globules ในแผล", "wound", "open"),
    c(
      "bone",
      "Bone visible in communicating wound",
      "กระดูกในแผลที่ติดต่อกับ fracture",
      "wound",
      "open",
    ),
    c(
      "pr",
      "Blood PR: suspect internal communication",
      "เลือด PR: สงสัย internal communication",
      "organ",
      "suspect",
    ),
    c(
      "pv",
      "Blood PV: suspect internal communication",
      "เลือด PV: สงสัย internal communication",
      "organ",
      "suspect",
    ),
    c(
      "peri",
      "Perineal or vaginal laceration near the fracture",
      "แผลฉีกขาดบริเวณ perineum หรือช่องคลอดใกล้ fracture",
      "wound",
      "open",
    ),
    c(
      "closed",
      "Intact skin; no communication found",
      "ผิวหนังปกติ ไม่พบ communication",
      "body",
      "closed",
    ),
    c(
      "ml",
      "Closed degloving with fluctuance",
      "Closed degloving คลำ fluctuation",
      "wound",
      "soft",
    ),
  ],
  [
    ["open", "Open communication evident", "พบแผลติดต่อ fracture"],
    [
      "suspect",
      "Suspect open injury — assess",
      "สงสัย open injury ต้องประเมิน",
    ],
    ["closed", "Closed findings", "ข้อมูลแบบ closed"],
    ["soft", "Morel–Lavallée", "Morel–Lavallée"],
  ],
);
const gu = pick(
  [
    c("stop", "No blind Foley attempt", "ไม่ใส่ Foley แบบ blind", "foley"),
    c("uro", "Urgent urology consultation", "ปรึกษา urology ด่วน", "phone"),
    c(
      "fast",
      "FAST; CT only when safe to transfer",
      "FAST; CT เมื่อย้ายได้ปลอดภัย",
      "ct",
    ),
    c(
      "bind",
      "Continue senior-led resuscitation/binder",
      "ดูแล resuscitation/binder กับทีม",
      "binder",
    ),
    c(
      "blind",
      "Blind Foley despite meatal blood",
      "ใส่ Foley แบบ blind แม้มีเลือด",
      "foley",
    ),
    c(
      "retry",
      "Let normal pelvic AP exclude GU injury",
      "ให้ pelvic AP ปกติตัด GU injury",
      "beam",
    ),
  ],
  ["stop", "uro", "fast", "bind"],
  "organ",
);
const unstable = sort(
  [
    c("si", "SI widening >5 mm", "SI กว้าง >5 mm", "pelvis", "unstable"),
    c("sym", "Symphysis >2.5 cm", "Symphysis >2.5 cm", "pelvis", "unstable"),
    c(
      "l5",
      "L5 transverse-process avulsion",
      "L5 TP avulsion",
      "pelvis",
      "unstable",
    ),
    c(
      "spine",
      "Ischial-spine avulsion",
      "Ischial-spine avulsion",
      "pelvis",
      "unstable",
    ),
    c(
      "tube",
      "Ischial-tuberosity avulsion",
      "Ischial-tuberosity avulsion",
      "pelvis",
      "unstable",
    ),
    c(
      "up",
      "Superior hemipelvis migration",
      "Hemipelvis เคลื่อนขึ้น",
      "force-vs",
      "unstable",
    ),
    c(
      "bp",
      "Normal current blood pressure",
      "BP ปัจจุบันปกติ",
      "blood",
      "alone",
    ),
  ],
  [
    [
      "unstable",
      "Mechanical instability clues",
      "ข้อมูล mechanical instability",
    ],
    ["alone", "Not proof by itself", "ไม่ยืนยันด้วยตัวเอง"],
  ],
);
const sourceAntibiotics = combo([
  sort(
    [
      c("g12", "Cefazolin 2 g IV", "Cefazolin 2 g IV", "antibiotic", "g12"),
      c(
        "g3",
        "Cefazolin + gentamicin 240 mg IV drip over 30 min",
        "Cefazolin + gentamicin 240 mg IV drip 30 นาที",
        "antibiotic",
        "g3",
      ),
      c(
        "g3c",
        "Cefazolin + gentamicin + penicillin G 2.4 MU IV",
        "Cefazolin + gentamicin + penicillin G 2.4 MU IV",
        "antibiotic",
        "g3c",
      ),
      c(
        "allergy",
        "Vancomycin (+ clindamycin for anaerobes) instead",
        "ใช้ vancomycin (+ clindamycin สำหรับ anaerobe) แทน",
        "antibiotic",
        "allergy",
      ),
    ],
    [
      ["g12", "Gustilo grade 1–2", "Gustilo grade 1–2"],
      ["g3", "Grade 3", "Grade 3"],
      ["g3c", "Grade 3, contaminated (farm)", "Grade 3 ปนเปื้อน (เช่น ไร่นา)"],
      ["allergy", "Penicillin allergy", "แพ้ penicillin"],
    ],
  ),
  pick(
    [
      c("tet", "Tetanus prophylaxis", "ป้องกันบาดทะยัก (tetanus)", "tetanus"),
      c(
        "deb",
        "Urgent surgical debridement",
        "ผ่าตัด debridement แผลโดยเร็ว",
        "team",
      ),
      c(
        "consult",
        "Consult orthopaedics (and other teams as needed)",
        "ปรึกษาออร์โธปิดิกส์ (และทีมอื่นตามจำเป็น)",
        "phone",
      ),
      c(
        "delay",
        "Wait for signs of infection before antibiotics",
        "รอมีอาการติดเชื้อก่อนให้ antibiotic",
        "wound",
      ),
      c(
        "close",
        "Close the wound tightly in the ER",
        "เย็บปิดแผลให้แน่นในห้องฉุกเฉิน",
        "wound",
      ),
    ],
    ["tet", "deb", "consult"],
    "wound",
  ),
  s("gauge", [], {
    range: [0, 360],
    band: [0, 180],
    unit: "min",
    art: "antibiotic",
    instruction: bi(
      "By when (after injury) should IV antibiotics be started?",
      "ควรเริ่มให้ antibiotic ทางหลอดเลือดภายในกี่นาทีหลังบาดเจ็บ?",
    ),
    mistake: "late_antibiotics",
  }),
]);
type Row = {
  id: string;
  title: LocalText;
  game: MiniGameSpec;
  lo: LOId[];
  page: number;
  doc?: "S" | "H";
  key: LocalText;
  note?: string;
  concepts?: SafetyConceptId[];
  /** Shown to learners under "Why?" when a newer guideline differs from the lecture. */
  guideline?: LocalText;
  /** A must-pass safety item in the post-test pass standard. */
  mustPass?: boolean;
};
const r = (
  id: string,
  en: string,
  th: string,
  game: MiniGameSpec,
  lo: LOId[],
  page: number,
  key: LocalText,
  extra: Partial<Row> = {},
): Row => ({ id, title: bi(en, th), game, lo, page, key, ...extra });
export const practiceRows: Row[] = [
  r(
    "C0S1",
    "Find the pelvic landmarks",
    "หา landmark ของ pelvis",
    s(
      "hotspot",
      [
        c("ilium", "Ilium", "Ilium"),
        c("ischium", "Ischium", "Ischium"),
        c("pubis", "Pubis", "Pubis"),
        c("sacrum", "Sacrum", "Sacrum"),
        c("sym", "Symphysis", "Symphysis"),
        c("si", "SI joint", "SI joint"),
      ],
      {
        targets: ["ilium", "ischium", "pubis", "sacrum", "sym", "si"],
        order: ["ilium", "ischium", "pubis", "sacrum", "sym", "si"],
        instruction: bi(
          "Locate each requested landmark on the schematic, in the order shown.",
          "ระบุ landmark ที่ถามบนแผนภาพ ตามลำดับที่กำหนด",
        ),
      },
    ),
    ["LO1"],
    4,
    bi(
      "The anterior and posterior ring form one linked structure.",
      "Anterior และ posterior ring เชื่อมกันเป็นวงแหวน",
    ),
  ),
  r(
    "C0S2",
    "Ligaments and their jobs",
    "Ligament ทำหน้าที่อะไร",
    match([
      [
        "Symphyseal ligament",
        "Symphyseal ligament",
        "Front of the ring: resists external rotation",
        "ด้านหน้าของวงแหวน: ต้าน external rotation",
      ],
      [
        "Sacrospinous",
        "Sacrospinous",
        "Pelvic floor (ischial spine): resists external rotation",
        "Pelvic floor (ischial spine): ต้าน external rotation",
      ],
      [
        "Sacrotuberous",
        "Sacrotuberous",
        "Resists vertical shear",
        "ต้าน vertical shear",
      ],
      [
        "Posterior SI complex",
        "Posterior SI complex",
        "Strongest — the key to pelvic stability",
        "แข็งแรงที่สุด — สำคัญที่สุดต่อ stability",
      ],
      [
        "Iliolumbar",
        "Iliolumbar",
        "L5 TP avulsion clue",
        "L5 TP avulsion clue",
      ],
    ]),
    ["LO1"],
    5,
    bi(
      "Ligament disruption explains instability clues.",
      "Ligament disruption ช่วยอธิบาย instability clues",
    ),
  ),
  r(
    "C0S3",
    "Force detective",
    "นักสืบทิศทางแรง",
    sort(
      [
        c(
          "front",
          "Front impact / opening force",
          "แรงจากด้านหน้า / opening",
          "force-apc",
          "APC",
        ),
        c(
          "side",
          "Side impact / compression",
          "แรงจากด้านข้าง / compression",
          "force-lc",
          "LC",
        ),
        c("fall", "Fall onto one leg", "ตกลงบนขาข้างเดียว", "force-vs", "VS"),
      ],
      [
        ["APC", "APC", "APC"],
        ["LC", "LC — most common", "LC — พบบ่อยที่สุด"],
        ["VS", "Vertical shear", "Vertical shear"],
      ],
    ),
    ["LO1"],
    13,
    bi(
      "Mechanism suggests a pattern, not a definitive diagnosis.",
      "กลไกชวนคิดถึง pattern แต่ไม่ยืนยัน diagnosis",
    ),
  ),
  r(
    "C0S4",
    "Associated-injury collection",
    "เก็บ associated injuries",
    sort(
      [
        c("head", "Head 51%", "Head 51%", "body", "very"),
        c("long", "Long bone 48%", "Long bone 48%", "body", "very"),
        c("abd", "Abdomen 35%", "Abdomen 35%", "organ", "common"),
        c("nerve", "Nerve 26%", "Nerve 26%", "organ", "common"),
        c("chest", "Chest 20%", "Chest 20%", "body", "common"),
        c("gu", "Lower GU 16%", "Lower GU 16%", "organ", "less"),
      ],
      [
        ["very", "More than 40%", "มากกว่า 40%"],
        ["common", "20% to 40%", "20% ถึง 40%"],
        ["less", "Less than 20%", "น้อยกว่า 20%"],
      ],
    ),
    ["LO1"],
    12,
    bi(
      "Look beyond the pelvis; these percentages describe the supplied source cohort.",
      "ประเมินนอก pelvis ด้วย ตัวเลขเป็นของกลุ่มในเอกสาร",
    ),
  ),
  r(
    "C1S1",
    "Primary survey track",
    "เรียง primary survey",
    sequence(
      [
        c("A", "Airway + C-spine", "Airway + C-spine", "body"),
        c("B", "Breathing", "Breathing", "body"),
        c(
          "C",
          "Circulation + bleeding control",
          "Circulation + bleeding control",
          "blood",
        ),
        c("D", "Disability", "Disability", "organ"),
        c("E", "Exposure / keep warm", "Exposure / รักษาความอบอุ่น", "body"),
      ],
      ["A", "B", "C", "D", "E"],
    ),
    ["LO2"],
    21,
    bi(
      "ABCDE priorities guide a team working in parallel.",
      "ABCDE กำหนดลำดับสำคัญ ขณะทีมทำงานคู่ขนาน",
    ),
  ),
  r(
    "C1S2",
    "Shock bucket",
    "ถังจำลอง shock",
    combo([shock, shockClasses]),
    ["LO5"],
    22,
    bi(
      "Class III is a teaching estimate; trends and response matter more than a bucket.",
      "Class III เป็นค่าประมาณเพื่อเรียน ต้องติดตาม trend และ response",
    ),
    { concepts: ["S1"] },
  ),
  r(
    "C1S3",
    "Build the resuscitation hand",
    "เลือกการ์ด resuscitation",
    resus,
    ["LO5", "LO6"],
    23,
    bi(
      "Prepare access, tests, blood and stabilization while escalating.",
      "เตรียม IV ตรวจเลือด blood และ stabilization พร้อมแจ้งทีม",
    ),
    {
      note: "Follows lecture S23 (2 L crystalloid, binder for every suspected pelvic fracture). Newer guideline shown to learners as a note.",
      guideline: bi(
        "Newer guideline: NICE NG39 (2016) prefers early blood products and limits crystalloid in active bleeding. Follow your local protocol.",
        "แนวทางใหม่: NICE NG39 (2016) แนะนำให้ blood products เร็วและจำกัด crystalloid เมื่อมีเลือดออก ให้ทำตามแนวทางของโรงพยาบาล",
      ),
    },
  ),
  r(
    "C1S4",
    "Binder workshop on screen",
    "จัด binder บนจอ",
    binder,
    ["LO6"],
    17,
    bi(
      "Binder for every suspected pelvic fracture: centred on the greater trochanters, snug (not loose, not over-tight), legs internally rotated with padding; remove within 24 h.",
      "ใส่ binder ทุกรายที่สงสัย: กึ่งกลางที่ greater trochanter รัดพอดี (ไม่หลวม ไม่แน่นเกิน) จัดขาหมุนเข้าและรองผ้า ถอดภายใน 24 ชม.",
    ),
    {
      doc: "H",
      concepts: ["S2"],
      note: "The tightness gauge is conceptual, not a validated pressure.",
    },
  ),
  r(
    "C1S5",
    "Stabilization picture",
    "ภาพหลักการ stabilization",
    image(
      [
        c(
          "reduce",
          "Reduced motion and pelvic volume",
          "ลด motion และ pelvic volume",
          "binder",
        ),
        c("crest", "Compression at the waist", "กดที่เอว", "body"),
        c("thigh", "Compression over the belly button", "กดบริเวณสะดือ", "body"),
      ],
      "reduce",
    ),
    ["LO6"],
    32,
    bi(
      "Stabilization supports clot formation; it does not prove bleeding has stopped.",
      "Stabilization ช่วย clot ไม่ยืนยันว่าเลือดหยุด",
    ),
  ),
  r(
    "C1S6",
    "Where is the blood?",
    "เลือดออกที่ไหน",
    combo([
      sort(
        [
          c("thorax", "Haemothorax", "Haemothorax", "body", "chest"),
          c("spleen", "Abdominal bleeding", "เลือดออกช่องท้อง", "organ", "abd"),
          c("ring", "Pelvic bleeding", "เลือดออก pelvis", "pelvis", "pelvis"),
          c("femur", "Long-bone injury", "Long-bone injury", "body", "long"),
          c("wound", "External bleeding", "เลือดออกภายนอก", "wound", "out"),
        ],
        [
          ["chest", "Chest", "Chest"],
          ["abd", "Abdomen", "Abdomen"],
          ["pelvis", "Pelvis", "Pelvis"],
          ["long", "Long bones", "Long bones"],
          ["out", "Outside", "Outside"],
        ],
      ),
      sort(
        [
          c("bleed", "Blood loss (pelvis, abdomen, haemothorax)", "เสียเลือด (pelvis ช่องท้อง haemothorax)", "blood", "loss"),
          c("ich", "Head injury with intracranial haemorrhage", "Head injury มีเลือดออกในสมอง", "organ", "cns"),
          c("spinal", "Spinal shock", "Spinal shock", "organ", "neuro"),
          c("tension", "Tension haemothorax", "Tension haemothorax", "body", "pressure"),
        ],
        [
          ["loss", "Blood loss", "เสียเลือด"],
          ["cns", "Intracranial cause", "สาเหตุในกะโหลก"],
          ["neuro", "Neurological cause", "สาเหตุทางระบบประสาท"],
          ["pressure", "Pressure effect", "แรงกด (pressure effect)"],
        ],
      ),
      sort(
        [
          c("plexus", "Sacral venous plexus", "Sacral venous plexus", "blood", "venous"),
          c("bone", "Bleeding fracture surfaces", "เลือดออกจากผิวกระดูกที่หัก", "pelvis", "venous"),
          c("sga", "Superior gluteal artery (most common artery)", "Superior gluteal artery (หลอดเลือดแดงที่พบบ่อยที่สุด)", "blood", "arterial"),
          c("lsa", "Lateral sacral / internal pudendal artery", "Lateral sacral / internal pudendal artery", "blood", "arterial"),
        ],
        [
          ["venous", "Venous / bone ≈ 80% — binder, packing", "หลอดเลือดดำ/กระดูก ≈ 80% — binder, packing"],
          ["arterial", "Arterial ≈ 20% — angio-embolization", "หลอดเลือดแดง ≈ 20% — angio-embolization"],
        ],
      ),
      sequence(
        [
          c("atls", "ATLS + 2 L fluid + pelvic sheet/binder", "ATLS + fluid 2 L + pelvic sheet/binder", "binder"),
          c("sbp", "SBP still <100: continue fluid and blood", "SBP ยัง <100: ให้ fluid และเลือดต่อ", "blood"),
          c("fast", "FAST or CT abdomen", "FAST หรือ CT abdomen", "organ"),
          c("lap", "FAST positive: laparotomy ± pelvic packing + pelvic ex-fix", "FAST บวก: laparotomy ± pelvic packing + pelvic ex-fix", "team"),
          c("angio", "Still hypotensive after 4 U PRBC: angiography/embolization", "ยัง hypotension หลัง PRBC 4 U: angiography/embolization", "ct"),
        ],
        ["atls", "sbp", "fast", "lap", "angio"],
      ),
    ]),
    ["LO5"],
    38,
    bi(
      "Bleeding is 80% venous/bone and 20% arterial (superior gluteal most often). Angio-embolization finds an arterial source in only 10–15% and does not stop venous bleeding. 50–69% of unstable fractures need ≥4 U LPRC. Lactate ≥4: keep resuscitating; lactate <4: definitive fixation.",
      "เลือดออกจาก venous/กระดูก 80% และ arterial 20% (superior gluteal พบบ่อยสุด) angio-embolization พบแหล่ง arterial เพียง 10–15% และไม่แก้ venous bleeding ผู้ป่วย unstable 50–69% ต้องใช้ LPRC ≥4 U lactate ≥4 ให้ resuscitate ต่อ lactate <4 จึงทำ definitive fixation",
    ),
    {
      note: "Flowchart follows lecture S38; then lactate ≥4 → continue resuscitation, lactate <4 → definitive fixation.",
    },
  ),
  r(
    "C1S7",
    "Urgent SBAR",
    "SBAR ด่วน",
    handover(1),
    ["LO7", "LO5"],
    40,
    bi(
      "State physiology, response, uncertainty and an urgent request.",
      "แจ้ง physiology response ความไม่แน่ชัดและคำขอด่วน",
    ),
  ),
  r(
    "C2S1",
    "Trauma-series films",
    "ภาพ trauma series",
    pick(
      [
        c("neck", "C-spine lateral", "C-spine lateral", "beam"),
        c("chest", "Chest supine AP", "Chest supine AP", "beam"),
        c("pelvis", "Pelvis AP", "Pelvis AP", "pelvis"),
        c("judet", "Judet first for all trauma", "Judet ก่อนเสมอ", "beam"),
        c(
          "ct",
          "CT 3D replaces initial assessment",
          "CT 3D แทน initial assessment",
          "ct",
        ),
      ],
      ["neck", "chest", "pelvis"],
      "beam",
    ),
    ["LO3"],
    40,
    bi(
      "Recall this source's series; choose actual imaging with the trauma team.",
      "ทบทวน series ในเอกสาร เลือกภาพจริงร่วมทีม trauma",
    ),
  ),
  r(
    "C2S2",
    "Read the ring",
    "อ่าน pelvic ring",
    s(
      "ring_trace",
      [
        c("lumbar", "L-spine / transverse processes", "L-spine / TP"),
        c("si", "SI joints / posterior ring", "SI / posterior ring"),
        c("acet", "Acetabulum (left)", "Acetabulum (ซ้าย)"),
        c("hip", "Femoral head position (left hip)", "ตำแหน่งหัวกระดูก femur (สะโพกซ้าย)"),
        c("rami", "Pubic rami / symphysis", "Pubic rami / symphysis"),
      ],
      {
        targets: ["acet", "hip", "rami"],
        image: "/assets/teaching/slide-41.jpg",
        instruction: bi(
          "Trace the ring clockwise through all five checkpoints, then mark the three abnormal ones on this film.",
          "ไล่วงแหวนตามเข็มนาฬิกาครบ 5 จุด แล้วเลือก 3 จุดที่ผิดปกติในภาพนี้",
        ),
      },
    ),
    ["LO3"],
    41,
    bi(
      "Read the AP pelvis systematically around the whole ring and both hips. Four rami broken (straddle fracture) means: suspect a posterior ring injury too.",
      "อ่าน AP pelvis อย่างเป็นระบบรอบวงแหวนและสะโพกทั้งสองข้าง หาก rami หักทั้ง 4 (straddle fracture) ให้สงสัย posterior ring injury ด้วย",
    ),
    {
      note: "Uses the slide-41 film of the 22-year-old (left acetabular fracture, posterior hip dislocation, rami fractures).",
    },
  ),
  r(
    "C2S3",
    "Beam and view pairs",
    "จับคู่ beam และ view",
    match(
      [
        [
          "Inlet / caudal beam",
          "Inlet / caudal beam",
          "AP translation, SI, sacrum, symphysis",
          "AP translation, SI, sacrum, symphysis",
        ],
        [
          "Outlet / cephalad beam",
          "Outlet / cephalad beam",
          "Vertical shift, rami, sacral foramina",
          "Vertical shift, rami, sacral foramina",
        ],
        ["Judet oblique", "Judet oblique", "Acetabulum", "Acetabulum"],
        [
          "CT / 3D",
          "CT / 3D",
          "Posterior ring and detailed assessment",
          "Posterior ring และรายละเอียด",
        ],
      ],
      "beam",
    ),
    ["LO3"],
    16,
    bi(
      "Inlet assesses AP displacement; outlet assesses vertical displacement.",
      "Inlet ดู AP displacement; outlet ดู vertical displacement",
    ),
    {
      note: "Angles follow lecture slide 16 (AO: inlet ~25° caudal, outlet ~60° cephalad). Handout pp13–14 gives 30–45°; learners see this as a note.",
      guideline: bi(
        "The handout describes 30–45° tilts; the lecture uses the AO angles (inlet ~25° toward the feet, outlet ~60° toward the head).",
        "เอกสารประกอบระบุมุม 30–45° ส่วนสไลด์ใช้มุมของ AO (inlet ~25° ไปทางเท้า, outlet ~60° ไปทางศีรษะ)",
      ),
    },
  ),
  r(
    "C2S4",
    "Stability clue sort",
    "จัดกลุ่ม stability clues",
    unstable,
    ["LO3"],
    14,
    bi(
      "Normal physiology is not proof of mechanical stability.",
      "Physiology ปกติไม่ยืนยัน mechanical stability",
    ),
    { doc: "H" },
  ),
  r(
    "C2S5",
    "Safe CT transfer",
    "ย้ายไป CT อย่างปลอดภัย",
    image(
      [
        c(
          "safe",
          "Resuscitated; monitored, escorted; binder documented",
          "Resuscitated มี monitor ทีม escort และบันทึก binder",
          "ct",
        ),
        c(
          "alone",
          "Unstable, alone in the scanner",
          "Unstable อยู่ลำพังใน CT",
          "ct",
        ),
        c(
          "film",
          "Normal AP alone guarantees safe transfer",
          "AP ปกติจึงย้ายได้แน่นอน",
          "beam",
        ),
      ],
      "safe",
    ),
    ["LO3", "LO5"],
    16,
    bi(
      "Reassess physiology and capability before CT, while treatment continues.",
      "ประเมิน physiology และ capability ก่อน CT รักษาต่อเนื่อง",
    ),
    { doc: "H", concepts: ["S3"] },
  ),
  r(
    "C2S6",
    "Pattern and urgency",
    "Pattern และความเร่งด่วน",
    image(
      [
        c(
          "lc",
          "Source report: LC + acetabulum injury / posterior hip dislocation",
          "รายงาน: LC + acetabulum / posterior hip dislocation",
          "force-lc",
        ),
        c(
          "apc",
          "Source report: isolated APC only",
          "รายงาน: isolated APC เท่านั้น",
          "force-apc",
        ),
        c(
          "vs",
          "Source report: isolated VS only",
          "รายงาน: isolated VS เท่านั้น",
          "force-vs",
        ),
      ],
      "lc",
    ),
    ["LO1", "LO3", "LO7"],
    44,
    bi(
      "Source-reported hip dislocation is an orthopaedic urgency; escalate, do not reduce independently.",
      "Hip dislocation ในรายงานเป็น ortho urgency แจ้งทีม ไม่ reduce เอง",
    ),
  ),
  r(
    "C3S1",
    "AMPLE collection",
    "เก็บ AMPLE",
    pick(
      [
        c("a", "Allergies", "Allergies", "antibiotic"),
        c("m", "Medications", "Medications", "lab"),
        c("p", "Past illnesses", "Past illnesses", "body"),
        c("l", "Last meal", "Last meal", "fluid"),
        c("e", "Events", "Events", "force-lc"),
        c(
          "delay",
          "Delay resuscitation for full history",
          "หยุด resuscitation เพื่อซักครบ",
          "blood",
        ),
        c("skip", "Skip mechanism", "ไม่ถาม mechanism", "body"),
        c("guess", "Assume history from appearance", "เดาจากรูปลักษณ์", "body"),
      ],
      ["a", "m", "p", "l", "e"],
    ),
    ["LO2"],
    26,
    bi(
      "Gather AMPLE without delaying resuscitation.",
      "เก็บ AMPLE โดยไม่ทำให้ resuscitation ช้า",
    ),
  ),
  r(
    "C3S2",
    "Sensitive examination clues",
    "ข้อมูลตรวจที่อ่อนไหว",
    s(
      "hotspot",
      [
        c(
          "meatus",
          "Meatal blood: supplied finding",
          "Meatal blood: มีในเคส",
          "body",
        ),
        c(
          "flank",
          "Flank laceration: supplied finding",
          "Flank laceration: มีในเคส",
          "body",
        ),
        c(
          "pr",
          "PR: assess indication with senior",
          "PR: พิจารณาร่วม senior",
          "body",
        ),
        c(
          "pv",
          "PV: not applicable to this male case",
          "PV: ไม่ตรงกับผู้ป่วยชายเคสนี้",
          "body",
        ),
      ],
      { targets: ["meatus", "flank", "pr"], art: "body" },
    ),
    ["LO2", "LO4"],
    27,
    bi(
      "Examine the perineum with consent and a chaperone: blood at the meatus or a high-riding prostate on PR suggests urethral injury; blood on PR or PV means an open (internal) pelvic fracture until proven otherwise.",
      "ตรวจ perineum โดยขอ consent และมีผู้ช่วย: เลือดที่รูเปิดท่อปัสสาวะหรือ prostate ลอยสูง (high-riding) จาก PR ชวนคิด urethral injury; เลือดจาก PR หรือ PV ให้ถือว่าเป็น open pelvic fracture จนกว่าจะพิสูจน์ได้",
    ),
    {
      note: "Round 2 teaches what each perineal/neurological finding means (lecture S27); it does not add findings to this patient.",
    },
  ),
  r(
    "C3S3",
    "Compression-test safety",
    "ความปลอดภัย compression test",
    combo([
      pick(
        [
          c("med", "Medial pressure on both iliac crests", "กดจาก iliac crest ทั้งสองข้างเข้าหากึ่งกลาง", "body"),
          c("post", "Posterior pressure on the iliac crests / ASIS", "กด iliac crest / ASIS ลงด้านหลัง", "body"),
          c("pub", "Downward pressure on the pubis", "กดลงที่ pubis", "body"),
          c("rock", "Rock the pelvis repeatedly to feel crepitus", "โยกเชิงกรานซ้ำเพื่อคลำ crepitus", "body"),
          c("rom", "Full hip range of motion against pain", "ขยับสะโพกเต็มช่วงแม้เจ็บ", "body"),
        ],
        ["med", "post", "pub"],
        "body",
      ),
      image(
        [
          c(
            "no",
            "Do NOT test this unstable patient; no repetition",
            "ไม่ตรวจผู้ป่วย unstable รายนี้ ไม่ตรวจซ้ำ",
            "body",
          ),
          c(
            "yes",
            "Perform all manoeuvres in shock",
            "ทำทุกท่าแม้ shock",
            "body",
          ),
        ],
        "no",
      ),
    ]),
    ["LO2"],
    10,
    bi(
      "Pelvic compression test = 3 gentle manoeuvres, done once only. Do not do it in an unstable patient, and stop after the first positive step.",
      "Pelvic compression test มี 3 ท่า ทำเบาๆ ครั้งเดียว ไม่ทำในผู้ป่วย unstable และหยุดเมื่อท่าแรกให้ผลบวก",
    ),
    { doc: "H" },
  ),
  r(
    "C3S4",
    "Open, closed or degloving?",
    "Open, closed หรือ degloving",
    wound,
    ["LO4"],
    18,
    bi(
      "Open = a wound that communicates with the fracture: external (perineal wound, fat globules or bone in the wound) or internal (blood PR/PV). Mortality of open pelvic fracture is 30–50%.",
      "Open = แผลที่ติดต่อกับ fracture ทั้งภายนอก (แผล perineum, fat globules หรือกระดูกในแผล) และภายใน (เลือด PR/PV) อัตราตายของ open pelvic fracture 30–50%",
    ),
    { doc: "H", concepts: ["S6"] },
  ),
  r(
    "C3S5",
    "GU danger cards",
    "การ์ดเตือน GU",
    gu,
    ["LO2", "LO5"],
    49,
    bi(
      "No blind Foley with meatal bleeding: ask the senior/urology team for assessment.",
      "Meatal blood: ไม่ใส่ Foley แบบ blind ให้ senior/urology ประเมิน",
    ),
    { concepts: ["S5"] },
  ),
  r(
    "C3S6",
    "Open-fracture source bundle",
    "ชุดข้อมูล open fracture",
    sourceAntibiotics,
    ["LO4", "LO5"],
    19,
    bi(
      "Open pelvic fracture: IV antibiotics by Gustilo grade within 3 h, tetanus prophylaxis and urgent surgical debridement. Check allergy, weight and kidney function before prescribing.",
      "Open pelvic fracture: ให้ antibiotic ทางหลอดเลือดตาม Gustilo grade ภายใน 3 ชม. ป้องกันบาดทะยัก และผ่าตัด debridement โดยเร็ว ตรวจประวัติแพ้ยา น้ำหนัก และการทำงานของไตก่อนสั่งยา",
    ),
    {
      doc: "H",
      note: "Follows handout H19 (Gustilo table, within 3 h). Slide 29 lists cefazolin 1 g + gentamicin 240 mg + penicillin 1.2 MU — please confirm one regimen. Adult doses.",
      guideline: bi(
        "Newer guideline: BOAST (2017) recommends antibiotics as soon as possible, ideally within 1 hour of injury.",
        "แนวทางใหม่: BOAST (2017) แนะนำให้ antibiotic เร็วที่สุด ภายใน 1 ชั่วโมงหลังบาดเจ็บ",
      ),
    },
  ),
  r(
    "C3S7",
    "Three-team handover",
    "ส่งต่อ 3 ทีม",
    handover(3),
    ["LO7", "LO4", "LO5"],
    53,
    bi(
      "General surgery, orthopaedics and urology coordinate; double set-up is senior-led.",
      "General surgery ortho urology ประสานกัน; double set-up โดยทีมอาวุโส",
    ),
  ),
];
// Additional short rounds close the source blueprint gaps without adding station IDs.
practiceRows.find((row) => row.id === "C3S1")!.game = combo([
  practiceRows.find((row) => row.id === "C3S1")!.game,
  pick(
    [
      c(
        "survey",
        "Head-to-toe secondary survey when appropriate",
        "Secondary survey จากศีรษะจรดเท้าเมื่อเหมาะสม",
        "body",
      ),
      c(
        "pulse",
        "Compare femoral, popliteal and dorsalis pedis pulses",
        "เปรียบเทียบ femoral popliteal และ dorsalis pedis pulses",
        "blood",
      ),
      c(
        "motor",
        "Check L5/S1: ankle dorsiflexion, sensation and ankle reflex",
        "ตรวจ L5/S1: กระดกข้อเท้าขึ้น การรับความรู้สึก และ ankle reflex",
        "organ",
      ),
      c(
        "skin",
        "Inspect bruising, wounds and closed degloving clues",
        "ดู bruising แผล และ closed degloving clues",
        "wound",
      ),
      c(
        "dignity",
        "Consent, dignity and senior-led sensitive examination",
        "Consent ศักดิ์ศรี และตรวจส่วนอ่อนไหวกับ senior",
        "team",
      ),
      c(
        "force",
        "Force painful joint movement to prove stability",
        "ฝืนขยับข้อที่เจ็บเพื่อยืนยัน stability",
        "body",
      ),
      c(
        "only",
        "Limit examination to the painful pelvic region",
        "ตรวจเฉพาะ pelvis ที่เจ็บ",
        "pelvis",
      ),
    ],
    ["survey", "pulse", "motor", "skin", "dignity"],
  ),
]);
practiceRows.find((row) => row.id === "C3S1")!.page = 8;
practiceRows.find((row) => row.id === "C3S1")!.doc = "H";
practiceRows.find((row) => row.id === "C1S3")!.game = combo([
  resus,
  sort(
    [
      c("cold", "Hypothermia", "Hypothermia", "body", "triad"),
      c("acid", "Acidosis", "Acidosis", "lab", "triad"),
      c("clot", "Coagulopathy", "Coagulopathy", "blood", "triad"),
      c(
        "ratio",
        "MTP RBC:FFP:platelets 1:1:1",
        "MTP RBC:FFP:platelets 1:1:1",
        "blood",
        "support",
      ),
      c(
        "trend",
        "Reassess response, lactate and other bleeding sources",
        "ประเมิน response lactate และแหล่งเลือดอื่นซ้ำ",
        "team",
        "support",
      ),
    ],
    [
      ["triad", "Lethal triad", "Lethal triad"],
      ["support", "Team support / monitoring", "ทีมช่วย / monitoring"],
    ],
  ),
]);
practiceRows.find((row) => row.id === "C2S5")!.game = combo([
  practiceRows.find((row) => row.id === "C2S5")!.game,
  pick(
    [
      c(
        "posterior",
        "Posterior pelvic tenderness / suspicion",
        "เจ็บ posterior pelvis / สงสัย injury",
        "pelvis",
      ),
      c(
        "unstable",
        "Plain films suggest instability",
        "Plain film ชวนคิด instability",
        "beam",
      ),
      c(
        "unclear",
        "Pelvic injury remains unclear on plain films",
        "ยังสงสัย injury แม้ plain film ไม่ชัด",
        "beam",
      ),
      c(
        "associated",
        "Associated injury already needs abdominal CT",
        "Associated injury ต้องตรวจ abdominal CT",
        "ct",
      ),
      c(
        "exclude",
        "Normal AP always excludes posterior injury",
        "AP ปกติตัด posterior injury เสมอ",
        "beam",
      ),
    ],
    ["posterior", "unstable", "unclear", "associated"],
  ),
]);
// Lecture facts added as extra rounds (2026-10 objective review).
const row = (id: string) => practiceRows.find((item) => item.id === id)!;
row("C2S1").game = combo([
  row("C2S1").game,
  image(
    [
      c("90", "About 90%", "ประมาณ 90%", "pelvis"),
      c("50", "About 50%", "ประมาณ 50%", "pelvis"),
      c("100", "100% — CT is never needed", "100% — ไม่ต้องทำ CT เลย", "ct"),
    ],
    "90",
  ),
]);
row("C2S1").key = bi(
  "Trauma series: C-spine lateral, chest AP and pelvis AP. The AP pelvis picks up about 90% of pelvic fractures; posterior injuries can still be missed.",
  "Trauma series: C-spine lateral, chest AP และ pelvis AP ภาพ AP pelvis คัดกรองได้ราว 90% แต่ยังพลาด posterior injury ได้",
);
row("C2S2").game = combo([
  row("C2S2").game,
  image(
    [
      c("posterior", "Suspect a posterior ring injury: get inlet/outlet views or CT", "สงสัย posterior ring injury: ส่ง inlet/outlet หรือ CT", "beam"),
      c("anterior", "Anterior injury only — no more imaging needed", "บาดเจ็บด้านหน้าอย่างเดียว ไม่ต้องส่งภาพเพิ่ม", "pelvis"),
      c("remove", "Remove the binder to see the fracture better", "ถอด binder เพื่อดู fracture ให้ชัด", "binder"),
    ],
    "posterior",
  ),
]);
row("C2S3").game = combo([
  row("C2S3").game,
  sort(
    [
      c("in", "X-ray tube tilted ~25° toward the feet (caudal)", "หลอดเอกซเรย์เอียง ~25° ไปทางเท้า (caudal)", "beam-inlet", "inlet"),
      c("out", "X-ray tube tilted ~60° toward the head (cephalad)", "หลอดเอกซเรย์เอียง ~60° ไปทางศีรษะ (cephalad)", "beam-outlet", "outlet"),
    ],
    [
      ["inlet", "Inlet view", "Inlet view"],
      ["outlet", "Outlet view", "Outlet view"],
    ],
  ),
]);
row("C3S2").game = combo([
  row("C3S2").game,
  sort(
    [
      c("prostate", "High-riding prostate on PR", "คลำ prostate ลอยสูง (high-riding) จาก PR", "organ", "urethra"),
      c("meatal", "Blood at the urethral meatus", "เลือดที่รูเปิดท่อปัสสาวะ", "foley", "urethra"),
      c("prblood", "Blood on PR examination", "มีเลือดจากการตรวจ PR", "organ", "open"),
      c("pvblood", "Vaginal bleeding on PV examination", "มีเลือดจากการตรวจ PV", "organ", "open"),
      c("anal", "Reduced perianal sensation or anal tone", "การรับความรู้สึกรอบทวาร/anal tone ลดลง", "organ", "nerve"),
      c("ankle", "Weak ankle dorsiflexion, absent ankle reflex", "กระดกข้อเท้าอ่อนแรง ankle reflex หาย", "body", "nerve"),
    ],
    [
      ["urethra", "Urethral injury — no Foley", "Urethral injury — ห้ามใส่ Foley"],
      ["open", "Open (internal) pelvic fracture", "Open pelvic fracture (ภายใน)"],
      ["nerve", "Sacral / L5–S1 nerve injury", "Sacral / L5–S1 nerve injury"],
    ],
  ),
]);
const retrieval = (
  id: string,
  source: Row,
  stage: "boss" | "gauntlet",
): Row => ({
  ...source,
  id,
  title: bi(
    `${stage === "boss" ? "Boss recall" : "Trauma Shift"}: ${source.title.en}`,
    `${stage === "boss" ? "Boss ทบทวน" : "Trauma Shift"}: ${source.title.th}`,
  ),
});
const bosses = [
  practiceRows[2],
  practiceRows[1],
  practiceRows[3],
  practiceRows[5],
  practiceRows[7],
  practiceRows[9],
  practiceRows[14],
  practiceRows[13],
  practiceRows[16],
  practiceRows[20],
  practiceRows[21],
  practiceRows[17],
].map((row, i) =>
  retrieval(`C${Math.floor(i / 3)}B${(i % 3) + 1}`, row, "boss"),
);
const removal = r(
  "FS8",
  "Binder removal plan",
  "แผนถอด binder",
  image(
    [
      c(
        "team",
        "Remove as soon as possible, within 24 h; if the AP shows no unstable fracture remove it — ask orthopaedics if unsure",
        "ถอดให้เร็วที่สุดภายใน 24 ชม. ถ้า AP ไม่พบ unstable fracture ให้ถอด หากไม่แน่ใจให้ปรึกษาออร์โธปิดิกส์",
        "binder",
      ),
      c(
        "days",
        "Keep it on for several days until definitive surgery",
        "ใส่ไว้หลายวันจนผ่าตัด",
        "binder",
      ),
      c(
        "now",
        "Take it off before the first X-ray to see the fracture",
        "ถอดก่อนเอกซเรย์ครั้งแรกเพื่อดู fracture",
        "beam",
      ),
    ],
    "team",
  ),
  ["LO6"],
  18,
  bi(
    "Remove the binder as soon as possible and within 24 h (pressure sores). If the AP pelvis shows no unstable fracture, remove it; ask orthopaedics if unsure.",
    "ถอด binder ให้เร็วที่สุดภายใน 24 ชม. (เสี่ยงแผลกดทับ) ถ้า AP pelvis ไม่พบ unstable fracture ให้ถอด ไม่แน่ใจให้ปรึกษาออร์โธปิดิกส์",
  ),
  {
    doc: "H",
    concepts: ["S4"],
    note: "Follows handout H18 and slide 34.",
    guideline: bi(
      "Newer guideline: BOAST notes a binder can hide displacement on the AP film, so many centres remove it only under a senior-agreed protocol.",
      "แนวทางใหม่: BOAST ระบุว่า binder อาจบังการเคลื่อนของกระดูกในภาพ AP หลายโรงพยาบาลจึงถอดตามแผนที่ senior เห็นชอบ",
    ),
  },
);
// Post-test blueprint: one item per objective plus binder removal. FS2 and FS6 are must-pass safety items.
const blueprint = [
  row("C0S3"), // LO1 mechanism
  { ...row("C3S5"), mustPass: true }, // LO2 exam / LO5 — no Foley with meatal blood
  row("C2S4"), // LO3 imaging
  row("C3S4"), // LO4 open vs closed
  row("C1S2"), // LO5 shock
  { ...row("C1S4"), mustPass: true }, // LO6 binder level
  row("C3S7"), // LO7 referral
  removal, // LO6 binder removal
];
const finalRows = blueprint.map((item, i) => retrieval(`FS${i + 1}`, item, "gauntlet"));
const alternateRetrieval = [
  image(
    [
      c("lc", "Side impact / compression: LC", "แรงด้านข้าง / compression: LC", "force-lc"),
      c("apc", "Side impact / compression: APC", "แรงด้านข้าง / compression: APC", "force-apc"),
      c("vs", "Side impact / compression: VS", "แรงด้านข้าง / compression: VS", "force-vs"),
    ],
    "lc",
  ),
  pick(
    [
      c("nofoley", "Do not insert a urethral (Foley) catheter", "ไม่ใส่สายสวนปัสสาวะ (Foley)", "foley"),
      c("uro", "Consult urology", "ปรึกษา urology", "phone"),
      c("foley", "Insert a Foley to measure urine output", "ใส่ Foley เพื่อวัดปัสสาวะ", "foley"),
      c("small", "Try a smaller Foley if the first one fails", "ลองใส่ Foley ขนาดเล็กลงถ้าใส่ไม่เข้า", "foley"),
    ],
    ["nofoley", "uro"],
    "organ",
  ),
  pick(
    [
      c("si", "SI joint widening >5 mm", "SI joint กว้าง >5 mm", "pelvis"),
      c("sym", "Symphysis widening >2.5 cm", "Symphysis กว้าง >2.5 cm", "pelvis"),
      c("up", "Hemipelvis displaced upwards", "Hemipelvis เคลื่อนขึ้น", "force-vs"),
      c("ramus", "Single undisplaced ramus crack, ring intact", "Ramus ร้าวเส้นเดียวไม่เคลื่อน วงแหวนสมบูรณ์", "pelvis"),
      c("bp", "Normal blood pressure", "ความดันปกติ", "blood"),
    ],
    ["si", "sym", "up"],
    "beam",
  ),
  pick(
    [
      c("pr", "Blood on PR examination", "มีเลือดจากการตรวจ PR", "organ"),
      c("bone", "Bone fragment in a perineal wound", "มีเศษกระดูกในแผล perineum", "wound"),
      c("pv", "Vaginal bleeding after pelvic injury", "เลือดออกทางช่องคลอดหลังบาดเจ็บ", "organ"),
      c("bruise", "Hip bruise with intact skin", "รอยช้ำที่สะโพก ผิวหนังไม่ฉีก", "body"),
      c("ml", "Closed degloving (Morel–Lavallée)", "Closed degloving (Morel–Lavallée)", "wound"),
    ],
    ["pr", "bone", "pv"],
    "wound",
  ),
  pick(
    [
      c("loss", "Class III: 1500–2000 mL estimate", "Class III: ประมาณ 1500–2000 mL", "blood"),
      c("trend", "Reassess response and trends", "ประเมิน response และ trends ซ้ำ", "blood"),
      c("normal", "Normal BP excludes blood loss", "BP ปกติตัด blood loss", "blood"),
      c("measure", "Class estimates are measured patient losses", "Class คือปริมาณที่วัดได้จริง", "blood"),
    ],
    ["loss", "trend"],
  ),
  sequence(
    [
      c("knees", "Slide the binder in under the knees", "สอด binder ใต้เข่า", "binder"),
      c("troch", "Move it up to the greater trochanters", "เลื่อนขึ้นไปที่ greater trochanter", "binder"),
      c("legs", "Legs internally rotated, knees/ankles together and padded", "จัดขาหมุนเข้า เข่าและข้อเท้าชิดกันและรองผ้า", "body"),
      c("tight", "Tighten until snug — not loose, not over-tight", "รัดให้พอดี ไม่หลวม ไม่แน่นเกิน", "binder"),
    ],
    ["knees", "troch", "legs", "tight"],
  ),
  pick(
    [
      c("gs", "General surgery", "ศัลยกรรมทั่วไป", "phone"),
      c("ortho", "Orthopaedics", "ออร์โธปิดิกส์", "phone"),
      c("uro", "Urology", "ศัลยกรรมระบบปัสสาวะ (urology)", "phone"),
      c("wait", "Wait for CT before calling anyone", "รอผล CT ก่อนค่อยปรึกษา", "ct"),
    ],
    ["gs", "ortho", "uro"],
    "team",
  ),
  pick(
    [
      c("24", "Remove within 24 hours", "ถอดภายใน 24 ชั่วโมง", "binder"),
      c("normal", "If the AP pelvis shows no unstable fracture, remove it", "ถ้า AP pelvis ไม่พบ unstable fracture ให้ถอด", "beam"),
      c("ask", "Ask orthopaedics if unsure", "ไม่แน่ใจให้ปรึกษาออร์โธปิดิกส์", "phone"),
      c("week", "Keep it on for a week", "ใส่ไว้ 1 สัปดาห์", "binder"),
    ],
    ["24", "normal", "ask"],
    "binder",
  ),
];
finalRows.forEach((row, index) => {
  row.game = {
    ...row.game,
    variants: { A: row.game, B: alternateRetrieval[index] },
  };
});
const stories = [
  bi(
    "Pelvis Academy — no patient at risk",
    "Pelvis Academy — ไม่มีผู้ป่วยเสี่ยง",
  ),
  bi(
    "24-year-old motorcyclist: BP 82/50, HR 132. Teaching APC pattern; assessment and resuscitation run in parallel.",
    "ชาย 24 ปี รถจักรยานยนต์ BP 82/50 HR 132 แบบจำลอง APC ประเมินและ resuscitation คู่ขนาน",
  ),
  bi(
    "Source patient: male 22, car crash, BP 80/50 with response, left hip pain. Binder documented before image review.",
    "ผู้ป่วยในเอกสาร: ชาย 22 ปี รถชน BP 80/50 มี response เจ็บสะโพกซ้าย บันทึก binder ก่อนอ่านภาพ",
  ),
  bi(
    "Source patient: male 15, motorcycle crushed by car, BP 70/40, urethral blood and flank laceration. Do not presume open communication or urethral rupture.",
    "ผู้ป่วยในเอกสาร: ชาย 15 ปี รถจักรยานยนต์ถูกรถชน BP 70/40 meatal blood และแผล flank ยังไม่ยืนยัน open communication หรือ urethral rupture",
  ),
  bi(
    "Trauma Shift — retrieve, review mistakes, then finish the shift.",
    "Trauma Shift — ทบทวน แก้ข้อผิดพลาด แล้วจบเวร",
  ),
];
const caseTitles = [
  bi("Pelvis Academy", "Pelvis Academy"),
  bi("Red Alert", "Red Alert — ภาวะเลือดออก"),
  bi("The Hidden Fracture", "The Hidden Fracture — อ่านภาพ"),
  bi("Danger Down Below", "Danger Down Below — บาดเจ็บร่วม"),
  bi("Trauma Shift", "Trauma Shift — ทบทวนท้ายเวร"),
];
const pretestRows: Row[] = finalRows.map((item, i) => ({
  ...item,
  id: `PT${i + 1}`,
  mustPass: false,
  title: bi(
    item.title.en.replace("Trauma Shift: ", "Pre-test: "),
    item.title.th.replace("Trauma Shift: ", "แบบทดสอบก่อนเรียน: "),
  ),
}));
const allRows = [...practiceRows, ...bosses, ...finalRows, ...pretestRows];
export const v4Rows = new Map(allRows.map((row) => [row.id, row]));
const outcomeFor: Record<LOId, "O1" | "O2" | "O3" | "O4" | "O5" | "O6"> = {
  LO1: "O1", LO2: "O2", LO3: "O3", LO4: "O2", LO5: "O4", LO6: "O5", LO7: "O6",
};
const pretestStory = bi(
  "Pre-test — 8 quick items before the cases. Answer from what you know now; there is no penalty and you will see your score at the end.",
  "แบบทดสอบก่อนเรียน — 8 ข้อสั้นๆ ก่อนเริ่มเคส ตอบตามที่รู้ตอนนี้ ไม่มีการหักคะแนน และจะเห็นคะแนนเมื่อทำครบ",
);
// Bloom level of each practice skill (teacher analysis; remember < understand < apply < analyse).
const bloomByKind: Record<string, "remember" | "understand" | "apply" | "analyse"> = {
  hotspot: "remember", memory_match: "understand", card_sort: "understand", gauge: "understand",
  sequence: "apply", card_pick: "apply", handover_builder: "apply", image_pick: "apply", ring_trace: "analyse", mcq: "understand",
};
const nodes: Node[] = allRows.map((row) => {
  const pretest = row.id.startsWith("PT");
  const index = pretest ? -1 : row.id.startsWith("FS") ? 4 : Number(row.id[1]);
  const story =
    index === 1 && ["C1S6", "C1S7"].includes(row.id)
      ? bi(
          `${stories[1].en} Fixed teaching reveal: BP briefly rises, then falls again. Continue resuscitation and review urgent haemorrhage control before remote CT.`,
          `${stories[1].th} ข้อมูลที่กำหนดไว้: BP เพิ่มช่วงสั้นแล้วลดอีก ดูแล resuscitation ต่อ ประเมิน haemorrhage control ด่วนก่อน CT ที่อยู่ไกล`,
        )
      : pretest
        ? pretestStory
        : stories[index];
  const stage = pretest
    ? "pretest"
    : row.id.startsWith("FS")
    ? "gauntlet"
    : row.id.includes("B")
      ? "boss"
      : "practice";
  return {
    ...previous.nodes[0],
    id: row.id,
    contentVersion: MINIGAME_VERSION,
    caseId: pretest ? "case-pre" : `case-${index}`,
    missionId: pretest ? "mission-pre" : `mission-${index}`,
    mustPass: Boolean(row.mustPass),
    bloom: bloomByKind[(row.game.rounds?.at(-1) ?? row.game).kind] ?? "understand",
    guideline: row.guideline,
    interaction: row.game.kind,
    game: row.game,
    objectiveIds: row.lo,
    sourceRefs: [{ doc: row.doc ?? "S", page: row.page }],
    reviewNote: row.note,
    stage,
    stem: story.en,
    question: row.title.en,
    translation: {
      title: row.title,
      story,
      key: row.key,
      why: bi(
        `${row.key.en}${row.guideline ? ` ${row.guideline.en}` : ""} Discuss the evidence, priorities and uncertainty with your senior.`,
        `${row.key.th}${row.guideline ? ` ${row.guideline.th}` : ""} อภิปรายหลักฐาน ลำดับสำคัญและความไม่แน่ชัดกับ senior`,
      ),
    },
    factsAvailableNow: [story.en],
    vitals: [],
    assetId: null,
    visuals: [],
    textAlternative: row.game.alt.en,
    // Map lesson objectives onto the platform's outcome codes (O1–O6) instead of inheriting O1 for every station.
    outcomeIds: [...new Set(row.lo.map((lo) => outcomeFor[lo]))],
    options: [
      {
        id: row.id + "_PASS",
        text: "Station cleared",
        explanation: row.key.en,
      },
      {
        id: row.id + "_MISS",
        text: "Review and correct",
        explanation: row.key.en,
      },
    ],
    correctOptionIds: [row.id + "_PASS"],
    rationaleRequired: row.game.kind === "handover_builder" && !pretest,
    explanationBeforeChoices: row.game.kind === "handover_builder" && !pretest,
    rationalePrompt: "Connect evidence, priorities and uncertainty.",
    conceptIds: pretest ? [] : row.concepts ?? [],
    safetyFlag: !pretest && Boolean(row.concepts?.length),
    retryId: row.id + "_R",
    nextNodeId: null,
    resourceIds: [
      `R${row.lo.includes("LO6") ? 3 : row.lo.includes("LO3") ? 4 : row.lo.includes("LO4") ? 5 : row.lo.includes("LO7") ? 6 : row.lo.includes("LO5") || row.lo.includes("LO2") ? 2 : 1}`,
    ],
    referenceIds: [],
    teaching: {
      objective: row.lo.join(", "),
      keyMessage: row.key.en,
      misconception: row.game.mistake,
      discussionPrompt:
        "Explain what evidence changes your priorities, and what remains uncertain.",
      suggestedFeedback: row.key.en,
      sources: [`${row.doc ?? "S"} p${row.page}`],
    },
  };
});
const missions = caseTitles.map((title, index) => {
  const ids = [
    ...nodes.filter(
      (n) => n.missionId === `mission-${index}` && n.stage === "practice",
    ),
    ...nodes.filter(
      (n) => n.missionId === `mission-${index}` && n.stage === "boss",
    ),
    ...nodes.filter(
      (n) => n.missionId === `mission-${index}` && n.stage === "gauntlet",
    ),
  ].map((n) => n.id);
  ids.forEach((id, i) => {
    nodes.find((n) => n.id === id)!.nextNodeId = ids[i + 1] ?? null;
  });
  return {
    id: `mission-${index}`,
    number: index + 1,
    title: title.en,
    entry: stories[index].en,
    estimatedMinutes: index === 4 ? 8 : 10,
    nodeIds: ids,
  };
});
// Pre-test mission: answered before Case 0; reviewed once all eight items are answered.
const pretestIds = nodes.filter((n) => n.stage === "pretest").map((n) => n.id);
pretestIds.forEach((id, i) => {
  nodes.find((n) => n.id === id)!.nextNodeId = pretestIds[i + 1] ?? null;
});
missions.push({
  id: "mission-pre",
  number: 6,
  title: "Pre-test",
  entry: pretestStory.en,
  estimatedMinutes: 6,
  nodeIds: pretestIds,
});
export const v4CaseTitles = caseTitles;
export const v4ResourceText = [
  bi("Anatomy, ligaments and force direction", "Anatomy ligament และทิศทางแรง"),
  bi("ATLS, shock and resuscitation", "ATLS shock และ resuscitation"),
  bi("Binder: placement and reassessment", "Binder: ตำแหน่งและ reassessment"),
  bi(
    "AP, inlet/outlet, CT and stability clues",
    "AP inlet/outlet CT และ stability clues",
  ),
  bi("Open injury, soft tissue and GU", "Open injury soft tissue และ GU"),
  bi(
    "Referral and senior haemorrhage planning",
    "Referral และแผน haemorrhage โดย senior",
  ),
];
const newFigures = [16, 38, 41, 44, 50].map((page) => ({
  ...previous.assets[0],
  id: `V4_S${page}`,
  path: `/assets/teaching/slide-${page}.jpg`,
  versionHash: `supplied-slide-${page}-v4`,
  sourceUrl: `/resources/pelvic-fracture-medical-student-2024.pdf#page=${page}`,
  owner: "Supplied teaching resource",
  licensePermission:
    "User supplied; institutional and third-party image reuse approval required",
  reviewStatus: "pending" as const,
  reviewer: null,
  reviewDate: null,
  altText: `Annotated supplied slide ${page}; use its authored source report, not invented diagnostic findings`,
  caption: `Supplied teaching slide ${page}, annotations shown in feedback`,
  optional: false,
}));
export const pelvicTraumaContentV4: ContentVersion = {
  ...previous,
  assets: [...previous.assets, ...newFigures],
  id: MINIGAME_VERSION,
  title: "Pelvic Trauma Decisions — mini-game draft",
  governance: {
    ...previous.governance,
    status: "draft",
    reviewer: null,
    reviewDate: null,
    supersedesVersion: previous.id,
  },
  missions,
  nodes,
  corrections: nodes.map((n) => ({
    id: n.retryId,
    contentVersion: MINIGAME_VERSION,
    parentNodeId: n.id,
    conceptIds: n.conceptIds,
    outcomeIds: n.outcomeIds,
    resourceId: n.resourceIds[0],
    stem: n.question,
    options: [
      {
        id: n.retryId + "_PASS",
        text: "Corrected",
        explanation: n.teaching!.keyMessage,
      },
      {
        id: n.retryId + "_MISS",
        text: "Review again",
        explanation: n.teaching!.keyMessage,
      },
    ],
    correctOptionId: n.retryId + "_PASS",
    workedExample: n.teaching!.keyMessage,
    game: n.game,
  })),
  resources: [
    previous.resources.find((r) => r.id === "ORIENTATION")!,
    ...v4ResourceText.map((title, i) => ({
      id: `R${i + 1}`,
      title: title.en,
      estimatedMinutes: 4,
      body: practiceRows
        .filter((row) =>
          row.lo.includes(
            (["LO1", "LO5", "LO6", "LO3", "LO4", "LO7"] as LOId[])[i],
          ),
        )
        .map((row) => row.key.en),
      sourceDocumentIds: previous.sourceDocuments.map((d) => d.id),
    })),
  ],
  finalForms: [],
};
