import {beforeEach,describe,it,expect,vi} from "vitest";
import {resolveSession,beginRevision,saveSession} from "./session";
import {LEGACY_VERSION} from "../domain/rewards";
import {MINIGAME_VERSION as REVISION_VERSION} from "../games/spec";
import {loadEvents} from "./db";
import {appConfig} from "../config";
vi.mock("./db",()=>({loadEvents:vi.fn(async()=>[])}));
describe("saved attempt version selection",()=>{
  beforeEach(()=>{localStorage.clear();vi.mocked(loadEvents).mockResolvedValue([]);});
  it("opens the revision for a new learner and preserves its identity on resume",async()=>{
    const session=await resolveSession("demo:new","new");
    expect(session.contentVersion).toBe(REVISION_VERSION);
    expect(await resolveSession("demo:new","new")).toEqual(session);
    expect(beginRevision("demo:new","new")).toEqual(session);
  });
  it("resumes original questions for existing legacy events without replacing them",async()=>{
    vi.mocked(loadEvents).mockResolvedValue([{contentVersion:LEGACY_VERSION}] as never);
    const original=await resolveSession("demo:old","old");
    expect(original).toEqual({attemptId:appConfig.demoAttemptId,contentVersion:LEGACY_VERSION});
    const revised=beginRevision("demo:old","old");
    expect(revised.contentVersion).toBe(REVISION_VERSION);
    expect(revised.attemptId).not.toBe(original.attemptId);
  });
  it("does not silently replace an unknown saved version",async()=>{
    saveSession("demo:unknown",{attemptId:"preserve",contentVersion:"unknown"});
    await expect(resolveSession("demo:unknown","unknown")).rejects.toThrow();
    expect(localStorage.getItem(`ptd-active-attempt:demo:unknown:${appConfig.courseId}`)).toContain("preserve");
  });
  it("keeps a saved v2 attempt pinned after the learning revision",async()=>{
    const original={attemptId:"original-v2",contentVersion:"ptd-caseflow-draft-2026-10-02"};
    saveSession("demo:v2",original);
    expect(await resolveSession("demo:v2","v2")).toEqual(original);
  });
});
