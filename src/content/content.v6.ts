import { pelvicTraumaContentV5 as focused } from "./content.v5.ts";
import { lectureBankContent as bank } from "./lectureBank.ts";
import { bi } from "./content.v4.ts";
import { FOCUSED_TEST_VERSION } from "../games/spec.ts";
import type { ContentVersion, Node } from "../domain/types.ts";

// Focused edition (v5 cases unchanged) with a 3-item pre-test before the cases and a matched 3-item post-test after.
// v5 stays immutable for its saved attempts; this is a separate edition id.
// Blueprint: binder level (must-pass), no Foley with meatal blood (must-pass), shock recognition.
const testItems: Array<{ pre: string; post: string; id: number }> = [
  { pre: "PT6", post: "FS6", id: 1 },
  { pre: "PT2", post: "FS2", id: 2 },
  { pre: "PT5", post: "FS5", id: 3 },
];
const preStory = bi(
  "Pre-test — 3 quick items before the cases. Answer from what you know now; there is no penalty and you will see your score at the end.",
  "แบบทดสอบก่อนเรียน — 3 ข้อสั้นๆ ก่อนเริ่มเคส ตอบตามที่รู้ตอนนี้ ไม่มีการหักคะแนน และจะเห็นคะแนนตอนจบ",
);
const postStory = bi(
  "Post-test — the same 3 skills with new cards. Your first try counts toward the pass standard.",
  "แบบทดสอบหลังเรียน — ทักษะเดิม 3 ข้อ ด้วยการ์ดชุดใหม่ ครั้งแรกที่ตอบใช้ตัดสินผ่านเกณฑ์",
);
const testNode = (sourceId: string, id: string, missionId: string, story: typeof preStory): Node => {
  const source = bank.nodes.find((node) => node.id === sourceId)!;
  const title = id.startsWith("PT")
    ? source.translation!.title
    : bi(source.translation!.title.en.replace("Trauma Shift: ", "Post-test: "), source.translation!.title.th.replace("Trauma Shift: ", "แบบทดสอบหลังเรียน: "));
  return {
    ...source,
    id,
    contentVersion: FOCUSED_TEST_VERSION,
    caseId: `case-${missionId}`,
    missionId,
    stem: story.en,
    question: title.en,
    factsAvailableNow: [story.en],
    translation: { ...source.translation!, title, story },
    options: [
      { id: `${id}_PASS`, text: "Station cleared", explanation: source.teaching!.keyMessage },
      { id: `${id}_MISS`, text: "Review and correct", explanation: source.teaching!.keyMessage },
    ],
    correctOptionIds: [`${id}_PASS`],
    retryId: `${id}_R`,
    nextNodeId: null,
  };
};
const preNodes = testItems.map((item) => testNode(item.pre, `PT${item.id}`, "mission-pre", preStory));
const postNodes = testItems.map((item) => testNode(item.post, `FS${item.id}`, "mission-post", postStory));
const caseNodes: Node[] = focused.nodes.map((node) => ({ ...node, contentVersion: FOCUSED_TEST_VERSION }));
for (const list of [preNodes, postNodes]) list.forEach((node, i) => { node.nextNodeId = list[i + 1]?.id ?? null; });
const nodes = [...caseNodes, ...preNodes, ...postNodes];

export const pelvicTraumaContentV6: ContentVersion = {
  ...focused,
  id: FOCUSED_TEST_VERSION,
  title: "Pelvic Trauma Decisions — focused edition with pre/post test",
  governance: { ...focused.governance, status: "draft", supersedesVersion: focused.id, reviewer: null, reviewDate: null },
  missions: [
    { id: "mission-pre", number: 4, title: "Pre-test", entry: preStory.en, estimatedMinutes: 3, nodeIds: preNodes.map((node) => node.id), contentVersion: FOCUSED_TEST_VERSION },
    ...focused.missions.map((mission) => ({ ...mission, contentVersion: FOCUSED_TEST_VERSION })),
    { id: "mission-post", number: 5, title: "Post-test", entry: postStory.en, estimatedMinutes: 3, nodeIds: postNodes.map((node) => node.id), contentVersion: FOCUSED_TEST_VERSION },
  ],
  nodes,
  corrections: [
    ...focused.corrections.map((correction) => ({ ...correction, contentVersion: FOCUSED_TEST_VERSION })),
    ...[...preNodes, ...postNodes].map((node) => ({
      id: node.retryId,
      contentVersion: FOCUSED_TEST_VERSION,
      parentNodeId: node.id,
      conceptIds: node.conceptIds,
      outcomeIds: node.outcomeIds,
      resourceId: node.resourceIds[0],
      stem: node.question,
      options: [
        { id: `${node.retryId}_PASS`, text: "Corrected", explanation: node.teaching!.keyMessage },
        { id: `${node.retryId}_MISS`, text: "Review again", explanation: node.teaching!.keyMessage },
      ],
      correctOptionId: `${node.retryId}_PASS`,
      workedExample: node.teaching!.keyMessage,
      game: node.game,
    })),
  ],
  resources: focused.resources.map((resource) => ({ ...resource, contentVersion: FOCUSED_TEST_VERSION })),
};
