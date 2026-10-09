// Prints the station catalogue and sheet column schema as JSON for scripts/build-evaluation-sheet.py.
// Run: npx tsx scripts/station-catalog.ts > /tmp/catalog.json
import { pelvicTraumaContentV4 as content } from "../src/content/content.v4.ts";
import { EVALUATION_TABS, TEACHER_TABS } from "../src/domain/evaluationExport.ts";

const phase = { pretest: "pre-test", practice: "practice", boss: "boss review", gauntlet: "post-test" } as const;
const stations = content.nodes.map((node) => ({
  id: node.id,
  phase: phase[node.stage ?? "practice"],
  case: content.missions.find((mission) => mission.id === node.missionId)?.title ?? node.missionId,
  title: node.translation?.title.en ?? node.question,
  objectives: (node.objectiveIds ?? []).join(";"),
  bloom: node.bloom ?? "",
  mustPass: Boolean(node.mustPass),
  kind: node.game?.kind ?? "",
  key: node.translation?.key.en ?? "",
}));
console.log(JSON.stringify({ contentVersion: content.id, stations, tabs: EVALUATION_TABS, teacherTabs: TEACHER_TABS }, null, 2));
