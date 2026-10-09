import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountMenu } from "./AccountMenu";
afterEach(cleanup);
describe("account menu", () => {
  it("offers progress, sync and reset; closes on selection, outside click and Escape",()=>{
    const progress=vi.fn(),sync=vi.fn(),reset=vi.fn();render(<AccountMenu language="en" studentId="001234" pendingCount={0} signOut={vi.fn()} onSignedOut={vi.fn()} onProgress={progress} onSync={sync} onReset={reset}/>);
    const summary=screen.getByText("Account"),details=summary.closest("details")!;
    for(const [name,callback] of [["My progress",progress],["Sync now",sync],["Reset progress",reset]] as const){details.open=true;fireEvent.click(screen.getByRole("button",{name}));expect(callback).toHaveBeenCalledOnce();expect(details.open).toBe(false);}
    expect(screen.getByText("Student ID: 001234")).toBeInTheDocument();details.open=true;fireEvent.pointerDown(document.body);expect(details.open).toBe(false);details.open=true;fireEvent.keyDown(summary,{key:"Escape"});expect(details.open).toBe(false);expect(document.activeElement).toBe(details.querySelector("summary"));
  });
  it("explains preserved unsent work and prevents overlapping sign-out", async () => {
    let finish!: () => void;
    const signOut = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const onSignedOut = vi.fn();
    render(<AccountMenu language="en" pendingCount={2} signOut={signOut} onSignedOut={onSignedOut} />);
    fireEvent.click(screen.getByText("Account"));
    expect(screen.getByText(/2 records waiting to sync/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    const busy = screen.getByRole("button", { name: "Signing out…" });
    expect(busy).toBeDisabled(); fireEvent.click(busy);
    expect(signOut).toHaveBeenCalledTimes(1);expect(onSignedOut).not.toHaveBeenCalled();
    finish(); await waitFor(() => expect(onSignedOut).toHaveBeenCalledTimes(1));
  });
  it("shows failure and permits retry without pretending the user signed out", async () => {
    const signOut=vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
    const onSignedOut=vi.fn();
    render(<AccountMenu language="en" pendingCount={0} signOut={signOut} onSignedOut={onSignedOut}/>);
    fireEvent.click(screen.getByText("Account"));
    fireEvent.click(screen.getByRole("button",{name:"Sign out"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not sign out");
    expect(onSignedOut).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Sign out"}));
    await waitFor(()=>expect(onSignedOut).toHaveBeenCalledTimes(1));
  });
  it("provides Thai account controls and progress warning", async () => {
    render(<AccountMenu language="th" pendingCount={3} signOut={vi.fn().mockResolvedValue(undefined)} onSignedOut={vi.fn()}/>);
    fireEvent.click(screen.getByText("บัญชี"));
    expect(screen.getByText(/3 รายการรอส่ง/)).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"ออกจากระบบ"})).toBeEnabled();
  });
});
