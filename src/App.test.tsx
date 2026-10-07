import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App, { clothingLevel, nodeReactions } from "./App";
import { appendEventAtomically } from "./storage/db";
import { activateContent } from "./content/registry";

vi.mock("./storage/db", async () => ({
  loadEvents: vi.fn(async () => []), getOfflinePack: vi.fn(async () => undefined), pendingEvents: vi.fn(async () => []),
  appendEventAtomically: vi.fn(async () => undefined), acknowledgeEvents: vi.fn(async () => undefined),
  loadDraft: vi.fn(async () => ""), saveDraft: vi.fn(async () => undefined), stageOfflinePack: vi.fn(async () => ({ state: "ready" }))
  ,hasCompletionReceipt:vi.fn(async()=>false)
}));

describe("learner entry", () => {
  beforeEach(() => {localStorage.clear();activateContent("ptd-learning-draft-2026-10-03");localStorage.setItem("ptd-active-attempt:demo:demo-learner-001:demo-course",JSON.stringify({attemptId:"legacy-learning-test",contentVersion:"ptd-learning-draft-2026-10-03"}));});
  afterEach(cleanup);
  it("shows the real learning start and demo boundary", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: /Choose your clinical learner/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Choose character [1234]/i })).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: /Start quest/i }));
    expect(await screen.findByRole("heading", { name: /Explore.*Build your reasoning/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Approach a patient to open a case/i })).toBeInTheDocument();
    expect(screen.getByText(/DEMO · fictional records/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open quest briefing/i })).toBeEnabled();
    const enterCase = screen.getByRole("button", { name: /Enter case/i });
    expect(enterCase).toBeDisabled();
    const moveUp = screen.getByRole("button", { name: /Move up/i });
    fireEvent.click(moveUp); fireEvent.click(moveUp); fireEvent.click(moveUp);
    expect(enterCase).toBeEnabled();
  });

  it("switches the learner journey to Thai", async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: /เปลี่ยนเป็นภาษาไทย/i }));
    expect(screen.getByRole("heading", { name: /เลือกตัวละครผู้เรียน/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /เริ่มภารกิจ/i })).toBeInTheDocument();
  });

  it("walks with a held key and stops when released or blurred", async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: /Start quest/i }));
    const room = screen.getByLabelText(/Emergency room free movement area/i);
    fireEvent.keyDown(room, { key: "ArrowUp" });
    await waitFor(() => expect(screen.getByRole("button", { name: /Enter case/i })).toBeEnabled(), { timeout: 1500 });
    expect(room.querySelector(".student-avatar")).toHaveClass("walking");
    fireEvent.keyUp(window, { key: "ArrowUp" });
    await waitFor(() => expect(room.querySelector(".student-avatar")).not.toHaveClass("walking"));
    fireEvent.keyDown(room, { key: "ArrowLeft" });
    await waitFor(() => expect(room.querySelector(".student-avatar")).toHaveClass("facing-left"));
    fireEvent.blur(window);
    await waitFor(() => expect(room.querySelector(".student-avatar")).not.toHaveClass("walking"));
  });

  it("assigns a situation reaction to every numbered quest decision", () => {
    expect(Object.keys(nodeReactions)).toHaveLength(15);
    expect(new Set(Object.values(nodeReactions))).toEqual(new Set(["observe", "urgent", "inspect", "communicate"]));
  });

  it("unlocks five clothing levels from deterministic reward thresholds", () => {
    expect([0,39,40,89,90,149,150,209,210,250].map(clothingLevel)).toEqual([1,1,2,2,3,3,4,4,5,5]);
  });

  it("allows action decisions without confidence or reason and stores the first choice",async()=>{
    render(<App/>);
    fireEvent.click(await screen.findByRole("button",{name:"Quests"}));
    fireEvent.click(screen.getAllByRole("button",{name:"Accept quest"})[0]);
    fireEvent.click(await screen.findByRole("radio",{name:/Possible major haemorrhage/}));
    const submit=screen.getByRole("button",{name:"Lock in action"});
    expect(submit).toBeEnabled();fireEvent.click(submit);
    expect(await screen.findByRole("button",{name:"Collect reward"})).toBeInTheDocument();
    const last=vi.mocked(appendEventAtomically).mock.calls.at(-1)![1];
    expect(last.type).toBe("core_response");
    expect(last).not.toHaveProperty("confidence");expect(last).not.toHaveProperty("rationale");
  });

  it("requires explicit correction explanation review before advancing",async()=>{
    render(<App/>);
    fireEvent.click(await screen.findByRole("button",{name:"Quests"}));
    fireEvent.click(screen.getAllByRole("button",{name:"Accept quest"})[0]);
    fireEvent.click(document.querySelector('input[value="M1N1_A"]')!);
    fireEvent.click(screen.getByRole("button",{name:"Lock in action"}));
    fireEvent.click(await screen.findByRole("button",{name:"Open same-step retry"}));
    fireEvent.click(await screen.findByRole("radio",{name:/current physiology raises concern/}));
    fireEvent.click(screen.getByRole("button",{name:"Check correction"}));
    const acknowledge=await screen.findByRole("button",{name:"I reviewed the explanation · collect reward"});
    expect(screen.queryByRole("button",{name:"Reveal next clue"})).not.toBeInTheDocument();
    const response=vi.mocked(appendEventAtomically).mock.calls.at(-1)![1];
    expect(response).toMatchObject({type:"correction_response",feedbackAcknowledged:false});
    fireEvent.click(acknowledge);
    expect(await screen.findByRole("button",{name:"Reveal next clue"})).toBeInTheDocument();
    expect(vi.mocked(appendEventAtomically).mock.calls.at(-1)![1]).toMatchObject({type:"correction_feedback_ack"});
  });

  it("requires a brief reason only at the patient handover and never requires confidence",async()=>{
    render(<App/>);
    fireEvent.click(await screen.findByRole("button",{name:"Quests"}));
    fireEvent.click(screen.getAllByRole("button",{name:"Accept quest"})[2]);
    for(const id of ["M3N1_A","M3N2_C","M3N3_B"]){
      await waitFor(()=>expect(document.querySelector(`input[value="${id}"]`)).not.toBeNull());
      fireEvent.click(document.querySelector(`input[value="${id}"]`)!);
      fireEvent.click(screen.getByRole("button",{name:"Lock in action"}));
      fireEvent.click(await screen.findByRole("button",{name:"Collect reward"}));
      fireEvent.click(await screen.findByRole("button",{name:"Reveal next clue"}));
    }
    expect(await screen.findByRole("button",{name:"Save reason and reveal choices"})).toBeDisabled();
    expect(document.querySelector('input[value="M3N4_A"]')).toBeNull();
    fireEvent.change(screen.getByRole("textbox"),{target:{value:"Suspected injury; uncertainty remains."}});
    fireEvent.click(screen.getByRole("button",{name:"Save reason and reveal choices"}));
    await waitFor(()=>expect(document.querySelector('input[value="M3N4_A"]')).not.toBeNull());
    fireEvent.click(document.querySelector('input[value="M3N4_A"]')!);
    expect(screen.getByRole("button",{name:"Lock in action"})).toBeEnabled();
  });
});
