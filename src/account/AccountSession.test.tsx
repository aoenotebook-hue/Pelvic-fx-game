import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const auth=vi.hoisted(()=>({changed:null as null|((id:string|null)=>void),currentUserId:vi.fn(),signOut:vi.fn(),syncEvents:vi.fn(),facultyWorkspace:vi.fn(),learnerContext:vi.fn(),learnerAttempts:vi.fn(),importAcceptedEvents:vi.fn()}));
vi.mock("../config",()=>({appConfig:{mode:"connected",courseId:"test-course",demoUserId:"demo",demoAttemptId:"demo"}}));
vi.mock("../sync/adapter",()=>({createBackendAdapter:()=>({mode:"connected",currentUserId:auth.currentUserId,onAuthChange:(callback:typeof auth.changed)=>{auth.changed=callback;return()=>{auth.changed=null;};},signOut:auth.signOut,syncEvents:auth.syncEvents,facultyWorkspace:auth.facultyWorkspace,learnerContext:auth.learnerContext,learnerAttempts:auth.learnerAttempts})}));
vi.mock("../storage/session",()=>({resolveSession:async()=>({attemptId:"test-attempt",contentVersion:"ptd-minigame-focused-2026-10-08"}),beginRevision:vi.fn()}));
vi.mock("../storage/db",()=>({getDb:async()=>({get:async()=>undefined,put:vi.fn()}),loadEvents:async()=>[],getOfflinePack:async()=>undefined,pendingEvents:async()=>[],loadDraft:async()=>"",saveDraft:vi.fn(),appendEventAtomically:vi.fn(),acknowledgeEvents:vi.fn(),hasCompletionReceipt:async()=>false,stageOfflinePack:vi.fn(),storeSubmissionRejections:vi.fn(),submissionRejections:async()=>[],importAcceptedEvents:auth.importAcceptedEvents}));
import App from "../App";
describe("authenticated account lifecycle",()=>{
  beforeEach(()=>{localStorage.clear();window.history.replaceState(null,"","/");auth.currentUserId.mockReset().mockResolvedValue("teacher");auth.signOut.mockReset().mockImplementation(async()=>{auth.changed?.(null);});auth.facultyWorkspace.mockReset().mockResolvedValue({authorized:true,roster:[],attempts:[],reviews:[]});auth.learnerContext.mockReset().mockResolvedValue({studentId:"teacher"});auth.learnerAttempts.mockReset().mockResolvedValue([]);auth.importAcceptedEvents.mockReset().mockResolvedValue(undefined);});
  afterEach(cleanup);
  it("stops an old initializer before requesting or importing the new account's evidence",async()=>{
    let finish!:(profile:{studentId:string})=>void;
    auth.learnerContext.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    render(<App/>);await waitFor(()=>expect(auth.learnerContext).toHaveBeenCalledOnce());
    await act(async()=>{auth.changed?.("student-b");});await screen.findByText("Account");
    const before=auth.learnerAttempts.mock.calls.length;
    await act(async()=>{finish({studentId:"teacher"});});
    expect(auth.learnerAttempts).toHaveBeenCalledTimes(before);
    expect(auth.importAcceptedEvents).not.toHaveBeenCalled();
  });
  it("does not let an older startup snapshot undo a newer sign-in event",async()=>{
    let finish!:(id:string|null)=>void;
    auth.currentUserId.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    render(<App/>);
    await act(async()=>{auth.changed?.("teacher");});
    await screen.findByText("Account");
    await act(async()=>{finish(null);});
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.queryByRole("heading",{name:"Institutional sign-in"})).not.toBeInTheDocument();
  });
  it("rechecks authentication when returning to the game tab",async()=>{
    auth.currentUserId.mockResolvedValueOnce(null).mockResolvedValue("teacher");render(<App/>);
    await screen.findByRole("heading",{name:"Enter game"});
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    fireEvent.focus(window);
    await screen.findByText("Account");
    expect(screen.getByRole("button",{name:"Resources"})).toBeInTheDocument();
  });
  it("Home and Quests return from an open case even if already on that route",async()=>{
    render(<App/>);
    fireEvent.click(await screen.findByRole("button",{name:"Start first patient"}));
    await screen.findByRole("button",{name:/Emergency room \(work saved\)/});
    fireEvent.click(screen.getByRole("button",{name:"Home"}));
    await screen.findByRole("button",{name:"Start first patient"});
    fireEvent.click(screen.getByRole("button",{name:"Quests"}));
    fireEvent.click(screen.getByRole("button",{name:"Start first patient"}));
    await screen.findByRole("button",{name:/Emergency room \(work saved\)/});
    fireEvent.click(screen.getByRole("button",{name:"Quests"}));
    await screen.findByRole("button",{name:"Start first patient"});
    fireEvent.click(screen.getByRole("button",{name:"Resources"}));
    expect(await screen.findByRole("heading",{name:"Illustrated reference inventory"})).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button",{name:"My progress"})[0]);
    expect(await screen.findByRole("heading",{name:/learning|shift/i})).toBeInTheDocument();
  });
  it("sign-out hides staff access and keeps all learner navigation at sign-in",async()=>{
    render(<App/>);
    await screen.findByText("Account");await screen.findByRole("link",{name:"Teacher area"});
    fireEvent.click(screen.getByText("Account"));fireEvent.click(screen.getByRole("button",{name:"Sign out"}));
    await waitFor(()=>expect(screen.queryByText("Account")).not.toBeInTheDocument());
    expect(screen.queryByRole("link",{name:"Teacher area"})).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Sync now"})).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Quests"})).not.toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Enter game"})).toBeInTheDocument();
    expect(screen.queryByRole("heading",{name:"Red Alert"})).not.toBeInTheDocument();
    expect(screen.getByText(/Signed out. Saved work/)).toBeInTheDocument();
  });
  it("retains staff state when the service rejects sign-out without an auth change",async()=>{
    auth.signOut.mockRejectedValue(new Error("service unavailable"));render(<App/>);
    await screen.findByRole("link",{name:"Teacher area"});fireEvent.click(screen.getByText("Account"));fireEvent.click(screen.getByRole("button",{name:"Sign out"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not sign out");
    expect(screen.getByRole("link",{name:"Teacher area"})).toBeInTheDocument();
  });
});
