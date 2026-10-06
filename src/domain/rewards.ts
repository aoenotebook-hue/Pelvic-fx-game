import type { ContentVersion, DerivedProgress, LearningEvent } from "./types";
import { deriveProgress } from "./engine";
import { rewardLedger, type RewardSummary } from "./rewardRules";
export * from "./rewardRules";
export function computeRewards(content: ContentVersion, events: LearningEvent[], existingProgress?: DerivedProgress): RewardSummary {
  const progress = existingProgress ?? deriveProgress(content,events);
  return rewardLedger({version:content.id, firstCorrect:progress.firstCorrectNodeIds, corrected:progress.correctedNodeIds, cleared:progress.clearedNodeIds, cases:content.missions.filter((mission)=>progress.missionReviewed[mission.id]).map((mission)=>mission.id), badges:progress.concepts.filter((concept)=>concept.resolved).map((concept)=>concept.conceptId), completed:progress.locallyComplete});
}
