import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MfaSetup } from "./MfaSetup";
import type { BackendAdapter } from "../sync/adapter";

describe("teacher two-step verification", () => {
  it("enrols an authenticator app, then verifies a 6-digit code", async () => {
    const backend = {
      mode: "connected",
      syncEvents: vi.fn(),
      mfaStatus: vi.fn(async () => ({ verified: false, factorId: null })),
      mfaEnroll: vi.fn(async () => ({ factorId: "f1", qrCode: "data:image/svg+xml;base64,PHN2Zy8+", secret: "ABC" })),
      mfaVerify: vi.fn(async () => undefined),
    } as unknown as BackendAdapter;
    const onVerified = vi.fn();
    render(<MfaSetup backend={backend} onVerified={onVerified} />);
    fireEvent.click(await screen.findByRole("button", { name: /Set up my authenticator app/ }));
    expect(await screen.findByAltText(/QR code/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/6-digit code/), { target: { value: "12a3456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => expect(backend.mfaVerify).toHaveBeenCalledWith("f1", "123456"));
    expect(onVerified).toHaveBeenCalled();
  });

  it("skips set-up when the session is already verified", async () => {
    const backend = { mode: "connected", syncEvents: vi.fn(), mfaStatus: vi.fn(async () => ({ verified: true, factorId: "f1" })) } as unknown as BackendAdapter;
    const onVerified = vi.fn();
    render(<MfaSetup backend={backend} onVerified={onVerified} />);
    await waitFor(() => expect(onVerified).toHaveBeenCalled());
  });
});
