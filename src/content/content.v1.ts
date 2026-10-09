import type { Asset, ContentVersion, CorrectionItem, Mission, Node, Option, Resource, SourceDocument } from "../domain/types";
import { contentVersionSchema, validateContentLinks } from "../domain/schema.ts";

const VERSION = "ptd-en-draft-2026-10-01";
const confidence = ["low", "medium", "high"] as const;

function options(prefix: string, texts: [string, string, string], correct: "A" | "B" | "C", reasons: [string, string, string]): Option[] {
  return (["A", "B", "C"] as const).map((letter, index) => ({
    id: `${prefix}_${letter}`,
    text: texts[index],
    explanation: `${letter === correct ? "Preferred: " : "Why not: "}${reasons[index]}`
  }));
}

function node(input: Omit<Node, "contentVersion" | "responseMode" | "rationalePrompt" | "confidenceOptions" | "acceptedConditions" | "referenceIds" | "assetId"> & { assetId?: string | null }): Node {
  return {
    ...input,
    contentVersion: VERSION,
    responseMode: "single",
    rationalePrompt: "Give one short reason, or write ‘I am unsure’.",
    confidenceOptions: [...confidence],
    acceptedConditions: [],
    referenceIds: ["BOAST-2018", "WSES-2017", "LOCAL-PATHWAY-PENDING"],
    assetId: input.assetId ?? null
  };
}

const missions: Mission[] = [
  {
    id: "mission-1", number: 1, title: "The unstable patient", estimatedMinutes: 8,
    entry: "A fictional 24-year-old motorcyclist arrives 35 minutes after injury with pelvic pain, cool peripheries, HR 132/min and BP 82/50 mmHg. The airway is patent. You are a supervised junior member of the trauma team. The pelvis may not be the only bleeding source.",
    nodeIds: ["M1N1", "M1N2", "M1N3", "M1N4", "M1N5", "M1N6"]
  },
  {
    id: "mission-2", number: 2, title: "The apparently stable patient", estimatedMinutes: 8,
    entry: "A fictional 40-year-old pedestrian is currently physiologically stable after assessment, with persistent posterior pelvic pain. This mission uses a labelled textual imaging description, not an interpretation of a missing image.",
    nodeIds: ["M2N1", "M2N2", "M2N3", "M2N4", "M2N5"]
  },
  {
    id: "mission-3", number: 3, title: "The hidden open injury", estimatedMinutes: 8,
    entry: "A fictional 32-year-old man after a crush injury has a pelvic ring injury, a small perineal wound without visible bone and blood at the urethral meatus. Circulation has improved but remains monitored. No intimate photograph is required.",
    nodeIds: ["M3N1", "M3N2", "M3N3", "M3N4"]
  }
];

const nodes: Node[] = [
  node({
    id: "M1N1", caseId: "case-unstable", missionId: "mission-1", outcomeIds: ["O1"], conceptIds: ["S1"], safetyFlag: true,
    stem: missions[0].entry, factsAvailableNow: ["High-energy mechanism", "Pelvic pain", "Cool peripheries", "Airway patent"],
    vitals: [{ label: "HR", value: "132/min" }, { label: "BP", value: "82/50 mmHg" }], textAlternative: "No image is required; use the stated clinical evidence.",
    question: "What should drive the next action?",
    options: options("M1N1", ["Establish a detailed fracture subtype first.", "Possible major haemorrhage with physiological compromise.", "The pain score alone."], "B", ["A detailed label must not delay urgent assessment and escalation.", "The physiological findings require urgent assessment and escalation for possible major haemorrhage.", "Pain matters, but it does not address the systemic threat."]),
    correctOptionIds: ["M1N1_B"], resourceIds: ["R2"], retryId: "M1N1_R", nextNodeId: "M1N2"
  }),
  node({
    id: "M1N2", caseId: "case-unstable", missionId: "mission-1", outcomeIds: ["O4"], conceptIds: ["S1"], safetyFlag: true,
    stem: "The concerning physiology persists while the team continues the trauma assessment.", factsAvailableNow: ["Possible major haemorrhage", "Other threats and bleeding sites still require assessment"], vitals: [{ label: "BP", value: "82/50 mmHg" }], textAlternative: "Text evidence is complete.",
    question: "Which is the best immediate bundle?",
    options: options("M1N2", ["Finish CT before calling the senior team.", "Repeat pelvic stability testing until the pattern is clear.", "Continue the primary survey, activate trauma/haemorrhage support and arrange indicated temporary stabilization."], "C", ["This may delay care during physiological compromise.", "Repeated provocative manipulation does not resolve the immediate threat and may cause harm.", "Assessment, resuscitation, escalation and indicated stabilization can proceed together."]),
    correctOptionIds: ["M1N2_C"], resourceIds: ["R2"], retryId: "M1N2_R", nextNodeId: "M1N3"
  }),
  node({
    id: "M1N3", caseId: "case-unstable", missionId: "mission-1", outcomeIds: ["O5"], conceptIds: ["S2"], safetyFlag: true,
    assetId: "A16",
    stem: "The team considers a pelvic binder indicated. This question assesses landmark recognition, not physical application.", factsAvailableNow: ["A binder is indicated under the local pathway"], vitals: [], textAlternative: "Choose between the named anatomical levels; no image is needed.",
    question: "At which level should the binder be centred?",
    options: options("M1N3", ["Iliac crests.", "Greater trochanters.", "Umbilicus."], "B", ["This landmark is too high.", "The intended level is the greater trochanters.", "This landmark is too high."]),
    correctOptionIds: ["M1N3_B"], resourceIds: ["R3"], retryId: "M1N3_R", nextNodeId: "M1N4"
  }),
  node({
    id: "M1N4", caseId: "case-unstable", missionId: "mission-1", outcomeIds: ["O4"], conceptIds: ["S3"], safetyFlag: true,
    stem: "Initial measures have started, but BP remains low. CT requires transport away from the resuscitation area.", factsAvailableNow: ["Unresolved physiological compromise", "CT is remote from resuscitation"], vitals: [{ label: "BP", value: "Remains low" }], textAlternative: "Text evidence is complete.",
    question: "What is the best next plan in this setting?",
    options: options("M1N4", ["Routine transfer to CT now.", "Observation alone.", "Continue resuscitation and urgent senior haemorrhage-control planning."], "C", ["Remote transport may introduce unsafe delay in this scenario.", "Observation alone does not address ongoing compromise.", "Treatment and escalation continue; imaging depends on physiology, response and local capability."]),
    correctOptionIds: ["M1N4_C"], resourceIds: ["R2"], retryId: "M1N4_R", nextNodeId: "M1N5"
  }),
  node({
    id: "M1N5", caseId: "case-unstable", missionId: "mission-1", outcomeIds: ["O1", "O4"], conceptIds: [], safetyFlag: false,
    stem: "BP briefly improves and then falls again. This is a fixed teaching reveal, not a calculated effect of your earlier choice.", factsAvailableNow: ["Transient response", "Other bleeding sources must still be considered"], vitals: [{ label: "BP trend", value: "Brief rise, then fall" }], textAlternative: "Text evidence is complete.",
    question: "What does this response mean?",
    options: options("M1N5", ["Bleeding is controlled.", "Ongoing compromise needs reassessment and escalation.", "One named pelvic artery is definitely bleeding."], "B", ["A brief response is not proof of control.", "The trend remains concerning and requires reassessment and escalation.", "The trend cannot establish one specific bleeding source."]),
    correctOptionIds: ["M1N5_B"], resourceIds: ["R2"], retryId: "M1N5_R", nextNodeId: "M1N6"
  }),
  node({
    id: "M1N6", caseId: "case-unstable", missionId: "mission-1", outcomeIds: ["O6"], conceptIds: [], safetyFlag: false,
    stem: "The receiving team needs a concise referral while urgent care continues.", factsAvailableNow: ["High-energy mechanism", "Concerning physiological trend", "Initial actions and response"], vitals: [{ label: "Trend", value: "Transient response with recurrent hypotension" }], textAlternative: "Text evidence is complete.",
    question: "Which referral is most useful now?",
    options: options("M1N6", ["‘Pelvis fracture, please review.’", "Give only the fracture classification.", "Give the mechanism, physiological trend, actions, response, concerns and an urgent request."], "C", ["This omits decision-critical evidence and urgency.", "Classification alone omits physiology and response.", "The receiving team gets the current problem, urgency and explicit request."]),
    correctOptionIds: ["M1N6_C"], resourceIds: ["R4"], retryId: "M1N6_R", nextNodeId: null
  }),
  node({
    id: "M2N1", caseId: "case-stable", missionId: "mission-2", outcomeIds: ["O3"], conceptIds: [], safetyFlag: false,
    assetId: "A15",
    stem: missions[1].entry, factsAvailableNow: ["Current physiology is stable", "Persistent posterior pelvic pain"], vitals: [], textAlternative: "The imaging task is textual; no diagnostic image is supplied.",
    question: "What comes first when reviewing the AP pelvis?",
    options: options("M2N1", ["Check image quality, orientation and binder status.", "Guess a detailed subtype immediately.", "Assume a normal-looking image excludes injury."], "A", ["Establish the image context and limitations first.", "A label without an ordered evidence review is premature.", "A normal appearance can be limited or affected by a binder."]),
    correctOptionIds: ["M2N1_A"], resourceIds: ["R1"], retryId: "M2N1_R", nextNodeId: "M2N2"
  }),
  node({
    id: "M2N2", caseId: "case-stable", missionId: "mission-2", outcomeIds: ["O3"], conceptIds: [], safetyFlag: false,
    assetId: "A15",
    stem: "The fictional AP report describes pubic rami fractures and asymmetry around the sacroiliac region.", factsAvailableNow: ["Anterior ring injury described", "Posterior-region asymmetry described"], vitals: [], textAlternative: "Text report: pubic rami fractures plus sacroiliac-region asymmetry.",
    question: "What is the best interpretation strategy?",
    options: options("M2N2", ["Stop the review after finding the rami fractures.", "Examine anterior and posterior ring findings together.", "Ignore the posterior pain."], "B", ["This risks an incomplete ring assessment.", "Anterior and posterior evidence both matter.", "Posterior pain is relevant evidence, not a distraction."]),
    correctOptionIds: ["M2N2_B"], resourceIds: ["R1"], retryId: "M2N2_R", nextNodeId: "M2N3"
  }),
  node({
    id: "M2N3", caseId: "case-stable", missionId: "mission-2", outcomeIds: ["O3"], conceptIds: [], safetyFlag: false,
    stem: "Current observations show BP 122/76 mmHg.", factsAvailableNow: ["Current circulation appears physiologically stable", "Structural evidence remains incomplete"], vitals: [{ label: "BP", value: "122/76 mmHg" }], textAlternative: "Text evidence is complete.",
    question: "Does this prove that the pelvic ring is mechanically stable?",
    options: options("M2N3", ["Yes.", "No; physiological and mechanical stability are different judgments.", "Only the heart rate determines mechanical stability."], "B", ["A current blood pressure does not establish structural stability.", "Circulation and structural stability require separate assessment.", "Heart rate is physiological evidence, not structural proof."]),
    correctOptionIds: ["M2N3_B"], resourceIds: ["R1"], retryId: "M2N3_R", nextNodeId: "M2N4"
  }),
  node({
    id: "M2N4", caseId: "case-stable", missionId: "mission-2", outcomeIds: ["O3", "O4", "O5"], conceptIds: ["S4"], safetyFlag: true,
    stem: "The patient remains monitored and physiologically stable. Posterior pain and concerning AP findings persist. A binder remains in place, and appropriate CT and specialist review are available.", factsAvailableNow: ["Sustained monitored stability", "Persistent posterior concern", "A bound image may mask displacement", "Safe imaging access is available"], vitals: [{ label: "BP", value: "Stable while monitored" }], textAlternative: "Text evidence is complete.",
    question: "What is the best plan?",
    options: options("M2N4", ["Remove the binder immediately because the first image looks reassuring.", "Repeat provocative pelvic examination before deciding.", "Continue monitoring, obtain appropriate imaging and specialist review, and use an agreed senior reassessment and binder-removal plan."], "C", ["A binder can reduce and mask disruption; removal needs an agreed plan.", "Repeated provocative testing is unsafe and does not answer the imaging question.", "This respects the stable monitored context, imaging limitations and senior reassessment needed for removal."]),
    correctOptionIds: ["M2N4_C"], resourceIds: ["R1", "R3"], retryId: "M2N4_R", nextNodeId: "M2N5"
  }),
  node({
    id: "M2N5", caseId: "case-stable", missionId: "mission-2", outcomeIds: ["O6"], conceptIds: [], safetyFlag: false,
    stem: "You need to explain what is known and what remains uncertain.", factsAvailableNow: ["Anterior injury is described", "Posterior involvement and stability still need clarification"], vitals: [{ label: "BP", value: "122/76 mmHg" }], textAlternative: "Text evidence is complete.",
    question: "Which explanation best fits the available evidence?",
    options: options("M2N5", ["‘Normal BP means this is a minor injury.’", "‘The anterior injury is visible; posterior involvement and stability need clarification.’", "‘Every fracture like this requires identical surgery.’"], "B", ["This confuses current physiology with injury severity.", "This states the known evidence and the remaining uncertainty.", "Definitive treatment is not universal and cannot be inferred here."]),
    correctOptionIds: ["M2N5_B"], resourceIds: ["R4"], retryId: "M2N5_R", nextNodeId: null
  }),
  node({
    id: "M3N1", caseId: "case-open", missionId: "mission-3", outcomeIds: ["O2"], conceptIds: ["S6"], safetyFlag: true,
    stem: missions[2].entry, factsAvailableNow: ["Small perineal wound", "No visible bone", "Pelvic ring injury"], vitals: [{ label: "Circulation", value: "Improved, still monitored" }], textAlternative: "Text description replaces an intimate clinical photograph.",
    question: "Which interpretation is safest?",
    options: options("M3N1", ["This is definitely closed because bone is not visible.", "A possible open injury needs urgent assessment.", "Wait for infection before reviewing the wound."], "B", ["Absent visible bone does not exclude communication.", "The wound raises concern and requires urgent appropriate assessment without claiming proof.", "Waiting for infection delays necessary assessment."]),
    correctOptionIds: ["M3N1_B"], resourceIds: ["R2"], retryId: "M3N1_R", nextNodeId: "M3N2"
  }),
  node({
    id: "M3N2", caseId: "case-open", missionId: "mission-3", outcomeIds: ["O2"], conceptIds: ["S5"], safetyFlag: true,
    stem: "Blood is present at the urethral meatus. A colleague proposes repeated blind catheter attempts.", factsAvailableNow: ["Meatal bleeding is a warning sign", "Exact urethral injury is not established"], vitals: [{ label: "Circulation", value: "Monitored" }], textAlternative: "Text evidence is complete.",
    question: "What is the best response?",
    options: options("M3N2", ["Agree to repeated blind attempts.", "Ignore urinary assessment altogether.", "Pause blind attempts and escalate for the urethral evaluation/drainage pathway."], "C", ["Repeated blind attempts risk further harm.", "This neglects an important associated-injury warning.", "Escalate the concern; the treating team decides timing and drainage under the local pathway."]),
    correctOptionIds: ["M3N2_C"], resourceIds: ["R2"], retryId: "M3N2_R", nextNodeId: "M3N3"
  }),
  node({
    id: "M3N3", caseId: "case-open", missionId: "mission-3", outcomeIds: ["O2", "O4"], conceptIds: [], safetyFlag: false,
    stem: "Trauma care continues while the wound and urinary concerns are coordinated.", factsAvailableNow: ["Possible open injury", "Suspected urethral injury", "Learner is supervised"], vitals: [{ label: "Circulation", value: "Improved, still monitored" }], textAlternative: "Text evidence is complete.",
    question: "Which plan is best?",
    options: options("M3N3", ["Wound care alone without further trauma review.", "Ongoing trauma care, urgent multidisciplinary assessment and the local open-injury pathway.", "Probe the wound yourself as a student."], "B", ["This is incomplete and drops the wider trauma and urinary concerns.", "Maintain trauma priorities while escalating associated-injury concerns.", "Probing exceeds the supervised learner role and may cause harm."]),
    correctOptionIds: ["M3N3_B"], resourceIds: ["R2"], retryId: "M3N3_R", nextNodeId: "M3N4"
  }),
  node({
    id: "M3N4", caseId: "case-open", missionId: "mission-3", outcomeIds: ["O6"], conceptIds: [], safetyFlag: false,
    stem: "Prepare a focused referral that communicates concern without claiming an unproven diagnosis.", factsAvailableNow: ["Possible open pelvic injury", "Suspected urethral injury", "Current physiology and urgency"], vitals: [{ label: "Circulation", value: "Improved, still monitored" }], textAlternative: "Text evidence is complete.",
    question: "Which referral best represents the uncertainty?",
    options: options("M3N4", ["‘There is a confirmed complete urethral transection.’", "‘There is no concern because BP improved.’", "‘There is possible open pelvic injury and suspected urethral injury; here is the current physiology and our request for urgent review.’"], "C", ["This overstates what one sign can establish.", "Improved BP does not erase separate wound and urinary concerns.", "This communicates evidence-based concern, current status and an explicit request."]),
    correctOptionIds: ["M3N4_C"], resourceIds: ["R4"], retryId: "M3N4_R", nextNodeId: null
  })
];

const sourceDocuments: SourceDocument[] = [
  { id: "SRC_SLIDES", title: "Pelvic Fracture for Medical Student (2024)", href: "/resources/pelvic-fracture-medical-student-2024.pdf", language: "English", note: "Supplied CNMI teaching slides by Sorawut Thamyongkit." },
  { id: "SRC_PLAN", title: "Pelvic Injury Teaching Plan", href: "/resources/pelvic-injury-teaching-plan-th.pdf", language: "Thai", note: "Supplied course plan listing objectives, pre-class preparation and specialist consultation." },
  { id: "SRC_HANDOUT", title: "Pelvic Fracture Teaching Handout", href: "/resources/pelvic-fracture-teaching-handout-th.pdf", language: "Thai", note: "Supplied detailed teaching handout by Kulapat Chulsomlee." }
];

const resources: Resource[] = [
  {
    id: "R1", title: "The ring, evidence and stability", estimatedMinutes: 3,
    body: [
      "The pelvic ring has anterior and posterior components. Finding an anterior fracture should prompt a systematic review of the rest of the ring rather than ending the assessment. Mechanism helps anticipate problems, but a mechanism label alone does not establish the patient’s current condition.",
      "Review an AP pelvis in order: image quality and orientation; whether a binder is present; pelvic alignment; anterior structures including pubic rami and symphysis; posterior clues at the sacrum and sacroiliac regions. State what is visible and what remains uncertain. Further imaging depends on the whole trauma assessment, physiology and local capability.",
      "Physiological stability concerns circulation and response over time. Mechanical stability concerns the injured structure. A normal blood pressure at one moment does not prove an intact or mechanically stable ring. A fracture label alone is not a complete resuscitation plan.",
      "Broad mechanism terms can organize learning. Do not delay urgent assessment and escalation to obtain a detailed subtype, and do not guess a subtype from insufficient imaging."
    ], selfPrompt: "What do I know about the circulation, what do I know about the ring, and what evidence is missing?", assetIds: ["A14", "A15"], sourceDocumentIds: ["SRC_SLIDES", "SRC_HANDOUT"]
  },
  {
    id: "R2", title: "Priorities, safe assessment and associated injuries", estimatedMinutes: 3,
    body: [
      "Use a structured trauma assessment. Recognize concerning physiology and trends, continue assessment for other threats and activate senior trauma and haemorrhage support early. Resuscitation and indicated temporary stabilization can proceed while assessment continues. Follow the approved local pathway; students recognize priorities and communicate rather than independently prescribe definitive intervention.",
      "Imaging decisions depend on physiological response and the ability to continue safe care. During persistent compromise with CT remote from resuscitation, routine transport before escalation may create risk. A monitored patient with a sustained response may have a different plan. No single pathway fits every hospital or patient.",
      "Do not use repeated provocative pelvic compression as a student task. A perineal wound may communicate with pelvic injury even when bone is not visible. Communicate the concern and seek urgent review; do not probe the wound yourself.",
      "Blood at the urethral meatus is a warning for urethral injury. Pause blind attempts and escalate to the appropriate evaluation and drainage pathway. A sign raises suspicion; it does not by itself prove a specific injury or complete disruption."
    ], selfPrompt: "What must happen now, what can proceed in parallel, and what concern must I explicitly communicate?", assetIds: ["A17"], sourceDocumentIds: ["SRC_SLIDES", "SRC_PLAN", "SRC_HANDOUT"]
  },
  {
    id: "R3", title: "Binder reasoning and reassessment", estimatedMinutes: 3,
    body: [
      "When a binder is indicated under the local pathway, correct positioning matters. Its centre should be at the greater trochanters rather than the waist, iliac crests or umbilicus. This module assesses landmark recognition, not binder application.",
      "A binder can reduce displacement and mask injury on an image. A normal-looking AP obtained with a binder does not automatically exclude important ring injury or justify immediate removal. Communicate the binder’s presence and request an agreed senior reassessment, imaging and removal plan.",
      "Continue reassessment of physiology and response. A brief improvement does not prove bleeding is controlled or identify one bleeding vessel. If a binder is described as too high, request trained review and correction while urgent care continues. Follow the device instructions and institutional pathway for actual application and ongoing care."
    ], selfPrompt: "Is the position appropriate, how does the binder affect interpretation, and what is the reassessment plan?", assetIds: ["A16"], sourceDocumentIds: ["SRC_SLIDES", "SRC_PLAN", "SRC_HANDOUT"]
  },
  {
    id: "R4", title: "Decision and specialist consultation", estimatedMinutes: 1,
    body: [
      "Recognize current threats from physiology, mechanism and trend. Continue structured assessment and parallel indicated treatment and escalation. Separate physiological from mechanical stability. Review anterior and posterior evidence and imaging limitations. Identify wound and urinary concerns; avoid harmful repeated testing or blind attempts. Reassess response and state uncertainty. Communicate the next action and team needed.",
      "For specialist consultation or transfer, give the mechanism, current physiology and trend, examination and imaging findings, associated-injury concerns, treatments already started, the response, and the specific help requested.",
      "Consultation practice is not proof of diagnosis or procedural competence. The supervised learner should state uncertainty and use the local referral pathway."
    ], sourceDocumentIds: ["SRC_PLAN", "SRC_HANDOUT"]
  },
  {
    id: "ORIENTATION", title: "How the game works", estimatedMinutes: 3,
    body: [
      "You are joining the trauma team as a supervised student. At each stop, review the information currently available, choose an action, state your confidence and give a short reason. Use the reference cards when needed. Read the feedback and correct uncertain decisions. Pausing does not cost points.",
      "Worked example: A referral contains only a fracture name. Which addition would help the team? Preferred: current physiology and the requested action. A receiving team needs the current situation and an explicit request. This example is unscored.",
      "Completion means you reviewed the learning requirements; it does not certify hands-on skill or independent trauma care."
    ], sourceDocumentIds: ["SRC_PLAN", "SRC_SLIDES", "SRC_HANDOUT"]
  }
];

const assets: Asset[] = [
  { id: "A10", path: "/favicon.svg", versionHash: "local-original-1", sourceUrl: null, owner: "Course application", licensePermission: "Original neutral application symbol", reviewStatus: "approved", reviewer: null, reviewDate: null, altText: "Abstract pelvic-ring application mark", caption: "Pelvic Trauma Decisions", optional: false, downloadBytes: 790 },
  { id: "A11", path: "/assets/student-avatar.png", versionHash: "generated-original-1", sourceUrl: null, owner: "Course application", licensePermission: "Original AI-generated decorative character; not clinical evidence", reviewStatus: "approved", reviewer: null, reviewDate: null, altText: "Cartoon clinical-year medical student holding a clipboard", caption: "Learner character", optional: false, downloadBytes: 1468000 },
  { id: "A12", path: "/assets/faculty-mahidol.png", versionHash: "supplied-slide-crop-1", sourceUrl: null, owner: "Mahidol University", licensePermission: "Supplied in faculty teaching slides; institutional reuse confirmation required before release", reviewStatus: "pending", reviewer: null, reviewDate: null, altText: "Mahidol University mark", caption: "Faculty branding from supplied teaching material", optional: false, downloadBytes: 55000 },
  { id: "A13", path: "/assets/cnmi.png", versionHash: "supplied-slide-crop-1", sourceUrl: null, owner: "CNMI Ramathibodi Orthopaedic Surgery", licensePermission: "Supplied in faculty teaching slides; institutional reuse confirmation required before release", reviewStatus: "pending", reviewer: null, reviewDate: null, altText: "CNMI Ramathibodi Orthopaedic Surgery mark", caption: "CNMI branding from supplied teaching material", optional: false, downloadBytes: 20000 },
  { id: "A14", path: "/assets/teaching/slide-4.jpg", versionHash: "supplied-slide-page-4", sourceUrl: "/resources/pelvic-fracture-medical-student-2024.pdf#page=4", owner: "Supplied teaching resource", licensePermission: "User supplied for course use; third-party figure permission must be confirmed before publication", reviewStatus: "pending", reviewer: null, reviewDate: null, altText: "Anterior views of male and female pelvic anatomy labelled ilium, sacrum, pubis, ischium and pubic symphysis", caption: "Pelvic anatomy — supplied 2024 teaching slides, page 4", optional: false, downloadBytes: 198000 },
  { id: "A15", path: "/assets/teaching/slide-14.jpg", versionHash: "supplied-slide-page-14", sourceUrl: "/resources/pelvic-fracture-medical-student-2024.pdf#page=14", owner: "Supplied teaching resource", licensePermission: "User supplied for course use; image permission and deidentification must be confirmed before publication", reviewStatus: "pending", reviewer: null, reviewDate: null, altText: "Labelled AP pelvis review showing sacroiliac joints, symphysis, pelvic lines, iliac wings, hips and image positioning", caption: "Systematic AP pelvis review — supplied 2024 teaching slides, page 14", optional: false, downloadBytes: 218000 },
  { id: "A16", path: "/assets/teaching/binder-positioning.jpg", versionHash: "supplied-slide-page-34-crop", sourceUrl: "/resources/pelvic-fracture-medical-student-2024.pdf#page=34", owner: "Supplied teaching resource", licensePermission: "User supplied for course use; third-party illustration permission must be confirmed before publication", reviewStatus: "pending", reviewer: null, reviewDate: null, altText: "Three diagrams comparing pelvic binder positions, including the intended position over the greater trochanters", caption: "Binder positioning — cropped from supplied 2024 teaching slides, page 34", optional: false, downloadBytes: 112000 },
  { id: "A17", path: "/assets/teaching/slide-12.jpg", versionHash: "supplied-slide-page-12", sourceUrl: "/resources/pelvic-fracture-medical-student-2024.pdf#page=12", owner: "Supplied teaching resource", licensePermission: "User supplied for course use; table source permission must be confirmed before publication", reviewStatus: "pending", reviewer: null, reviewDate: null, altText: "Table of associated injuries reported with pelvic fracture, including head, long-bone, abdominal, peripheral nerve, thoracic and lower urinary tract injuries", caption: "Associated injuries table — supplied 2024 teaching slides, page 12", optional: false, downloadBytes: 130000 },
  { id: "A18", path: "/assets/student-avatar-niran.png", versionHash: "generated-original-2026-10-01", sourceUrl: null, owner: "Course application", licensePermission: "Original AI-generated decorative character; not clinical evidence", reviewStatus: "approved", reviewer: null, reviewDate: null, altText: "Cartoon adult medical student with glasses, navy scrubs and a short white coat", caption: "Learner character 2", optional: false, downloadBytes: 667889 },
  { id: "A19", path: "/assets/student-avatar-arin.png", versionHash: "generated-original-2026-10-01", sourceUrl: null, owner: "Course application", licensePermission: "Original AI-generated decorative character; not clinical evidence", reviewStatus: "approved", reviewer: null, reviewDate: null, altText: "Cartoon adult medical student with short hair, navy scrubs and a short white coat", caption: "Learner character 3", optional: false, downloadBytes: 636535 },
  { id: "A78", path: "/assets/student-avatar-4.png", versionHash: "generated-original-2026-10-02", sourceUrl: null, owner: "Course application", licensePermission: "Original AI-generated decorative character; not clinical evidence", reviewStatus: "approved", reviewer: null, reviewDate: null, altText: "Cartoon adult medical student with short curly hair, teal scrubs and a short white coat", caption: "Learner character 4", optional: false, downloadBytes: 0 },
  { id: "A20", path: "/assets/patient-1.png", versionHash: "generated-original-2026-10-01", sourceUrl: null, owner: "Course application", licensePermission: "Original AI-generated non-graphic fictional patient; not clinical evidence", reviewStatus: "approved", reviewer: null, reviewDate: null, altText: "Concerned fictional adult patient lying in a hospital bed", caption: "Mission 1 fictional patient", optional: false, downloadBytes: 595799 },
  { id: "A21", path: "/assets/patient-2.png", versionHash: "generated-original-2026-10-01", sourceUrl: null, owner: "Course application", licensePermission: "Original AI-generated non-graphic fictional patient; not clinical evidence", reviewStatus: "approved", reviewer: null, reviewDate: null, altText: "Fictional adult patient resting in a hospital bed", caption: "Mission 2 fictional patient", optional: false, downloadBytes: 602340 },
  { id: "A22", path: "/assets/patient-3.png", versionHash: "generated-original-2026-10-01", sourceUrl: null, owner: "Course application", licensePermission: "Original AI-generated non-graphic fictional patient; not clinical evidence", reviewStatus: "approved", reviewer: null, reviewDate: null, altText: "Alert fictional adult patient lying in a hospital bed", caption: "Mission 3 fictional patient", optional: false, downloadBytes: 598234 },
  { id: "A23", path: "/assets/emergency-room.jpg", versionHash: "generated-original-2026-10-01", sourceUrl: null, owner: "Course application", licensePermission: "Original AI-generated decorative environment; not clinical evidence", reviewStatus: "approved", reviewer: null, reviewDate: null, altText: "Illustrated emergency room with three curtained patient bays and an open floor", caption: "Emergency-room game environment", optional: false, downloadBytes: 274963 },
  ...([1, 2, 3] as const).flatMap((character) => (["observe", "urgent", "inspect", "communicate", "celebrate", "reconsider"] as const).map((state, index) => ({
    id: `A${24 + (character - 1) * 6 + index}`,
    path: `/assets/reactions/character-${character}-${state}.png`,
    versionHash: "generated-reaction-set-2026-10-01",
    sourceUrl: null,
    owner: "Course application",
    licensePermission: "Original AI-generated decorative learner reaction; not clinical evidence",
    reviewStatus: "approved" as const,
    reviewer: null,
    reviewDate: null,
    altText: `Cartoon learner character showing a ${state} reaction`,
    caption: `Learner reaction: ${state}`,
    optional: false,
    downloadBytes: 0
  }))),
  ...([1, 2, 3] as const).flatMap((character) => ([1, 2, 3, 4, 5] as const).map((level, index) => ({
    id: `A${42 + (character - 1) * 5 + index}`,
    path: `/assets/upgrades/character-${character}-level-${level}.png`,
    versionHash: "generated-clothing-progression-2026-10-02",
    sourceUrl: null,
    owner: "Course application",
    licensePermission: "Original AI-generated decorative clothing progression; not clinical evidence",
    reviewStatus: "approved" as const,
    reviewer: null,
    reviewDate: null,
    altText: `Learner character ${character} wearing professional clothing level ${level}`,
    caption: `Reward clothing level ${level}`,
    optional: false,
    downloadBytes: 0
  }))),
  ...(["observe", "urgent", "inspect", "communicate", "celebrate", "reconsider"] as const).map((state, index) => ({
    id: `A${79 + index}`,
    path: `/assets/reactions/character-4-${state}.png`,
    versionHash: "generated-reaction-set-2026-10-02",
    sourceUrl: null,
    owner: "Course application",
    licensePermission: "Original AI-generated decorative learner reaction; not clinical evidence",
    reviewStatus: "approved" as const,
    reviewer: null,
    reviewDate: null,
    altText: `Cartoon learner character 4 showing a ${state} reaction`,
    caption: `Learner 4 reaction: ${state}`,
    optional: false,
    downloadBytes: 0
  })),
  ...([1, 2, 3, 4, 5] as const).map((level, index) => ({
    id: `A${85 + index}`,
    path: `/assets/upgrades/character-4-level-${level}.png`,
    versionHash: "generated-clothing-progression-2026-10-02",
    sourceUrl: null,
    owner: "Course application",
    licensePermission: "Original AI-generated decorative clothing progression; not clinical evidence",
    reviewStatus: "approved" as const,
    reviewer: null,
    reviewDate: null,
    altText: `Learner character 4 wearing professional clothing level ${level}`,
    caption: `Learner 4 clothing reward level ${level}`,
    optional: false,
    downloadBytes: 0
  })),
  ...([...nodes.map((node) => node.id), "mission-1-reassured", "mission-1-concerned", "mission-2-reassured", "mission-2-concerned", "mission-3-reassured", "mission-3-concerned"] as const).map((state, index) => ({
    id: `A${57 + index}`,
    path: `/assets/patient-reactions/${state}.png`,
    versionHash: "generated-patient-situation-set-2026-10-02",
    sourceUrl: null,
    owner: "Course application",
    licensePermission: "Original AI-generated non-graphic fictional patient response; not clinical evidence or simulated outcome",
    reviewStatus: "approved" as const,
    reviewer: null,
    reviewDate: null,
    altText: `Fictional patient response for ${state}`,
    caption: `Situation-specific fictional patient response: ${state}`,
    optional: false,
    downloadBytes: 0
  })),
  ...(["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09"] as const).map((id) => ({ id, path: null, versionHash: "not-provided", sourceUrl: null, owner: null, licensePermission: null, reviewStatus: "not_provided" as const, reviewer: null, reviewDate: null, altText: "Text equivalent supplied in the learning content", caption: "Optional approved clinical media not provided", optional: true, downloadBytes: 0 }))
];

function correction(
  id: string,
  parentNodeId: string | null,
  stem: string,
  texts: [string, string, string],
  key: "A" | "B" | "C",
  reasons: [string, string, string],
  resourceId: string,
  conceptIds: CorrectionItem["conceptIds"] = [],
  outcomeIds: CorrectionItem["outcomeIds"] = []
): CorrectionItem {
  return {
    id, parentNodeId, stem, options: options(id, texts, key, reasons), correctOptionId: `${id}_${key}`,
    resourceId, conceptIds, outcomeIds,
    workedExample: `Review ${resourceId}. The preferred choice is ${key} because ${reasons[["A", "B", "C"].indexOf(key)]}`
  };
}

const corrections: CorrectionItem[] = [
  correction("M1N1_R", "M1N1", "A new high-energy trauma patient remains hypotensive with cool skin. What should guide action while injury details are clarified?", ["Wait for a subtype label.", "Escalate possible haemorrhage while continuing assessment.", "Treat only the pain score."], "B", ["Waiting for a subtype delays care.", "Unresolved physiology requires action before complete classification.", "Pain alone does not address the systemic problem."], "R2", ["S1"], ["O1"]),
  correction("M1N2_R", "M1N2", "The senior trauma team is being called. Which pair of tasks can proceed together?", ["Continue primary survey and initiate the indicated resuscitation and stabilization response.", "Wait silently and stop monitoring.", "Finish repeated pelvic compression tests and postpone escalation."], "A", ["Assessment and treatment proceed concurrently.", "This interrupts necessary care.", "This adds manipulation and delay."], "R2", ["S1"], ["O4"]),
  correction("M1N3_R", "M1N3", "A binder is described as centred at the waist. Which response is appropriate?", ["Accept the waist as the correct landmark.", "Move it to the umbilicus.", "Request trained review and correction to the greater-trochanter level while ongoing care continues."], "C", ["The waist is too high.", "The umbilicus is also too high.", "The student identifies the correct lower landmark and escalates appropriately."], "R3", ["S2"], ["O5"]),
  correction("M1N4_R", "M1N4", "Compare patient X, with persistent low BP and CT remote from resuscitation, with patient Y, who has a sustained response and monitored access to CT. Which principle is correct?", ["Both must always have identical imaging timing.", "Physiology, response and capability guide imaging while treatment continues.", "CT always precedes resuscitation."], "B", ["This ignores the different clinical contexts.", "Imaging decisions depend on physiology, response and resources.", "Treatment must not be stopped to obtain a classification."], "R2", ["S3"], ["O4"]),
  correction("M1N5_R", "M1N5", "A handover says BP rose briefly and then fell again. Which added information helps?", ["Current physiology, treatment response and other possible bleeding concerns.", "Only a fracture name.", "State that one specific artery is proven to bleed."], "A", ["Trends and associated concerns guide escalation.", "A fracture name alone is incomplete.", "The specific source is unsupported."], "R2", [], ["O1", "O4"]),
  correction("M1N6_R", "M1N6", "‘Pelvic fracture after a collision’ is the entire referral. What should be added first?", ["Decorative terminology.", "A more confident subtype without evidence.", "Current physiological trend, actions and response, and an explicit urgent request."], "C", ["Decorative wording adds no useful evidence.", "This invents certainty.", "This communicates actionable status and the requested help."], "R4", [], ["O6"]),
  correction("M2N1_R", "M2N1", "A report describes a fracture but omits image quality and whether a binder is present. What is missing?", ["Nothing.", "Context needed to interpret the image and its limitations.", "Proof that all posterior structures are normal."], "B", ["Image context matters.", "Quality and binder status affect interpretation.", "Normal posterior structures cannot be inferred from an omission."], "R1", [], ["O3"]),
  correction("M2N2_R", "M2N2", "A text report describes rami fractures plus sacroiliac asymmetry. Which region still needs particular clarification?", ["Posterior ring and sacroiliac region.", "No additional region.", "Only the skin over the knee."], "A", ["The posterior finding is relevant.", "This closes review too early.", "This distracts from the stated pelvic evidence."], "R1", [], ["O3"]),
  correction("M2N3_R", "M2N3", "The patient has normal current vital signs. Which statement can remain uncertain?", ["Whether a pulse exists.", "Whether the BP was measured.", "Whether the pelvic ring is mechanically stable."], "C", ["This is not the stability distinction in question.", "The BP is already stated.", "Normal physiology does not establish structural stability."], "R1", [], ["O3"]),
  correction("M2N4_R", "M2N4", "A binder remains in place and the first AP image looks reassuring. What should guide the next step?", ["Remove it immediately because the image looks normal.", "Seek senior reassessment and follow an agreed imaging and removal plan while monitoring continues.", "Repeatedly compress the pelvis to prove stability."], "B", ["A binder can reduce and mask disruption.", "The bound image must be interpreted in context and removal planned with the senior team.", "Provocative testing may cause harm and is not the student’s task."], "R3", ["S4"], ["O3", "O4", "O5"]),
  correction("M2N5_R", "M2N5", "Replace ‘BP is normal, so there is nothing important to assess.’", ["‘Known anterior injury and unresolved posterior findings require further assessment while physiology is monitored.’", "‘All fractures require the same operation.’", "‘Posterior pain never matters.’"], "A", ["This states known and unknown evidence.", "This asserts unsupported universal treatment.", "This discards relevant evidence."], "R4", [], ["O6"]),
  correction("M3N1_R", "M3N1", "A different small perineal wound is present with pelvic trauma; no bone is seen. Does that exclude an open injury?", ["Yes.", "Only wound size determines it.", "No; possible communication needs urgent assessment."], "C", ["Visible bone is not required.", "Wound size alone does not determine communication.", "The concern remains and needs review."], "R2", ["S6"], ["O2"]),
  correction("M3N2_R", "M3N2", "Meatal bleeding occurs after pelvic trauma. What is the safest student response?", ["Keep trying blind catheterization.", "Escalate suspected urethral injury for an appropriate evaluation and drainage plan.", "Diagnose complete transection solely from this sign."], "B", ["Repeated blind attempts risk harm.", "Communicate the warning and use the appropriate pathway.", "This claims more than the sign establishes."], "R2", ["S5"], ["O2"]),
  correction("M3N3_R", "M3N3", "A referral mentions only the ring fracture and omits the wound and urinary finding. Which concerns must be added?", ["Possible open injury and suspected urethral injury alongside current physiology.", "Only the final fracture code.", "No further information."], "A", ["These findings affect urgent multidisciplinary assessment.", "This omits important associated concerns.", "This leaves the receiving team without decision-critical evidence."], "R2", [], ["O2", "O4"]),
  correction("M3N4_R", "M3N4", "Replace ‘Complete urethral transection is confirmed because blood is visible.’", ["‘There is no urinary concern.’", "‘BP improved, so no review is needed.’", "‘Urethral injury is suspected; urgent assessment is requested, with current physiology and wound concerns communicated.’"], "C", ["This ignores the warning sign.", "Improved circulation does not erase associated concerns.", "This states an evidence-based concern and explicit request."], "R4", [], ["O6"])
];

export const pelvicTraumaContent: ContentVersion = {
  id: VERSION,
  title: "Pelvic Trauma Decisions English draft",
  governance: { author: "Course content team", reviewer: null, reviewDate: null, status: "draft", supersedesVersion: null },
  missions, nodes, corrections, resources, sourceDocuments, assets, finalForms: []
};

const parsed = contentVersionSchema.safeParse(pelvicTraumaContent);
if (!parsed.success) throw new Error(`Invalid content schema: ${parsed.error.message}`);
const linkErrors = validateContentLinks(parsed.data);
if (linkErrors.length) throw new Error(`Invalid content links: ${linkErrors.join("; ")}`);

export const contentByNode = new Map(nodes.map((item) => [item.id, item]));
export const correctionById = new Map(corrections.map((item) => [item.id, item]));
export const resourceById = new Map(resources.map((item) => [item.id, item]));
export const assetById = new Map(assets.map((item) => [item.id, item]));
export const sourceDocumentById = new Map(sourceDocuments.map((item) => [item.id, item]));
