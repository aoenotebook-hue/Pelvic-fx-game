import { getContent, latestContent } from "../content/registry";
import { LEGACY_VERSION } from "../domain/rewards";
import { appConfig } from "../config";
import { loadEvents } from "./db";

export interface AttemptSession { attemptId: string; contentVersion: string; kind?: "initial" | "practice"; originalAttemptId?: string; }
const activeKey = (account: string) => `ptd-active-attempt:${account}:${appConfig.courseId}`;
export function saveSession(account: string, session: AttemptSession) { localStorage.setItem(activeKey(account), JSON.stringify(session)); localStorage.setItem(`ptd-session:${session.attemptId}`,JSON.stringify(session)); }
export function attemptMetadata(id:string):AttemptSession|undefined { const value=localStorage.getItem(`ptd-session:${id}`);return value?JSON.parse(value):undefined; }
export function beginPractice(account:string, original:AttemptSession):AttemptSession {
  const session:AttemptSession={attemptId:crypto.randomUUID(),contentVersion:original.contentVersion,kind:"practice",originalAttemptId:original.originalAttemptId??original.attemptId};
  saveSession(account,session);return session;
}
export async function resolveSession(account: string, userId: string): Promise<AttemptSession> {
  const saved = localStorage.getItem(activeKey(account));
  if (saved) {
    const parsed = JSON.parse(saved) as AttemptSession;
    if (!parsed.attemptId) throw new Error("Missing saved attempt identity");
    getContent(parsed.contentVersion);
    return parsed;
  }
  const legacyAttempt = appConfig.mode === "demo" ? appConfig.demoAttemptId : localStorage.getItem(`ptd-attempt:${userId}:${appConfig.courseId}:${LEGACY_VERSION}`);
  if (legacyAttempt && (await loadEvents(account, legacyAttempt)).some((event) => event.contentVersion === LEGACY_VERSION)) {
    const session = { attemptId: legacyAttempt, contentVersion: LEGACY_VERSION };
    saveSession(account, session);
    return session;
  }
  return beginRevision(account, userId);
}
export function beginRevision(account: string, userId: string): AttemptSession {
  const key = `ptd-attempt:${userId}:${appConfig.courseId}:${latestContent.id}`;
  const attemptId = localStorage.getItem(key) ?? (appConfig.mode === "demo" ? `demo-attempt-${latestContent.id}` : crypto.randomUUID());
  const session = { attemptId, contentVersion: latestContent.id };
  localStorage.setItem(key, attemptId);
  saveSession(account, session);
  return session;
}
