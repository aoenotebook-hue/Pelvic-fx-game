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
      "<750 mL (<15%); normal/minimally increased HR; normal SBP",
      "<750 mL (<15%); HR ปกติ/เพิ่มเล็กน้อย SBP ปกติ",
      "blood",
      "I",
    ),
    c(
      "II",
      "750–1500 mL (15–30%); HR >100; SBP normal; urine 20–30 mL/h",
      "750–1500 mL (15–30%); HR >100 SBP ปกติ urine 20–30 mL/h",
      "blood",
      "II",
    ),
    c(
      "III",
      "1500–2000 mL (30–40%); HR >120; SBP falls; urine 5–15 mL/h",
      "1500–2000 mL (30–40%); HR >120 SBP ลด urine 5–15 mL/h",
      "blood",
      "III",
    ),
    c(
      "IV",
      ">2000 mL (>40%); HR >140; SBP falls greatly; minimal urine",
      ">2000 mL (>40%); HR >140 SBP ลดมาก urine น้อยมาก",
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
        "padding",
        "Knees/ankles padded; supported alignment",
        "รองเข่าและข้อเท้า จัดแนวอย่างปลอดภัย",
        "binder",
      ),
      c(
        "force",
        "Force rotation despite hip injury",
        "ฝืนหมุนขาทั้งที่สงสัย hip injury",
        "body",
      ),
    ],
    ["padding"],
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
      "Senior-led haemorrhage protocol; reassess fluids",
      "แผน haemorrhage โดย senior ประเมิน fluid ซ้ำ",
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
      "Binder with the senior team",
      "Binder ภายใต้ทีมอาวุโส",
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
  pick(
    [
      c(
        "cef",
        "Cefazolin 2 g: handout Grades I–II",
        "Cefazolin 2 g: handout Grade I–II",
        "antibiotic",
      ),
      c(
        "gent",
        "Gentamicin 240 mg IV / 30 min",
        "Gentamicin 240 mg IV / 30 min",
        "antibiotic",
      ),
      c(
        "pen",
        "Penicillin 2.4 MU: contaminated Grade III",
        "Penicillin 2.4 MU: Grade III ปนเปื้อน",
        "antibiotic",
      ),
      c(
        "tet",
        "Assess tetanus prophylaxis",
        "ประเมิน tetanus prophylaxis",
        "tetanus",
      ),
      c(
        "deb",
        "Urgent senior surgical debridement plan",
        "ทีมอาวุโสวางแผน debridement ด่วน",
        "team",
      ),
      c(
        "slide",
        "Use slide 29's different doses as equivalent",
        "ถือว่าขนาดยา S29 เหมือน handout",
        "antibiotic",
      ),
      c(
        "delay",
        "Wait for symptoms of infection",
        "รอมีอาการติดเชื้อ",
        "wound",
      ),
    ],
    ["cef", "gent", "pen", "tet", "deb"],
    "wound",
  ),
  s("gauge", [], {
    range: [0, 180],
    band: [0, 60],
    unit: "min",
    art: "antibiotic",
    instruction: bi(
      "Do not wait: early antibiotics, ideally within 1 h (current BOAST).",
      "ไม่รอ: ให้ antibiotic เร็วที่สุด ideally ≤1 h (BOAST)",
    ),
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
        "Resists external rotation",
        "ต้าน external rotation",
      ],
      [
        "Sacrospinous",
        "Sacrospinous",
        "Pelvic-floor rotational restraint",
        "ต้าน rotation ของ pelvic floor",
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
        "Key strong stability complex",
        "โครงสร้างสำคัญต่อ stability",
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
        ["very", ">40%", ">40%"],
        ["common", "20–40%", "20–40%"],
        ["less", "<20%", "<20%"],
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
      note: "Source-recall exercise: S23 teaches a fixed 2 L crystalloid load. NICE NG39 advises no crystalloids for active bleeding in hospital. Do not present this source regimen as a current universal order; local protocol/senior review required.",
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
      "Greater trochanters; supported alignment, padding and skin checks.",
      "Greater trochanters จัดแนวอย่างปลอดภัย รองผ้าและตรวจผิวหนัง",
    ),
    {
      doc: "H",
      concepts: ["S2"],
      note: "The tightness gauge is conceptual, not validated pressure. Avoid forced leg rotation when hip injury is suspected; trained senior applies the device.",
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
        c("thigh", "Compression around the thighs", "กดที่ต้นขา", "body"),
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
      sequence(
        [
          c(
            "re",
            "Reassess transient response; continue resuscitation",
            "ประเมิน transient response และ resuscitation ต่อ",
            "blood",
          ),
          c(
            "fast",
            "FAST and other bleeding-source assessment",
            "FAST และหาแหล่งเลือดอื่น",
            "organ",
          ),
          c(
            "senior",
            "Senior haemorrhage-control decision",
            "ทีมอาวุโสเลือก haemorrhage control",
            "phone",
          ),
        ],
        ["re", "fast", "senior"],
      ),
    ]),
    ["LO5"],
    38,
    bi(
      "80% venous, 20% arterial in the source; angio addresses arteries, not venous bleeding.",
      "เอกสาร: venous 80% arterial 20%; angio ไม่แก้ venous bleeding",
    ),
    {
      note: "S38 flowchart thresholds (SBP 100, 4 U PRBC, lactate 4) are source-specific, not an autonomous algorithm. Imaging, packing, embolization and ex-fix decisions require the trauma team.",
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
        c("acet", "Acetabulum / hip congruence", "Acetabulum / hip congruence"),
        c("rami", "Pubic rami / symphysis", "Pubic rami / symphysis"),
      ],
      {
        targets: ["acet", "rami"],
        image: "/assets/teaching/slide-14.jpg",
        instruction: bi(
          "Trace all four checkpoints, then mark report-supported abnormalities: acetabular injury, posterior hip dislocation and rami injury.",
          "ไล่ 4 จุด แล้วเลือกจุดที่รายงานสนับสนุน: acetabulum, posterior hip dislocation และ rami",
        ),
      },
    ),
    ["LO3"],
    41,
    bi(
      "Review hip congruence and both rings; the source case report is authoritative.",
      "ตรวจ hip congruence และทั้งสอง ring ยึดรายงานเคสจากเอกสาร",
    ),
    {
      note: "S14 is an annotated normal reading example, not the injured patient's film. Abnormality scoring follows S41's report, not invented pixel findings. No validated diagnostic hotspot overlay.",
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
      note: "Plan quotes 25°/60°, whereas handout pp13–14 states 30–45° for each direction. Exact beam angles must be approved; direction/diagnostic purpose is taught without a disputed angle.",
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
      "Protect dignity and consent. Meatal blood suggests GU injury; it does not confirm the diagnosis.",
      "รักษาศักดิ์ศรีและ consent; meatal blood ชวนคิด GU injury ไม่ยืนยัน diagnosis",
    ),
    {
      note: "The plan invents a high-riding prostate finding. None is supplied for this patient: do not reveal it as an observed result. No intimate exam is performed by a junior independently.",
    },
  ),
  r(
    "C3S3",
    "Compression-test safety",
    "ความปลอดภัย compression test",
    combo([
      sequence(
        [
          c(
            "med",
            "Source: medial pressure",
            "ในเอกสาร: medial pressure",
            "body",
          ),
          c(
            "post",
            "Source: posterior iliac pressure",
            "ในเอกสาร: posterior iliac pressure",
            "body",
          ),
          c(
            "pub",
            "Source: posterior pubis pressure",
            "ในเอกสาร: posterior pubis pressure",
            "body",
          ),
        ],
        ["med", "post", "pub"],
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
      "The sequence is source recall, not an action to perform in this unstable case.",
      "ลำดับนี้เพื่อทบทวนเอกสาร ไม่ใช่ให้ทำในเคส unstable",
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
      "Open means communication with the fracture. Blood PR/PV raises suspicion, not certainty.",
      "Open คือแผลติดต่อ fracture; เลือด PR/PV เป็นข้อสงสัย ไม่ยืนยัน",
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
      "Source-table recall only: confirm allergy, age/weight, renal function and local protocol before prescribing.",
      "ทบทวนตารางเท่านั้น ก่อนสั่งยาต้องตรวจ allergy อายุ/น้ำหนัก renal function และ local protocol",
    ),
    {
      doc: "H",
      note: "S29: cefazolin 1 g/gentamicin 240 mg/penicillin 1.2 MU; H19: cefazolin 2 g for I–II, add gentamicin 240 mg (30 min) for III, penicillin 2.4 MU for contamination. H19 does not explicitly restate the Grade III cefazolin dose. H19 timing ≤3 h conflicts with BOAST ideally ≤1 h. These adult source doses are NOT prescriptions for this 15-year-old.",
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
        "Document L5/S1 ankle movement, sensation and ankle reflex",
        "บันทึก L5/S1 movement sensation และ ankle reflex",
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
  "FS4",
  "Binder reassessment",
  "ทบทวน binder",
  image(
    [
      c(
        "team",
        "Senior review: AP with binder may mask injury; plan safe removal ≤24 h",
        "Senior review: AP ที่มี binder อาจซ่อน injury วางแผนปลด ≤24 h",
        "binder",
      ),
      c(
        "normal",
        "Normal AP alone: remove immediately without review",
        "AP ปกติ: ปลดเองทันที",
        "beam",
      ),
    ],
    "team",
  ),
  ["LO6"],
  18,
  bi(
    "Normal AP under a binder does not exclude unstable injury; use an agreed senior removal plan.",
    "AP ปกติขณะมี binder ไม่ตัด unstable injury ใช้แผนที่ตกลงกับ senior",
  ),
  {
    doc: "H",
    concepts: ["S4"],
    note: "H18 says remove after normal AP; BOAST notes binder can mask instability and requires a safe removal protocol, ideally within 24 h. Retain supervised reassessment rather than an automatic removal instruction.",
  },
);
const finalRows = [
  practiceRows[2],
  practiceRows[18],
  practiceRows[14],
  practiceRows[20],
  practiceRows[5],
  practiceRows[7],
  practiceRows[23],
  removal,
].map((row, i) => retrieval(`FS${i + 1}`, row, "gauntlet"));
const alternateRetrieval = [
  image(
    [
      c(
        "lc",
        "Side impact / compression: LC",
        "แรงด้านข้าง / compression: LC",
        "force-lc",
      ),
      c(
        "apc",
        "Side impact / compression: APC",
        "แรงด้านข้าง / compression: APC",
        "force-apc",
      ),
      c(
        "vs",
        "Side impact / compression: VS",
        "แรงด้านข้าง / compression: VS",
        "force-vs",
      ),
    ],
    "lc",
  ),
  pick(
    [
      c(
        "stop",
        "Avoid repeating pelvic compression",
        "ไม่ตรวจ pelvic compression ซ้ำ",
        "body",
      ),
      c(
        "senior",
        "Escalate instability to the senior",
        "แจ้ง instability ต่อ senior",
        "phone",
      ),
      c(
        "repeat",
        "Repeat testing after every response",
        "ตรวจซ้ำหลังทุก response",
        "body",
      ),
    ],
    ["stop", "senior"],
  ),
  image(
    [
      c(
        "inlet",
        "AP translation: inlet view",
        "AP translation: inlet view",
        "beam-inlet",
      ),
      c(
        "outlet",
        "AP translation: outlet view",
        "AP translation: outlet view",
        "beam-outlet",
      ),
      c(
        "judet",
        "AP translation: Judet view",
        "AP translation: Judet view",
        "beam",
      ),
    ],
    "inlet",
  ),
  wound,
  pick(
    [
      c(
        "loss",
        "Class III: 1500–2000 mL estimate",
        "Class III: ประมาณ 1500–2000 mL",
        "blood",
      ),
      c(
        "trend",
        "Reassess response and trends",
        "ประเมิน response และ trends ซ้ำ",
        "blood",
      ),
      c(
        "normal",
        "Normal BP excludes blood loss",
        "BP ปกติตัด blood loss",
        "blood",
      ),
      c(
        "measure",
        "Class estimates are measured patient losses",
        "Class คือปริมาณที่วัดได้จริง",
        "blood",
      ),
    ],
    ["loss", "trend"],
  ),
  sequence(
    [
      c(
        "senior",
        "Senior-led assessment and application",
        "ทีมอาวุโสประเมินและใช้ binder",
        "team",
      ),
      c(
        "troch",
        "Position over greater trochanters",
        "วางเหนือ greater trochanters",
        "binder",
      ),
      c(
        "check",
        "Reassess skin, physiology and removal plan",
        "ตรวจผิวหนัง physiology และแผนปลดซ้ำ",
        "body",
      ),
    ],
    ["senior", "troch", "check"],
  ),
  handover(1),
  pick(
    [
      c(
        "review",
        "Senior reassessment of imaging and physiology",
        "Senior ประเมินภาพและ physiology ซ้ำ",
        "team",
      ),
      c(
        "plan",
        "Agreed safe removal protocol; inspect skin",
        "แผนปลดอย่างปลอดภัย ตรวจผิวหนัง",
        "binder",
      ),
      c(
        "mask",
        "Recognize binder may mask AP instability",
        "ทราบว่า binder อาจซ่อน instability ใน AP",
        "beam",
      ),
      c(
        "remove",
        "Remove independently after normal AP",
        "ปลดเองเมื่อ AP ปกติ",
        "binder",
      ),
    ],
    ["review", "plan", "mask"],
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
const allRows = [...practiceRows, ...bosses, ...finalRows];
export const v4Rows = new Map(allRows.map((row) => [row.id, row]));
const nodes: Node[] = allRows.map((row) => {
  const index = row.id.startsWith("FS") ? 4 : Number(row.id[1]);
  const story =
    index === 1 && ["C1S6", "C1S7"].includes(row.id)
      ? bi(
          `${stories[1].en} Fixed teaching reveal: BP briefly rises, then falls again. Continue resuscitation and review urgent haemorrhage control before remote CT.`,
          `${stories[1].th} ข้อมูลที่กำหนดไว้: BP เพิ่มช่วงสั้นแล้วลดอีก ดูแล resuscitation ต่อ ประเมิน haemorrhage control ด่วนก่อน CT ที่อยู่ไกล`,
        )
      : stories[index];
  const stage = row.id.startsWith("FS")
    ? "gauntlet"
    : row.id.includes("B")
      ? "boss"
      : "practice";
  return {
    ...previous.nodes[0],
    id: row.id,
    contentVersion: MINIGAME_VERSION,
    caseId: `case-${index}`,
    missionId: `mission-${index}`,
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
        `${row.key.en} Use the source and discuss the supporting evidence, priority and uncertainty with your senior.`,
        `${row.key.th} ทบทวนเอกสารแล้วอภิปรายหลักฐาน ลำดับสำคัญและความไม่แน่ชัดกับ senior`,
      ),
    },
    factsAvailableNow: [story.en],
    vitals: [],
    assetId: null,
    visuals: [],
    textAlternative: row.game.alt.en,
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
    rationaleRequired: row.game.kind === "handover_builder",
    explanationBeforeChoices: row.game.kind === "handover_builder",
    rationalePrompt: "Connect evidence, priorities and uncertainty.",
    conceptIds: row.concepts ?? [],
    safetyFlag: Boolean(row.concepts?.length),
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
