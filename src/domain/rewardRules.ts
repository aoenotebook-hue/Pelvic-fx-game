// Shared browser/server ledger, independent of UI, storage and providers.
export const LEGACY_VERSION = "ptd-en-draft-2026-10-01";
export const REVISION_VERSION = "ptd-caseflow-draft-2026-10-02";
export type RewardScheme = "legacy-150" | "collections-250" | "minigames-v4";
export interface RewardAchievement { id: string; kind: "decision" | "case" | "safety" | "shift"; points: number; }
export interface RewardSummary { scheme: RewardScheme; total: number; maximum: number; level: number; nextThreshold: number | null; achievements: RewardAchievement[]; caseStamps: string[]; safetyBadges: string[]; }
const thresholdsFor = (scheme: RewardScheme,maximum=355) => scheme === "legacy-150" ? [0,30,60,90,120] : scheme==="minigames-v4"?[0,...[.16,.36,.60,.84].map(f=>Math.ceil(f*maximum))]:[0,40,90,150,210];
export function clothingLevelFor(total: number, scheme: RewardScheme = "collections-250",maximum=355) { return thresholdsFor(scheme,maximum).filter((threshold) => total >= threshold).length || 1; }
export function rewardLedger(input: { version: string; firstCorrect: string[]; corrected: string[]; cleared: string[]; cases: string[]; badges: string[]; completed: boolean;nodeCount?:number;caseCount?:number }): RewardSummary {
  const scheme: RewardScheme = input.version === LEGACY_VERSION ? "legacy-150" : input.version === "ptd-minigame-draft-2026-10-07"?"minigames-v4":"collections-250";
  const maximum=scheme==="minigames-v4"?(input.nodeCount??24)*10+(input.caseCount??4)*15+30+25:scheme==="legacy-150"?150:250;
  const achievements: RewardAchievement[] = [];
  const unique = (ids: string[]) => [...new Set(ids)];
  const caseStamps = unique(input.cases), safetyBadges = unique(input.badges);
  const decisions = scheme === "legacy-150" ? unique([...input.firstCorrect,...input.corrected]) : unique(input.cleared);
  for (const id of decisions) achievements.push({id: `decision:${id}`,kind:"decision",points: input.firstCorrect.includes(id) ? 10 : scheme === "legacy-150" ? 5 : 8});
  if (scheme !== "legacy-150") {
    for (const id of caseStamps) achievements.push({id:`case:${id}`,kind:"case",points:15});
    for (const id of safetyBadges) achievements.push({id:`safety:${id}`,kind:"safety",points:5});
    if (input.completed) achievements.push({id:"shift:complete",kind:"shift",points:25});
  }
  const total = achievements.reduce((sum, item) => sum + item.points, 0);
  return {scheme,total,maximum,level:clothingLevelFor(total,scheme,maximum),nextThreshold:thresholdsFor(scheme,maximum).find((threshold)=>threshold>total) ?? null,achievements,caseStamps,safetyBadges};
}
export function rankRewards<T extends { reward: number }>(rows: T[]): Array<T & { rank: number }> {
  const sorted = [...rows].sort((a,b)=>b.reward-a.reward); let rank=0;
  return sorted.map((row,index)=> { if(index===0 || row.reward!==sorted[index-1].reward) rank=index+1; return {...row,rank}; });
}
