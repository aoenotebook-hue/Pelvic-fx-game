// Provider-neutral rules shared by browser tests and the Supabase sync function.
import { LEGACY_VERSION, REVISION_VERSION, rewardLedger } from "./rewardRules.ts";
import { LEARNING_VERSION } from "./learningRules.ts";
import { deriveProgress } from "./engine.ts";
import type {ContentVersion,LearningEvent,SafetyConceptId} from "./types.ts";
import { MINIGAME_VERSION } from "../games/spec.ts";
import { evaluate,outcomeId } from "../games/evaluate.ts";
import { pelvicTraumaContentV4 } from "../content/content.v4.ts";
import { computeRewards } from "./rewards.ts";
import { miniGameEvidence,retrievalEvidence } from "./assessment.ts";
export const serverRules = {
  contentVersion: "ptd-en-draft-2026-10-01",
  nodeKeys: {
    M1N1: "M1N1_B", M1N2: "M1N2_C", M1N3: "M1N3_B", M1N4: "M1N4_C", M1N5: "M1N5_B", M1N6: "M1N6_C",
    M2N1: "M2N1_A", M2N2: "M2N2_B", M2N3: "M2N3_B", M2N4: "M2N4_C", M2N5: "M2N5_B",
    M3N1: "M3N1_B", M3N2: "M3N2_C", M3N3: "M3N3_B", M3N4: "M3N4_C"
  },
  correctionKeys: {
    M1N1_R: "M1N1_R_B", M1N2_R: "M1N2_R_A", M1N3_R: "M1N3_R_C", M1N4_R: "M1N4_R_B", M1N5_R: "M1N5_R_A", M1N6_R: "M1N6_R_C",
    M2N1_R: "M2N1_R_B", M2N2_R: "M2N2_R_A", M2N3_R: "M2N3_R_C", M2N4_R: "M2N4_R_B", M2N5_R: "M2N5_R_A",
    M3N1_R: "M3N1_R_C", M3N2_R: "M3N2_R_B", M3N3_R: "M3N3_R_A", M3N4_R: "M3N4_R_C"
  },
  safety: { S1: ["M1N1", "M1N2"], S2: ["M1N3"], S3: ["M1N4"], S4: ["M2N4"], S5: ["M3N2"], S6: ["M3N1"] },
  maxBatchEvents: 100,
  maxEventBytes: 16_384,
  maxBatchBytes: 512_000
} as const;

export function isKnownNodeOption(nodeId: string, optionId: string) {
  return ["A","B","C"].some((letter)=>optionId === `${nodeId}_${letter}`) && Object.hasOwn(serverRules.nodeKeys, nodeId);
}

export function isKnownCorrectionOption(correctionId: string, optionId: string) {
  return ["A","B","C"].some((letter)=>optionId === `${correctionId}_${letter}`) && Object.hasOwn(serverRules.correctionKeys, correctionId);
}

type ServerEvent = { type: string; eventId?: string; contentVersion?: string; rationale?: string; nodeId?: string | null; correctionId?: string; selectedOptionIds?: string[]; selectedOptionId?: string; feedbackAcknowledged?: boolean; text?: string; formId?: string; finalAttemptId?: string; answers?: Record<string, string>; questionId?: string; conceptId?: string; clientSequence: number };

export const revisedRules = {
  nodeKeys: { M1N1:"M1N1_B",M1N2:"M1N2_C",M1N3:"M1N3_A",M1N5:"M1N5_C",M1N4:"M1N4_A",M1N6:"M1N6_B",M2N1:"M2N1_A",M2N2:"M2N2_B",M2N3:"M2N3_C",M2N4:"M2N4_B",M2N5:"M2N5_C",M3N1:"M3N1_A",M3N2:"M3N2_C",M3N3:"M3N3_B",M3N4:"M3N4_A" },
  correctionKeys: { M1N1_R:"M1N1_R_C",M1N2_R:"M1N2_R_A",M1N3_R:"M1N3_R_B",M1N5_R:"M1N5_R_A",M1N4_R:"M1N4_R_C",M1N6_R:"M1N6_R_A",M2N1_R:"M2N1_R_B",M2N2_R:"M2N2_R_C",M2N3_R:"M2N3_R_A",M2N4_R:"M2N4_R_C",M2N5_R:"M2N5_R_B",M3N1_R:"M3N1_R_C",M3N2_R:"M3N2_R_A",M3N3_R:"M3N3_R_C",M3N4_R:"M3N4_R_B" }
} as const;
export const handoverNodes = ["M1N6","M2N5","M3N4"];
export function supportedVersion(version: string) { return [LEGACY_VERSION,REVISION_VERSION,LEARNING_VERSION,MINIGAME_VERSION].includes(version); }
export function validateLearnerEvent(event: Record<string,unknown>): string | null {
  if (!supportedVersion(String(event.contentVersion))) return "Unsupported content version";
  if(event.contentVersion===MINIGAME_VERSION)return validateMiniGameEvent(event);
  const allowed = ["core_response","feedback_ack","correction_response","resource_viewed","reflection_submitted","issue_reported","final_submitted","final_feedback_ack","final_correction",...(event.contentVersion===LEARNING_VERSION?["handover_prepared","correction_feedback_ack"]:[])];
  if (!allowed.includes(String(event.type))) return "Unauthorized event type";
  const nodeId = String(event.nodeId ?? "");
  if (event.type === "core_response") {
    const options = event.selectedOptionIds;
    if (!Array.isArray(options) || options.length !== 1 || typeof options[0] !== "string" || !isKnownNodeOption(nodeId, options[0])) return "Unknown node or option";
    if (event.confidence !== undefined && !["low","medium","high"].includes(String(event.confidence))) return "Invalid confidence";
    if (event.rationale !== undefined && (typeof event.rationale !== "string" || event.rationale.length > 360)) return "Invalid reason";
    if (event.contentVersion !== LEGACY_VERSION && handoverNodes.includes(nodeId) && (typeof event.rationale !== "string" || !event.rationale.trim())) return "Handover reason required";
  }
  if (event.type === "feedback_ack" && !Object.hasOwn(serverRules.nodeKeys,nodeId)) return "Unknown feedback node";
  if (event.type === "correction_response" && !isKnownCorrectionOption(String(event.correctionId),String(event.selectedOptionId))) return "Unknown correction or option";
  if (event.contentVersion !== LEGACY_VERSION && String(event.type).startsWith("final_")) return "No final assessment in this version";
  if(event.type==="handover_prepared" && (!handoverNodes.includes(nodeId)||typeof event.text!=="string"||!event.text.trim()||event.text.length>360))return "Invalid handover preparation";
  if(event.type==="correction_feedback_ack"&&(!Object.hasOwn(revisedRules.correctionKeys,String(event.correctionId))||typeof event.responseEventId!=="string"))return "Invalid corrective acknowledgment";
  if(event.type==="resource_viewed"&&(!["ORIENTATION","R1","R2","R3","R4"].includes(String(event.resourceId))||(event.nodeId!==undefined&&!Object.hasOwn(serverRules.nodeKeys,String(event.nodeId)))||(event.stage!==undefined&&!["question","feedback","correction"].includes(String(event.stage)))))return "Invalid reference context";
  if (event.type === "reflection_submitted" && (typeof event.text !== "string" || !event.text.trim() || event.text.length > 1500)) return "Invalid shift review";
  return null;
}
export function recomputeServerSummary(events: ServerEvent[], version = events[0]?.contentVersion ?? LEGACY_VERSION) {
  if (!supportedVersion(version)) throw new Error("Unsupported content version");
  if(version===MINIGAME_VERSION){const valid=events.filter(event=>validateMiniGameEvent(event as unknown as Record<string,unknown>)===null) as unknown as LearningEvent[];const p=deriveProgress(pelvicTraumaContentV4,valid),r=computeRewards(pelvicTraumaContentV4,valid,p);return{...legacySummary(events),core_score:p.score,first_final_score:retrievalEvidence(pelvicTraumaContentV4,valid).firstScore,latest_final_score:retrievalEvidence(pelvicTraumaContentV4,valid).resolvedScore,reviewed_missions:Object.values(p.missionReviewed).filter(Boolean).length,resolved_concepts:p.concepts.filter(c=>c.resolved).length,answered_nodes:p.answeredNodeIds.length,completed:p.locallyComplete,completed_at:p.locallyComplete?new Date().toISOString():null,completion_route:p.locallyComplete?"ordinary":null,reflection_submitted:Boolean(p.reflection),reward_total:r.total,reward_maximum:r.maximum,reward_scheme:r.scheme,first_correct:p.firstCorrectNodeIds.length,corrected_nodes:p.correctedNodeIds.length,clothing_level:r.level,case_stamps:r.caseStamps,safety_badges:r.safetyBadges,reward_achievements:r.achievements,objective_evidence:miniGameEvidence(pelvicTraumaContentV4,valid).objectives,station_mistakes:miniGameEvidence(pelvicTraumaContentV4,valid).mistakes,station_stars:miniGameEvidence(pelvicTraumaContentV4,valid).stars};}
  if(version===LEARNING_VERSION) return learningSummary(events);
  const rules = version === LEGACY_VERSION ? serverRules : revisedRules;
  const ordered = events.filter((event)=>!event.contentVersion || event.contentVersion === version).slice().sort((a,b)=>a.clientSequence-b.clientSequence || (a.eventId ?? "").localeCompare(b.eventId ?? ""));
  const responses = new Map<string,ServerEvent>(), feedback = new Set<string>(), retries = new Set<string>();
  for (const event of ordered) {
    if (event.type === "core_response" && event.nodeId && Object.hasOwn(rules.nodeKeys,event.nodeId) && !responses.has(event.nodeId)) responses.set(event.nodeId,event);
    if (event.type === "feedback_ack" && event.nodeId) feedback.add(event.nodeId);
    if (event.type === "correction_response" && event.correctionId && event.feedbackAcknowledged && event.selectedOptionId === rules.correctionKeys[event.correctionId as keyof typeof rules.correctionKeys]) retries.add(event.correctionId);
  }
  const firstCorrect = [...responses].filter(([id,event])=>event.selectedOptionIds?.length===1 && event.selectedOptionIds[0]===rules.nodeKeys[id as keyof typeof rules.nodeKeys]).map(([id])=>id);
  const corrected = [...responses.keys()].filter((id)=>!firstCorrect.includes(id) && retries.has(`${id}_R`));
  const cleared = [...responses.keys()].filter((id)=>feedback.has(id) && (firstCorrect.includes(id) || corrected.includes(id)) && (version === LEGACY_VERSION || !handoverNodes.includes(id) || Boolean(responses.get(id)?.rationale?.trim())));
  const badges = Object.entries(serverRules.safety).filter(([,ids])=>ids.every((id)=>feedback.has(id) && (firstCorrect.includes(id) || corrected.includes(id)))).map(([id])=>id);
  const cases = [1,2,3].filter((number)=>Object.keys(rules.nodeKeys).filter((id)=>id.startsWith(`M${number}`)).every((id)=>version === LEGACY_VERSION ? responses.has(id) && feedback.has(id) : cleared.includes(id))).map((number)=>`mission-${number}`);
  const reflection = ordered.some((event)=>event.type === "reflection_submitted" && Boolean(event.text?.trim()));
  const old = legacySummary(ordered);
  const completed = version === LEGACY_VERSION ? old.completed : cases.length===3 && badges.length===6 && reflection;
  const rewards = rewardLedger({version,firstCorrect,corrected,cleared,cases,badges,completed});
  return {...old, core_score:firstCorrect.length*2+corrected.length, reviewed_missions:cases.length, resolved_concepts:badges.length, answered_nodes:responses.size, completed, completion_route:completed ? "ordinary" : null, completed_at:completed ? old.completed_at ?? new Date().toISOString() : null, reward_total:rewards.total, reward_maximum:rewards.maximum, reward_scheme:rewards.scheme, first_correct:firstCorrect.length, corrected_nodes:corrected.length, clothing_level:rewards.level, case_stamps:rewards.caseStamps, safety_badges:rewards.safetyBadges, reward_achievements:rewards.achievements};
}
function validateMiniGameEvent(event:Record<string,unknown>):string|null {
 const isCorrection=["correction_response","correction_feedback_ack"].includes(String(event.type));
 const node=pelvicTraumaContentV4.nodes.find(n=>isCorrection?n.retryId===event.correctionId:n.id===event.nodeId);
 if(["core_response","correction_response"].includes(String(event.type))){if(!node?.game)return "Unknown station";const id=event.type==="core_response"?node.id:node.retryId;const expected=outcomeId(id,node.game,event.gameAnswer);const selected=event.type==="core_response"?event.selectedOptionIds:[event.selectedOptionId];if(!Array.isArray(selected)||selected.length!==1||selected[0]!==expected)return "Game outcome does not match server evaluation";const score=evaluate(node.game,event.gameAnswer).score;if(typeof event.gameScore!=="number"||Math.abs(event.gameScore-score)>1e-9)return "Game score does not match server evaluation";if(event.rationale!==undefined&&(typeof event.rationale!=="string"||event.rationale.length>360))return "Invalid reason";if(event.confidence!==undefined&&!["low","medium","high"].includes(String(event.confidence)))return "Invalid confidence";if(event.type==="core_response"&&node.rationaleRequired&&(typeof event.rationale!=="string"||!event.rationale.trim()))return "Handover reason required";return null;}
 if(event.type==="feedback_ack")return node?null:"Unknown station";
 if(event.type==="correction_feedback_ack")return node&&typeof event.responseEventId==="string"?null:"Invalid correction review";
 if(event.type==="handover_prepared")return node?.rationaleRequired&&typeof event.text==="string"&&event.text.trim()&&event.text.length<=360?null:"Invalid handover";
 if(event.type==="resource_viewed")return pelvicTraumaContentV4.resources.some(r=>r.id===event.resourceId)&&(!event.nodeId||Boolean(node))?null:"Unknown reference";
 if(event.type==="reflection_submitted")return typeof event.text==="string"&&event.text.trim()&&event.text.length<=1500?null:"Invalid shift review";
 if(event.type==="issue_reported")return typeof event.message==="string"&&event.message.length<=800?null:"Invalid issue";
 if(event.type==="course_feedback"){const rating=(value:unknown)=>Number.isInteger(value)&&Number(value)>=1&&Number(value)<=5;return rating(event.usefulness)&&rating(event.enjoyment)&&rating(event.confidence)&&(event.comment===undefined||(typeof event.comment==="string"&&event.comment.length<=800))?null:"Invalid course feedback";}
 return "Unauthorized event type";
}
function learningSummary(events:ServerEvent[]) {
 const nodes=Object.entries(revisedRules.nodeKeys).map(([id,key])=>({id,correctOptionIds:[key],retryId:id+"_R",rationaleRequired:handoverNodes.includes(id),explanationBeforeChoices:handoverNodes.includes(id),interaction:handoverNodes.includes(id)?"handover":"action",missionId:"mission-"+id[1],safetyFlag:Object.values(serverRules.safety).some(ids=>(ids as readonly string[]).includes(id)),conceptIds:Object.entries(serverRules.safety).filter(([,ids])=>(ids as readonly string[]).includes(id)).map(([id])=>id as SafetyConceptId)}));
 const rulesContent={id:LEARNING_VERSION,nodes,corrections:Object.entries(revisedRules.correctionKeys).map(([id,key])=>({id,correctOptionId:key})),missions:[1,2,3].map(number=>({id:"mission-"+number,nodeIds:nodes.filter(node=>node.id.startsWith("M"+number)).map(node=>node.id)})),finalForms:[]} as unknown as ContentVersion;
 const normalized=events.map(event=>({...event,contentVersion:LEARNING_VERSION})) as unknown as LearningEvent[];
 const progress=deriveProgress(rulesContent,normalized);
 const rewards=rewardLedger({version:LEARNING_VERSION,firstCorrect:progress.firstCorrectNodeIds,corrected:progress.correctedNodeIds,cleared:progress.clearedNodeIds,cases:Object.keys(progress.missionReviewed).filter(id=>progress.missionReviewed[id]),badges:progress.concepts.filter(concept=>concept.resolved).map(concept=>concept.conceptId),completed:progress.locallyComplete});
 return {...legacySummary(events),core_score:progress.score,reviewed_missions:rewards.caseStamps.length,resolved_concepts:rewards.safetyBadges.length,answered_nodes:progress.answeredNodeIds.length,completed:progress.locallyComplete,completed_at:progress.locallyComplete?new Date().toISOString():null,completion_route:progress.locallyComplete?"ordinary":null,reflection_submitted:Boolean(progress.reflection),reward_total:rewards.total,reward_maximum:rewards.maximum,reward_scheme:rewards.scheme,first_correct:progress.firstCorrectNodeIds.length,corrected_nodes:progress.correctedNodeIds.length,clothing_level:rewards.level,case_stamps:rewards.caseStamps,safety_badges:rewards.safetyBadges,reward_achievements:rewards.achievements};
}
function legacySummary(events: ServerEvent[]) {
  const ordered = [...events].sort((a, b) => a.clientSequence - b.clientSequence);
  const responses = new Map<string, ServerEvent>(); const feedback = new Set<string>(); const corrected = new Set<string>();
  const finalAttempts: ServerEvent[] = []; const finalFeedback = new Set<string>(); let reflection = false;
  for (const event of ordered) {
    if (event.type === "core_response" && event.nodeId && !responses.has(event.nodeId)) responses.set(event.nodeId, event);
    if (event.type === "feedback_ack" && event.nodeId) feedback.add(event.nodeId);
    if ((event.type === "correction_response" || event.type === "final_correction") && event.correctionId && event.selectedOptionId === serverRules.correctionKeys[event.correctionId as keyof typeof serverRules.correctionKeys] && event.feedbackAcknowledged) corrected.add(event.correctionId);
    if (event.type === "final_submitted") finalAttempts.push(event);
    if (event.type === "final_feedback_ack" && event.finalAttemptId && event.questionId) finalFeedback.add(`${event.finalAttemptId}:${event.questionId}`);
    if (event.type === "reflection_submitted" && event.text?.trim()) reflection = true;
  }
  let coreScore = 0;
  for (const [nodeId, key] of Object.entries(serverRules.nodeKeys)) {
    const event = responses.get(nodeId); if (!event) continue;
    if (event.selectedOptionIds?.length === 1 && event.selectedOptionIds[0] === key) coreScore += 2;
    else if (corrected.has(`${nodeId}_R`)) coreScore += 1;
  }
  const finalScore = (attempt: ServerEvent | undefined) => attempt ? Object.entries(attempt.answers ?? {}).filter(([id, answer]) => {
    const number = id.slice(1, 2); const form = id.endsWith("A") ? "A" : "B";
    const keys: Record<string, string> = form === "A" ? { "1": "B", "2": "A", "3": "C", "4": "B", "5": "A", "6": "C" } : { "1": "C", "2": "B", "3": "A", "4": "C", "5": "B", "6": "A" };
    return answer === `${id}_${keys[number]}`;
  }).length : null;
  const firstFinalScore = finalScore(finalAttempts[0]); const latestFinalScore = finalScore(finalAttempts.at(-1));
  const resolvedConcepts = Object.entries(serverRules.safety).filter(([concept, nodeIds]) => {
    const coreResolved = nodeIds.every((nodeId) => {
      const response = responses.get(nodeId); const key = serverRules.nodeKeys[nodeId as keyof typeof serverRules.nodeKeys];
      return feedback.has(nodeId) && (response?.selectedOptionIds?.[0] === key || corrected.has(`${nodeId}_R`));
    });
    if (!coreResolved) return false;
    return true;
  }).length;
  const reviewedMissions = [["M1N1","M1N2","M1N3","M1N4","M1N5","M1N6"],["M2N1","M2N2","M2N3","M2N4","M2N5"],["M3N1","M3N2","M3N3","M3N4"]].filter((nodes) => nodes.every((id) => responses.has(id) && feedback.has(id))).length;
  const completed = reviewedMissions === 3 && resolvedConcepts === 6 && reflection;
  return { core_score: coreScore, answered_nodes: responses.size, reviewed_missions: reviewedMissions, resolved_concepts: resolvedConcepts, first_final_score: firstFinalScore, latest_final_score: latestFinalScore, reflection_submitted: reflection, completed, completion_route: completed ? "ordinary" : null, completed_at: completed ? new Date().toISOString() : null, last_event_at: new Date().toISOString(), updated_at: new Date().toISOString() };
}
