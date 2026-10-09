import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { LearningEvent } from "../domain/types";
import {validateLearningSequence} from "../domain/learningRules";

type StoredEvent = LearningEvent & { accountKey: string; outboxStatus: "pending" | "acknowledged" | "failed"; };
interface Draft { key: string; accountKey: string; attemptId: string; nodeId: string; rationale: string; updatedAt: string; }
interface OfflinePack { key: string; accountKey: string; version: string; state: "staging" | "ready" | "incomplete"; expectedBytes: number; verifiedBytes: number; updatedAt: string; }
interface Setting { key: string; value: unknown; }

interface PelvicDb extends DBSchema {
  events: { key: string; value: StoredEvent; indexes: { "by-account-attempt": [string, string]; "by-outbox": [string, string] } };
  drafts: { key: string; value: Draft; indexes: { "by-account-attempt": [string, string] } };
  packs: { key: string; value: OfflinePack; indexes: { "by-account": string } };
  settings: { key: string; value: Setting };
}

let instance: Promise<IDBPDatabase<PelvicDb>> | null = null;

export function getDb() {
  if (!instance) {
    instance = openDB<PelvicDb>("pelvic-trauma-decisions", 1, {
      upgrade(db) {
        const events = db.createObjectStore("events", { keyPath: "eventId" });
        events.createIndex("by-account-attempt", ["accountKey", "attemptId"]);
        events.createIndex("by-outbox", ["accountKey", "outboxStatus"]);
        const drafts = db.createObjectStore("drafts", { keyPath: "key" });
        drafts.createIndex("by-account-attempt", ["accountKey", "attemptId"]);
        const packs = db.createObjectStore("packs", { keyPath: "key" });
        packs.createIndex("by-account", "accountKey");
        db.createObjectStore("settings", { keyPath: "key" });
      }
    });
  }
  return instance;
}

export async function loadEvents(accountKey: string, attemptId: string): Promise<LearningEvent[]> {
  const db = await getDb();
  const stored=await db.getAllFromIndex("events", "by-account-attempt", [accountKey, attemptId]);
  const accepted=new Map(stored.filter(event=>event.serverReceiptTimestamp).map(event=>[event.clientSequence,event.eventId]));
  return stored.filter(event=>event.outboxStatus!=="failed"&&(!accepted.has(event.clientSequence)||accepted.get(event.clientSequence)===event.eventId))
    .sort((a, b) => a.clientSequence - b.clientSequence)
    .map(({ accountKey: _accountKey, outboxStatus: _outboxStatus, ...event }) => event as LearningEvent);
}

/** Accepted remote events are authoritative; divergent local events remain in the outbox for review. */
export async function importAcceptedEvents(accountKey:string, events:LearningEvent[]) {
  const db=await getDb();const tx=db.transaction("events","readwrite");
  for(const event of events){if(!event.serverReceiptTimestamp)continue;const existing=await tx.store.get(event.eventId);
    if(existing&&existing.accountKey!==accountKey)throw new Error("Event partition mismatch");
    await tx.store.put({...event,accountKey,outboxStatus:"acknowledged"});
  }await tx.done;
}

export async function appendEventAtomically(accountKey: string, event: LearningEvent): Promise<LearningEvent> {
  const db = await getDb();
  const transaction = db.transaction(["events"], "readwrite");
  const existing = await transaction.objectStore("events").get(event.eventId);
  const comparable=(item:LearningEvent)=>JSON.stringify({...item,clientSequence:0,serverReceiptTimestamp:null});
  const original=existing?(({accountKey:_account,outboxStatus:_status,...saved})=>saved as LearningEvent)(existing):null;
  if (existing && (existing.accountKey!==accountKey || comparable(original!)!==comparable(event))) {
    transaction.abort();
    await transaction.done.catch(()=>undefined);
    throw new Error("An event with this ID already exists with different data.");
  }
  const allPrevious=await transaction.objectStore("events").index("by-account-attempt").getAll([accountKey,event.attemptId]);
  const accepted=new Map(allPrevious.filter(item=>item.serverReceiptTimestamp).map(item=>[item.clientSequence,item.eventId]));
  const previous=allPrevious.filter(item=>item.outboxStatus!=="failed"&&(!accepted.has(item.clientSequence)||accepted.get(item.clientSequence)===item.eventId));
  const saved=original ?? {...event,clientSequence:previous.reduce((max,item)=>Math.max(max,item.clientSequence),0)+1};
  if(!existing){const error=validateLearningSequence(saved,previous);if(error){transaction.abort();await transaction.done.catch(()=>undefined);throw new Error(error);}}
  if (!existing) await transaction.objectStore("events").add({ ...saved, accountKey, outboxStatus: "pending" } as StoredEvent);
  await transaction.done;
  return saved;
}

export async function saveDraft(accountKey: string, attemptId: string, nodeId: string, rationale: string): Promise<void> {
  const db = await getDb();
  await db.put("drafts", { key: `${accountKey}:${attemptId}:${nodeId}`, accountKey, attemptId, nodeId, rationale, updatedAt: new Date().toISOString() });
}

export async function loadDraft(accountKey: string, attemptId: string, nodeId: string): Promise<string> {
  return (await (await getDb()).get("drafts", `${accountKey}:${attemptId}:${nodeId}`))?.rationale ?? "";
}

export async function pendingEvents(accountKey: string): Promise<LearningEvent[]> {
  return (await (await getDb()).getAllFromIndex("events", "by-outbox", [accountKey, "pending"]))
    .map(({ accountKey: _accountKey, outboxStatus: _outboxStatus, ...event }) => event as LearningEvent);
}

export async function acknowledgeEvents(accountKey: string, acknowledgments: Array<{ eventId: string; serverReceiptTimestamp: string }>, completionReceipt?: {status:"server_confirmed";completedAt:string;reportingAttemptId:string}): Promise<void> {
  const db = await getDb();
  const transaction = db.transaction("events", "readwrite");
  for (const ack of acknowledgments) {
    const event = await transaction.store.get(ack.eventId);
    if (event?.accountKey === accountKey) await transaction.store.put({ ...event, outboxStatus: "acknowledged", serverReceiptTimestamp: ack.serverReceiptTimestamp });
  }
  await transaction.done;
  if (completionReceipt) await db.put("settings", {key:`completion:${accountKey}:${completionReceipt.reportingAttemptId}`,value:completionReceipt});
}

export async function hasCompletionReceipt(accountKey: string, attemptId: string): Promise<boolean> {
  const setting = await (await getDb()).get("settings",`completion:${accountKey}:${attemptId}`);
  const value = setting?.value as {status?:string;reportingAttemptId?:string} | undefined;
  return value?.status === "server_confirmed" && value.reportingAttemptId === attemptId;
}
export async function storeSubmissionRejections(accountKey:string,rejected:Array<{eventId:string;reason:string}>) {
 const db=await getDb();for(const item of rejected){await db.put("settings",{key:`rejected:${accountKey}:${item.eventId}`,value:item});const event=await db.get("events",item.eventId);if(event?.accountKey===accountKey)await db.put("events",{...event,outboxStatus:"failed"});}
}
export async function submissionRejections(accountKey:string):Promise<Array<{eventId:string;reason:string}>> {
 const settings=await(await getDb()).getAll("settings");return settings.filter(setting=>setting.key.startsWith(`rejected:${accountKey}:`)).map(setting=>setting.value as {eventId:string;reason:string});
}

export async function stageOfflinePack(accountKey: string, version: string, expectedBytes: number, interrupt = false, urls: string[] = []): Promise<OfflinePack> {
  const db = await getDb();
  const key = `${accountKey}:${version}`;
  await db.put("packs", { key, accountKey, version, state: "staging", expectedBytes, verifiedBytes: 0, updatedAt: new Date().toISOString() });
  let verifiedBytes = 0;
  let verified = false;
  try {
    if (!navigator.serviceWorker?.controller || urls.length === 0) throw new Error("Reload after the service worker is active before verifying offline files.");
    for (const url of [...new Set(urls)]) {
      if (interrupt) break;
      const cached = await caches.match(url, {ignoreSearch:true});
      if (!cached?.ok) throw new Error(`Offline file not cached: ${url}`);
      verifiedBytes += (await cached.arrayBuffer()).byteLength;
    }
    verified = !interrupt;
  } catch { verified = false; }
  const pack: OfflinePack = { key, accountKey, version, state: verified ? "ready" : "incomplete", expectedBytes: verified ? verifiedBytes : expectedBytes, verifiedBytes, updatedAt: new Date().toISOString() };
  await db.put("packs", pack);
  return pack;
}

export async function getOfflinePack(accountKey: string, version: string): Promise<OfflinePack | undefined> {
  return (await getDb()).get("packs", `${accountKey}:${version}`);
}

export async function clearAccountData(accountKey: string): Promise<void> {
  const db = await getDb();
  const eventTx = db.transaction("events", "readwrite");
  for (const event of await eventTx.store.index("by-account-attempt").getAll(IDBKeyRange.bound([accountKey, ""], [accountKey, "\uffff"]))) await eventTx.store.delete(event.eventId);
  await eventTx.done;
}
