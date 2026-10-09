import type { ContentVersion, DerivedProgress, LearningEvent, SafetyConceptId } from "./types.ts";
import { correctionReviewed, handoverPrepared } from "./learningRules.ts";
import { isGameVersion } from "../games/spec.ts";
import { evaluate } from "../games/evaluate.ts";

const conceptCore: Record<SafetyConceptId, string[]> = {
  S1: ["M1N1", "M1N2"], S2: ["M1N3"], S3: ["M1N4"], S4: ["M2N4"], S5: ["M3N2"], S6: ["M3N1"]
};

export function answerIsCorrect(content: ContentVersion, nodeId: string, selected: string[]): boolean {
  const node = content.nodes.find((item) => item.id === nodeId);
  if (!node) return false;
  return selected.length === node.correctOptionIds.length && selected.every((value) => node.correctOptionIds.includes(value));
}

export function deriveProgress(content: ContentVersion, events: LearningEvent[]): DerivedProgress {
  const ordered = [...events].filter((event) => event.contentVersion === content.id).sort((a, b) => a.clientSequence - b.clientSequence || a.eventId.localeCompare(b.eventId));
  const core = new Map<string, Extract<LearningEvent, { type: "core_response" }>>();
  const feedback = new Set<string>();
  const corrections = new Map<string, Extract<LearningEvent, { type: "correction_response" }>[] >();
  const finalAttempts: Extract<LearningEvent, { type: "final_submitted" }>[] = [];
  const finalFeedback = new Set<string>();
  const finalCorrections = new Map<SafetyConceptId, Extract<LearningEvent, { type: "final_correction" }>[]>();
  const teacher = new Map<SafetyConceptId, Extract<LearningEvent, { type: "teacher_review" }>>();
  let reflection: string | null = null;

  for (const event of ordered) {
    if (event.type === "core_response" && !core.has(event.nodeId)) core.set(event.nodeId, event);
    if (event.type === "feedback_ack") feedback.add(event.nodeId);
    if (event.type === "correction_response") corrections.set(event.correctionId, [...(corrections.get(event.correctionId) ?? []), event]);
    if (event.type === "final_submitted" && !finalAttempts.some((item) => item.finalAttemptId === event.finalAttemptId)) finalAttempts.push(event);
    if (event.type === "final_feedback_ack") finalFeedback.add(`${event.finalAttemptId}:${event.questionId}`);
    if (event.type === "final_correction") finalCorrections.set(event.conceptId, [...(finalCorrections.get(event.conceptId) ?? []), event]);
    if (event.type === "reflection_submitted") reflection = event.text.trim() || null;
    if (event.type === "teacher_review") teacher.set(event.conceptId, event);
  }

  const correctedNodeIds: string[] = [];
  let score = 0;
  for (const node of content.nodes) {
    const response = core.get(node.id);
    if (!response) continue;
    if (answerIsCorrect(content, node.id, response.selectedOptionIds) && (!node.game || evaluate(node.game,response.gameAnswer).correct)) score += 2;
    else {
      const successful = (corrections.get(node.retryId) ?? []).some((event) => event.selectedOptionId === content.corrections.find((item) => item.id === node.retryId)?.correctOptionId && event.feedbackAcknowledged);
      const explicitlyReviewed = (corrections.get(node.retryId) ?? []).some(event => event.selectedOptionId === content.corrections.find(item => item.id === node.retryId)?.correctOptionId && (!node.game||evaluate(node.game,event.gameAnswer).correct) && correctionReviewed(ordered,event));
      if (node.explanationBeforeChoices !== undefined ? explicitlyReviewed : successful) { score += 1; correctedNodeIds.push(node.id); }
    }
  }

  const finalSummaries = finalAttempts.map((attempt) => {
    const form = content.finalForms.find((item) => item.id === attempt.formId);
    const scoreValue = form?.questions.filter((question) => attempt.answers[question.id] === question.correctOptionId).length ?? 0;
    return { id: attempt.finalAttemptId, formId: attempt.formId, score: scoreValue, complete: Boolean(form && Object.keys(attempt.answers).length === form.questions.length) };
  });

  const concepts = (Object.keys(conceptCore) as SafetyConceptId[]).map((conceptId) => {
    const teacherResult = teacher.get(conceptId);
    if (teacherResult?.result === "resolved") return { conceptId, resolved: true, route: "teacher" as const };
    const conceptNodes=isGameVersion(content.id)?content.nodes.filter(node=>node.conceptIds.includes(conceptId)).map(node=>node.id):conceptCore[conceptId];
    const coreResolved = conceptNodes.length>0&&conceptNodes.every((nodeId) => {
      const response = core.get(nodeId);
      const node = content.nodes.find((item) => item.id === nodeId);
      if (!response || !node || !feedback.has(nodeId)) return false;
      if (answerIsCorrect(content, nodeId, response.selectedOptionIds) && (!node.game || evaluate(node.game,response.gameAnswer).correct)) return true;
      return correctedNodeIds.includes(nodeId);
    });
    const latestFinal = [...finalAttempts].reverse().find((attempt) => content.finalForms.find((form) => form.id === attempt.formId)?.questions.some((question) => question.conceptId === conceptId));
    let finalResolved = true;
    let hadCorrection = correctedNodeIds.some((nodeId) => content.nodes.find((node) => node.id === nodeId)?.conceptIds.includes(conceptId));
    if (latestFinal) {
      const question = content.finalForms.find((form) => form.id === latestFinal.formId)?.questions.find((item) => item.conceptId === conceptId);
      const correct = Boolean(question && latestFinal.answers[question.id] === question.correctOptionId);
      const correction = (finalCorrections.get(conceptId) ?? []).some((event) => {
        const correctionItem = content.corrections.find((item) => item.id === event.correctionId);
        return correctionItem?.correctOptionId === event.selectedOptionId && event.feedbackAcknowledged;
      });
      finalResolved = correct || correction;
      hadCorrection ||= correction;
    }
    const resolved = coreResolved && finalResolved;
    return { conceptId, resolved, route: resolved ? (hadCorrection ? "corrected" as const : "initial" as const) : "unresolved" as const };
  });

  const missionReviewed: Record<string, boolean> = {};
  const revised = content.nodes.some((node) => node.rationaleRequired !== undefined);
  const firstCorrectNodeIds = content.nodes.filter((node) => { const response = core.get(node.id); return response && answerIsCorrect(content, node.id, response.selectedOptionIds)&&(!node.game||evaluate(node.game,response.gameAnswer).correct); }).map((node) => node.id);
  const clearedNodeIds = content.nodes.filter((node) => {
    const response = core.get(node.id);
    return response && feedback.has(node.id) && (!node.rationaleRequired || Boolean(response.rationale?.trim())) && (!node.explanationBeforeChoices || handoverPrepared(ordered,response)) && ((answerIsCorrect(content, node.id, response.selectedOptionIds) && (!node.game || evaluate(node.game,response.gameAnswer).correct)) || correctedNodeIds.includes(node.id));
  }).map((node) => node.id);
  const handoverNotes = content.nodes.filter((node) => node.interaction === "handover"||node.interaction==="handover_builder").map((node) => ({ missionId: node.missionId, nodeId: node.id, text: core.get(node.id)?.rationale?.trim() ?? "" }));
  for (const mission of content.missions) {
    missionReviewed[mission.id] = (revised ? mission.nodeIds.every((nodeId) => clearedNodeIds.includes(nodeId)) : mission.nodeIds.every((nodeId) => core.has(nodeId) && feedback.has(nodeId))) &&
      (isGameVersion(content.id) ? [] : mission.nodeIds.filter((nodeId) => content.nodes.find((node) => node.id === nodeId)?.safetyFlag))
        .every((nodeId) => content.nodes.find((node) => node.id === nodeId)?.conceptIds.every((conceptId) => concepts.find((item) => item.conceptId === conceptId)?.resolved));
  }
  const latestFinal = finalAttempts.at(-1);
  const latestForm = latestFinal && content.finalForms.find((form) => form.id === latestFinal.formId);
  const finalFeedbackComplete = latestFinal ? Boolean(latestForm?.questions.every((question) => finalFeedback.has(`${latestFinal.finalAttemptId}:${question.id}`))) : true;
  const reasons: string[] = [];
  if (!Object.values(missionReviewed).every(Boolean)) reasons.push("Review every mission and its required corrections.");
  if (!concepts.every((item) => item.resolved)) reasons.push("Resolve all six safety concepts.");
  if (!finalFeedbackComplete) reasons.push("Review feedback for the legacy safety handover attempt.");
  if (!reflection) reasons.push(revised ? "Review your handovers and finish the shift." : "Submit your uncertainty or review reflection.");

  return {
    clearedNodeIds, firstCorrectNodeIds, handoverNotes,
    score, answeredNodeIds: [...core.keys()], feedbackNodeIds: [...feedback], correctedNodeIds,
    missionReviewed, concepts, finalAttempts: finalSummaries, finalFeedbackComplete, reflection,
    locallyComplete: reasons.length === 0, completionReasons: reasons
  };
}

export function nextClientSequence(events: LearningEvent[]): number {
  return events.reduce((maximum, event) => Math.max(maximum, event.clientSequence), 0) + 1;
}
