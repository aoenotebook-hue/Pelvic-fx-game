import type { MiniGameSpec, LOId, LocalText } from "../games/spec.ts";
export type Confidence = "low" | "medium" | "high";
export type GovernanceStatus = "draft" | "in_review" | "approved" | "published" | "retired";
export type Role = "learner" | "faculty" | "editor" | "admin";
export type SafetyConceptId = "S1" | "S2" | "S3" | "S4" | "S5" | "S6";
export type OutcomeId = "O1" | "O2" | "O3" | "O4" | "O5" | "O6";

export interface Governance {
  author: string;
  reviewer: string | null;
  reviewDate: string | null;
  status: GovernanceStatus;
  supersedesVersion: string | null;
}

export interface Course {
  id: string;
  title: string;
  timeZone: string;
  language: string;
  estimatedMinutes: number;
  preparationDueAt: string | null;
  classUrl: string | null;
  classLocation: string | null;
  supportContact: string | null;
  publishedContentVersion: string | null;
  privacyNoticeUrl: string | null;
  retentionPolicy: string | null;
  day2ReleaseAt: string | null;
  day2Url: string | null;
  day7ReleaseAt: string | null;
  day7Url: string | null;
}

export interface Cohort { id: string; courseId: string; title: string; }
export interface Membership { id: string; userId: string; cohortId: string; learnerId: string; }
export interface RoleAssignment { id: string; userId: string; role: Role; cohortId: string | null; assignedBy: string; }

export interface Option {
  id: string;
  text: string;
  explanation: string;
}

export interface Vitals { label: string; value: string; }

export interface Node {
  id: string;
  caseId: string;
  contentVersion: string;
  missionId: string;
  outcomeIds: OutcomeId[];
  conceptIds: SafetyConceptId[];
  safetyFlag: boolean;
  stem: string;
  factsAvailableNow: string[];
  vitals: Vitals[];
  assetId: string | null;
  textAlternative: string;
  question: string;
  options: Option[];
  correctOptionIds: string[];
  responseMode: "single" | "multiple";
  rationalePrompt: string;
  confidenceOptions: Confidence[];
  acceptedConditions: string[];
  resourceIds: string[];
  referenceIds: string[];
  retryId: string;
  nextNodeId: string | null;
  scenePhase?: string;
  interaction?: "action" | "image_choice" | "handover" | MiniGameSpec["kind"];
  game?: MiniGameSpec;
  objectiveIds?: LOId[];
  sourceRefs?: {doc:"S"|"H"|"LP";page:number}[];
  reviewNote?: string;
  stage?: "pretest"|"practice"|"boss"|"gauntlet";
  /** Must be correct on the post-test (conjunctive pass standard). */
  mustPass?: boolean;
  /** Bloom level of the task, for item analysis. */
  bloom?: "remember" | "understand" | "apply" | "analyse";
  /** Newer guideline that differs from the lecture, shown to learners. */
  guideline?: { en: string; th: string };
  translation?: {title:LocalText;story:LocalText;key:LocalText;why:LocalText};
  rationaleRequired?: boolean;
  explanationBeforeChoices?: boolean;
  teaching?: { objective: string; keyMessage: string; misconception: string; discussionPrompt: string; suggestedFeedback: string; sources: string[] };
  visuals?: Array<{ assetId: string; placement: "question" | "feedback"; role: "teaching_example" }>;
}

export interface CorrectionItem {
  game?: MiniGameSpec;
  contentVersion?: string;
  id: string;
  parentNodeId: string | null;
  conceptIds: SafetyConceptId[];
  outcomeIds: OutcomeId[];
  resourceId: string;
  stem: string;
  options: Option[];
  correctOptionId: string;
  workedExample: string;
}

export interface Mission {
  contentVersion?: string;
  id: string;
  number: number;
  title: string;
  entry: string;
  estimatedMinutes: number;
  nodeIds: string[];
}

export interface Resource {
  contentVersion?: string;
  id: string;
  title: string;
  estimatedMinutes: number;
  body: string[];
  selfPrompt?: string;
  assetIds?: string[];
  sourceDocumentIds?: string[];
}

export interface SourceDocument {
  id: string;
  title: string;
  href: string;
  language: string;
  note: string;
}

export interface Asset {
  id: string;
  path: string | null;
  versionHash: string;
  sourceUrl: string | null;
  owner: string | null;
  licensePermission: string | null;
  reviewStatus: "not_provided" | "pending" | "approved";
  reviewer: string | null;
  reviewDate: string | null;
  altText: string;
  caption: string;
  optional: boolean;
  downloadBytes: number;
}

export interface FinalQuestion {
  id: string;
  conceptId: SafetyConceptId;
  question: string;
  options: Option[];
  correctOptionId: string;
  correctionId: string;
}

export interface FinalForm { id: "form-a" | "form-b"; questions: FinalQuestion[]; }

export interface ContentVersion {
  id: string;
  title: string;
  governance: Governance;
  missions: Mission[];
  nodes: Node[];
  corrections: CorrectionItem[];
  resources: Resource[];
  sourceDocuments: SourceDocument[];
  assets: Asset[];
  finalForms: FinalForm[];
}

export interface Attempt {
  id: string;
  learnerId: string;
  courseId: string;
  contentVersion: string;
  kind: "initial" | "practice";
  createdAt: string;
  reportingStatus: "local" | "reporting" | "practice" | "conflict";
}

export interface BaseEvent {
  eventId: string;
  attemptId: string;
  learnerId: string;
  contentVersion: string;
  clientSequence: number;
  clientTimestamp: string;
  serverReceiptTimestamp: string | null;
}

export interface CoreResponseEvent extends BaseEvent {
  type: "core_response";
  nodeId: string;
  selectedOptionIds: string[];
  presentationOrder: string[];
  confidence?: Confidence;
  rationale?: string;
  gameAnswer?: unknown;
  gameScore?: number;
  /** Time on task (ms) and hint openings — analysis only, never scored. */
  elapsedMs?: number;
  hintsUsed?: number;
}

export interface FeedbackEvent extends BaseEvent { type: "feedback_ack"; nodeId: string; }
export interface CorrectionResponseEvent extends BaseEvent {
  type: "correction_response";
  correctionId: string;
  selectedOptionId: string;
  feedbackAcknowledged: boolean;
  gameAnswer?: unknown;
  gameScore?: number;
  /** Time on task (ms) and hint openings — analysis only, never scored. */
  elapsedMs?: number;
  hintsUsed?: number;
}
export interface ResourceEvent extends BaseEvent { type: "resource_viewed"; resourceId: string; nodeId?: string; stage?: "question" | "feedback" | "correction"; }
export interface CorrectionAcknowledgment extends BaseEvent { type: "correction_feedback_ack"; correctionId: string; responseEventId: string; }
export interface HandoverPrepared extends BaseEvent { type: "handover_prepared"; nodeId: string; text: string; }
export interface FinalAttemptEvent extends BaseEvent {
  type: "final_submitted";
  finalAttemptId: string;
  formId: "form-a" | "form-b";
  answers: Record<string, string>;
}
export interface FinalFeedbackEvent extends BaseEvent { type: "final_feedback_ack"; finalAttemptId: string; questionId: string; }
export interface FinalCorrectionEvent extends BaseEvent { type: "final_correction"; conceptId: SafetyConceptId; correctionId: string; selectedOptionId: string; feedbackAcknowledged: boolean; }
export interface ReflectionEvent extends BaseEvent { type: "reflection_submitted"; text: string; }
export interface TeacherReviewEvent extends BaseEvent {
  type: "teacher_review";
  reviewerId: string;
  reviewedAt: string;
  reason: string;
  conceptId: SafetyConceptId;
  outcomeId: OutcomeId;
  result: "resolved" | "unresolved";
}
export interface IssueReportEvent extends BaseEvent { type: "issue_reported"; nodeId: string | null; message: string; }

export type LearningEvent = CoreResponseEvent | FeedbackEvent | CorrectionResponseEvent | ResourceEvent | CorrectionAcknowledgment | HandoverPrepared |
  FinalAttemptEvent | FinalFeedbackEvent | FinalCorrectionEvent | ReflectionEvent | TeacherReviewEvent | IssueReportEvent;

export interface ConceptResolution { conceptId: SafetyConceptId; resolved: boolean; route: "initial" | "corrected" | "teacher" | "unresolved"; }
export interface Reflection { attemptId: string; text: string; submittedAt: string; }
export interface CompletionReceipt { learnerId: string; courseId: string; contentVersion: string; reportingAttemptId: string; completionRoute: string; completedAt: string; status: "local" | "pending_sync" | "server_confirmed"; }
export interface AuditEvent { id: string; actorId: string; action: string; targetType: string; targetId: string; reason: string | null; createdAt: string; }

export interface DerivedProgress {
  score: number;
  answeredNodeIds: string[];
  clearedNodeIds: string[];
  feedbackNodeIds: string[];
  correctedNodeIds: string[];
  missionReviewed: Record<string, boolean>;
  concepts: ConceptResolution[];
  finalAttempts: Array<{ id: string; formId: string; score: number; complete: boolean }>;
  finalFeedbackComplete: boolean;
  reflection: string | null;
  locallyComplete: boolean;
  completionReasons: string[];
  firstCorrectNodeIds: string[];
  handoverNotes: Array<{ missionId: string; nodeId: string; text: string }>;
}
