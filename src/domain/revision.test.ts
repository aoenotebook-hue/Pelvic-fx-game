import { describe,it,expect } from "vitest";
import { pelvicTraumaContentV2 as content, revisions } from "../content/content.v2";
import { pelvicTraumaContent as legacy } from "../content/content.v1";
import { deriveProgress } from "./engine";
import { computeRewards, clothingLevelFor, rankRewards } from "./rewards";
import { recomputeServerSummary, revisedRules, validateLearnerEvent } from "./serverRules";
import { localizeNode, localizeCorrection } from "../i18n";
import type { LearningEvent } from "./types";
function journey(correct: boolean, version = content): LearningEvent[] {
  const events: LearningEvent[] = [];
  const add = (event: Record<string,unknown>) => events.push({...event,eventId:`event-${events.length+1}`,clientSequence:events.length+1,clientTimestamp:"2026-10-02T12:00:00Z",learnerId:"student",attemptId:"attempt",contentVersion:version.id} as LearningEvent);
  for (const node of version.nodes) {
    add({type:"core_response",nodeId:node.id,selectedOptionIds:[correct ? node.correctOptionIds[0] : node.options.find((option)=>!node.correctOptionIds.includes(option.id))!.id],presentationOrder:node.options.map((option)=>option.id),...(node.rationaleRequired ? {rationale:"I will escalate current findings and uncertainty."} : {})});
    add({type:"feedback_ack",nodeId:node.id});
    if (!correct) add({type:"correction_response",correctionId:node.retryId,selectedOptionId:version.corrections.find((item)=>item.id===node.retryId)!.correctOptionId,feedbackAcknowledged:true});
  }
  add({type:"reflection_submitted",text:"Three handover notes reviewed; shift finished."});
  return events;
}
describe("versioned case flow and rewards",()=>{
  it("has 6/5/4 steps, transient response before imaging and three handovers",()=>{
    expect(content.missions.map((mission)=>mission.nodeIds.length)).toEqual([6,5,4]);
    expect(content.nodes.findIndex((node)=>node.id==="M1N5")).toBeLessThan(content.nodes.findIndex((node)=>node.id==="M1N4"));
    expect(content.nodes.filter((node)=>node.rationaleRequired).map((node)=>node.id)).toEqual(["M1N6","M2N5","M3N4"]);
    expect(content.nodes.find((node)=>node.id==="M2N1")!.stem).toMatch(/binder/i);
    expect(content.finalForms).toHaveLength(0);
  });
  it.each(content.nodes.map((node)=>[node.id,node] as const))("authors bilingual decision and corrective item %s",(id,node)=>{
    const translated=localizeNode(node,"th"), retry=content.corrections.find((item)=>item.parentNodeId===id)!;
    expect(translated.stem).not.toBe(node.stem); expect(translated.options).toHaveLength(3);
    expect(localizeCorrection(retry,"th").stem).not.toBe(retry.stem);
    expect(revisedRules.nodeKeys[id as keyof typeof revisedRules.nodeKeys]).toBe(node.correctOptionIds[0]);
    expect(revisedRules.correctionKeys[retry.id as keyof typeof revisedRules.correctionKeys]).toBe(retry.correctOptionId);
    expect(revisions.find((item)=>item.id===id)!.en.reasons).toHaveLength(3);
    for (const option of translated.options) expect(option.explanation.length).toBeGreaterThan(10);
  });
  it.each([[true,250,30,15],[false,220,15,0]] as const)("completes all paths, correct=%s reward=%s",(correct,total,score,first)=>{
    const events=journey(correct), progress=deriveProgress(content,events), rewards=computeRewards(content,events);
    expect(progress.locallyComplete).toBe(true);expect(progress.score).toBe(score);expect(progress.firstCorrectNodeIds).toHaveLength(first);
    expect(rewards.total).toBe(total);expect(rewards.level).toBe(5);expect(rewards.achievements).toHaveLength(25);
    expect(rewards.caseStamps).toHaveLength(3);expect(rewards.safetyBadges).toHaveLength(6);
    const server=recomputeServerSummary(events);
    expect(server.reward_total).toBe(total);expect(server.reward_scheme).toBe(rewards.scheme);expect(server.reward_achievements).toEqual(rewards.achievements);
    expect(server.completed).toBe(progress.locallyComplete);expect(server.core_score).toBe(score);
  });
  it("checks client/server agreement after every interruption and correction",()=>{
    for (const correct of [true,false]) {
      const events=journey(correct);
      for (let count=0;count<=events.length;count++) {
        const partial=events.slice(0,count), rewards=computeRewards(content,partial), server=recomputeServerSummary(partial,content.id);
        expect(server.reward_total).toBe(rewards.total);expect(server.completed).toBe(deriveProgress(content,partial).locallyComplete);
        expect(computeRewards(content,structuredClone(partial))).toEqual(rewards);
      }
    }
  });
  it("cannot farm rewards by duplicate events, replay, reopened resources or repeated corrections",()=>{
    const events=journey(false), repeated=[...events,...events,...events.filter((event)=>event.type==="correction_response")];
    expect(computeRewards(content,repeated).total).toBe(220);expect(recomputeServerSummary(repeated).reward_total).toBe(220);
    const replay=events.find((event)=>event.type==="core_response")!;
    expect(computeRewards(content,[...events,{...replay,clientSequence:999,selectedOptionIds:["M1N1_B"]} as LearningEvent]).total).toBe(220);
  });
  it("gates decision reward on feedback and prevents missing handovers/shift from completing",()=>{
    expect(computeRewards(content,journey(true).slice(0,1)).total).toBe(0);
    const noShift=journey(true).filter((event)=>event.type!=="reflection_submitted");
    expect(computeRewards(content,noShift).total).toBe(225);
    const missing=journey(true).map((event)=>event.type==="core_response" && event.nodeId==="M1N6" ? {...event,rationale:undefined} : event);
    expect(deriveProgress(content,missing).locallyComplete).toBe(false);expect(recomputeServerSummary(missing).completed).toBe(false);
  });
  it("retains original keys and scoring and excludes other-version events",()=>{
    const old=journey(true,legacy), revised=journey(true);
    expect(computeRewards(legacy,old).total).toBe(150);expect(computeRewards(legacy,[...old,...revised]).total).toBe(150);
    expect(computeRewards(content,[...old,...revised]).total).toBe(250);
    expect(legacy.nodes.find((node)=>node.id==="M1N3")!.correctOptionIds).toEqual(["M1N3_B"]);
  });
  it("unlocks exact thresholds, including the all-corrected best outfit",()=>{
    expect([0,39,40,89,90,149,150,209,210,220,250].map((value)=>clothingLevelFor(value))).toEqual([1,1,2,2,3,3,4,4,5,5,5]);
    expect(clothingLevelFor(120,"legacy-150")).toBe(5);
  });
  it("shares rank without a speed tiebreaker",()=>{
    expect(rankRewards([{reward:220},{reward:250},{reward:220},{reward:210}]).map((row)=>row.rank)).toEqual([1,2,2,4]);
  });
  it("accepts omitted optional confidence/reason and rejects missing handover reason or invented options",()=>{
    const event=journey(true)[0]; expect(validateLearnerEvent({...event})).toBeNull();
    expect(validateLearnerEvent({...event,nodeId:"M1N6",selectedOptionIds:["M1N6_B"]})).toBe("Handover reason required");
    expect(validateLearnerEvent({...event,selectedOptionIds:["M1N1_FAKE"]})).toBe("Unknown node or option");
    expect(validateLearnerEvent({...event,type:"teacher_review"})).toBe("Unauthorized event type");
  });
});
