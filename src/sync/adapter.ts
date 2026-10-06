import type { LearningEvent } from "../domain/types";
import { appConfig } from "../config";
import { submissionBatches } from "./batches";
import type { EvidenceAttempt, RosterMember, TeacherObservation } from "../domain/assessment";
export interface FacultyWorkspaceData { roster:RosterMember[]; attempts:EvidenceAttempt[]; reviews:TeacherObservation[]; review:TeacherObservation; authorized?:boolean; }

export interface SyncResult {
  acknowledgments: Array<{ eventId: string; serverReceiptTimestamp: string }>;
  retryable: string[];
  rejected: Array<{ eventId: string; reason: string }>;
  completionReceipt?: { status: "server_confirmed"; completedAt: string; reportingAttemptId: string };
}

export interface FacultyReportRow {
  learnerId: string;
  cohortId: string;
  attemptId: string;
  contentVersion: string;
  reportingStatus: string;
  coreScore: number;
  rewardTotal: number;
  rewardMaximum: number;
  rewardScheme: string;
  firstCorrect: number;
  correctedNodes: number;
  clothingLevel: number;
  caseStamps: string[];
  safetyBadges: string[];
  answeredNodes: number;
  reviewedMissions: number;
  resolvedConcepts: number;
  firstFinalScore: number | null;
  latestFinalScore: number | null;
  reflectionSubmitted: boolean;
  completed: boolean;
  completedAt: string | null;
  lastEventAt: string | null;
}

export interface LeaderboardRow {
  rank: number;
  label: string;
  reward: number;
  clothingLevel: number;
  isCurrentLearner: boolean;
}

export interface BackendAdapter {
  mode: "demo" | "connected";
  syncEvents(events: LearningEvent[]): Promise<SyncResult>;
  currentUserId?(): Promise<string | null>;
  loadFacultyReport?(): Promise<FacultyReportRow[]>;
  loadLeaderboard?(contentVersion: string): Promise<LeaderboardRow[]>;
  signIn?(email: string): Promise<void>;
  signOut?(): Promise<void>;
  facultyWorkspace?(operation:string, payload?:unknown):Promise<FacultyWorkspaceData>;
  recoverCompletion?(attemptId:string):Promise<SyncResult["completionReceipt"]>;
  onAuthChange?(callback:(userId:string|null)=>void):()=>void;
}

export class DemoBackendAdapter implements BackendAdapter {
  mode = "demo" as const;
  async syncEvents(events: LearningEvent[]): Promise<SyncResult> {
    const now = new Date().toISOString();
    return { acknowledgments: events.map((event) => ({ eventId: event.eventId, serverReceiptTimestamp: now })), retryable: [], rejected: [] };
  }
  async currentUserId() { return appConfig.demoUserId; }
}

export class SupabaseBackendAdapter implements BackendAdapter {
  mode = "connected" as const;
  private clientPromise: Promise<import("@supabase/supabase-js").SupabaseClient>;
  constructor(url: string, publishableKey: string) {
    this.clientPromise = import("@supabase/supabase-js").then(({ createClient }) => createClient(url, publishableKey));
  }
  async currentUserId() { const client = await this.clientPromise; return (await client.auth.getSession()).data.session?.user.id ?? null; }
  onAuthChange(callback:(userId:string|null)=>void) { let active=true; let unsubscribe:undefined|(()=>void); void this.clientPromise.then(client=>{if(!active)return; const subscription=client.auth.onAuthStateChange((_event,session)=>callback(session?.user.id??null));unsubscribe=()=>subscription.data.subscription.unsubscribe();});return()=>{active=false;unsubscribe?.();}; }
  async facultyWorkspace(operation:string,payload?:unknown):Promise<FacultyWorkspaceData> { const client=await this.clientPromise; const {data,error}=await client.functions.invoke("faculty-workspace",{body:{courseId:appConfig.courseId,operation,payload}});if(error)throw error;return data; }
  async recoverCompletion(attemptId:string) { const client=await this.clientPromise; const {data,error}=await client.functions.invoke("completion-status",{body:{courseId:appConfig.courseId,attemptId}});if(error)throw error;return data.completionReceipt as SyncResult["completionReceipt"]; }
  async signIn(email: string) {
    const client = await this.clientPromise;
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    if (error) throw error;
  }
  async signOut() { const client = await this.clientPromise; const { error } = await client.auth.signOut(); if (error) throw error; }
  async loadLeaderboard(contentVersion: string): Promise<LeaderboardRow[]> {
    const client = await this.clientPromise;
    const { data, error } = await client.functions.invoke("cohort-leaderboard", { body: { courseId: appConfig.courseId, contentVersion } });
    if (error) throw error;
    return (data?.rows ?? []) as LeaderboardRow[];
  }
  async loadFacultyReport(): Promise<FacultyReportRow[]> {
    const client = await this.clientPromise;
    const { data: cohorts, error: cohortError } = await client.from("cohorts").select("id").eq("course_id", appConfig.courseId);
    if (cohortError) throw cohortError;
    const cohortIds = (cohorts ?? []).map((row) => row.id as string);
    if (!cohortIds.length) return [];
    const [{ data: memberships, error: membershipError }, { data: attempts, error: attemptError }] = await Promise.all([
      client.from("memberships").select("cohort_id,user_id,learner_id").in("cohort_id", cohortIds),
      client.from("attempts").select("id,user_id,cohort_id,content_version,reporting_status,attempt_summaries(core_score,reward_total,reward_maximum,reward_scheme,first_correct,corrected_nodes,clothing_level,case_stamps,safety_badges,answered_nodes,reviewed_missions,resolved_concepts,first_final_score,latest_final_score,reflection_submitted,completed,completed_at,last_event_at)").in("cohort_id", cohortIds)
    ]);
    if (membershipError) throw membershipError;
    if (attemptError) throw attemptError;
    const learnerByUser = new Map((memberships ?? []).map((row) => [`${row.cohort_id}:${row.user_id}`, row.learner_id as string]));
    return (attempts ?? []).map((row) => {
      const rawSummary = Array.isArray(row.attempt_summaries) ? row.attempt_summaries[0] : row.attempt_summaries;
      const summary = (rawSummary ?? {}) as Record<string, unknown>;
      return {
        learnerId: learnerByUser.get(`${row.cohort_id}:${row.user_id}`) ?? "restricted",
        cohortId: row.cohort_id as string,
        attemptId: row.id as string,
        contentVersion: row.content_version as string,
        reportingStatus: row.reporting_status as string,
        coreScore: Number(summary.core_score ?? 0),
        rewardTotal: Number(summary.reward_total ?? 0),
        rewardMaximum: Number(summary.reward_maximum ?? 150),
        rewardScheme: String(summary.reward_scheme ?? "legacy-150"),
        firstCorrect: Number(summary.first_correct ?? 0),
        correctedNodes: Number(summary.corrected_nodes ?? 0),
        clothingLevel: Number(summary.clothing_level ?? 1),
        caseStamps: Array.isArray(summary.case_stamps) ? summary.case_stamps as string[] : [],
        safetyBadges: Array.isArray(summary.safety_badges) ? summary.safety_badges as string[] : [],
        answeredNodes: Number(summary.answered_nodes ?? 0),
        reviewedMissions: Number(summary.reviewed_missions ?? 0),
        resolvedConcepts: Number(summary.resolved_concepts ?? 0),
        firstFinalScore: summary.first_final_score == null ? null : Number(summary.first_final_score),
        latestFinalScore: summary.latest_final_score == null ? null : Number(summary.latest_final_score),
        reflectionSubmitted: Boolean(summary.reflection_submitted),
        completed: Boolean(summary.completed),
        completedAt: typeof summary.completed_at === "string" ? summary.completed_at : null,
        lastEventAt: typeof summary.last_event_at === "string" ? summary.last_event_at : null
      };
    });
  }
  async syncEvents(events: LearningEvent[]): Promise<SyncResult> {
    const client = await this.clientPromise;
    for (const first of new Map(events.map((event) => [event.attemptId,event])).values()) {
      const { error: startError } = await client.functions.invoke("start-attempt", { body: { attemptId: first.attemptId, courseId: appConfig.courseId, contentVersion: first.contentVersion, kind: "initial" } });
      if (startError) throw startError;
    }
    const result:SyncResult={acknowledgments:[],retryable:[],rejected:[]};
    const batches=submissionBatches(events,appConfig.courseId);
    for(let index=0;index<batches.length;index++){
      const {data,error}=await client.functions.invoke("sync-events",{body:{courseId:appConfig.courseId,events:batches[index]}});
      if(error){result.retryable.push(...batches.slice(index).flat().map(event=>event.eventId));break;}
      const next=data as SyncResult;result.acknowledgments.push(...next.acknowledgments);result.retryable.push(...next.retryable);result.rejected.push(...next.rejected);
      if(next.completionReceipt)result.completionReceipt=next.completionReceipt;
      if(next.retryable.length||next.rejected.length){result.retryable.push(...batches.slice(index+1).flat().map(event=>event.eventId));break;}
    }
    return result;
  }
}

export function createBackendAdapter(): BackendAdapter {
  if (appConfig.mode === "connected" && appConfig.supabaseUrl && appConfig.supabasePublishableKey) return new SupabaseBackendAdapter(appConfig.supabaseUrl, appConfig.supabasePublishableKey);
  return new DemoBackendAdapter();
}
