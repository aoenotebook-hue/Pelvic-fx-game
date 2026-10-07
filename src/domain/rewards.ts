import type { ContentVersion, DerivedProgress, LearningEvent } from "./types";
import { deriveProgress } from "./engine";
import { rewardLedger, type RewardSummary } from "./rewardRules";
export * from "./rewardRules";
export function computeRewards(content: ContentVersion, events: LearningEvent[], existingProgress?: DerivedProgress): RewardSummary {
  const progress = existingProgress ?? deriveProgress(content,events);
  const rewardNodes=content.nodes.filter(n=>!n.stage||n.stage==="practice").map(n=>n.id);
  return rewardLedger({version:content.id,nodeCount:rewardNodes.length,caseCount:content.missions.filter(m=>m.id!=="mission-4").length, firstCorrect:progress.firstCorrectNodeIds.filter(id=>rewardNodes.includes(id)), corrected:progress.correctedNodeIds.filter(id=>rewardNodes.includes(id)), cleared:progress.clearedNodeIds.filter(id=>rewardNodes.includes(id)), cases:content.missions.filter((mission)=>progress.missionReviewed[mission.id]&&(!content.id.startsWith("ptd-minigame-")||mission.id!=="mission-4")).map((mission)=>mission.id), badges:progress.concepts.filter((concept)=>concept.resolved).map((concept)=>concept.conceptId), completed:progress.locallyComplete});
}
