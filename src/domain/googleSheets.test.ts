import { afterEach, describe, expect, it, vi } from "vitest";
import { accessToken, safeCell, SheetsClient } from "../../supabase/functions/_shared/googleSheets";

const fromB64 = (text: string) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=")), (char) => char.charCodeAt(0));
const toB64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const decode = (part: string) => JSON.parse(new TextDecoder().decode(fromB64(part)));

describe("Google Sheets export client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("signs a service-account JWT that Google can verify", async () => {
    const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
    const pkcs8 = toB64(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
    const pem = `-----BEGIN PRIVATE KEY-----\n${pkcs8.match(/.{1,64}/g)!.join("\n")}\n-----END PRIVATE KEY-----\n`;
    let assertion = "";
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      assertion = new URLSearchParams(String(init.body)).get("assertion")!;
      return new Response(JSON.stringify({ access_token: "token-1" }), { status: 200 });
    }));
    const token = await accessToken({ client_email: "exporter@project.iam.gserviceaccount.com", private_key: pem }, 1_800_000_000);
    expect(token).toBe("token-1");
    const [header, claims, signature] = assertion.split(".");
    expect(decode(header)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(decode(claims)).toMatchObject({ iss: "exporter@project.iam.gserviceaccount.com", scope: "https://www.googleapis.com/auth/spreadsheets", exp: 1_800_000_600 });
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", pair.publicKey, fromB64(signature), new TextEncoder().encode(`${header}.${claims}`));
    expect(valid).toBe(true);
  });

  it("writes with USER_ENTERED and blocks injected formulas", async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => { calls.push({ url, body: JSON.parse(String(init.body)) }); return new Response("{}", { status: 200 }); }));
    await new SheetsClient("sheet-1", "t").write([{ range: "'Attempts'!A1", values: [[safeCell("=IMPORTXML(\"x\")"), safeCell("ok"), safeCell(5)]] }]);
    expect(calls[0].url).toContain("/spreadsheets/sheet-1/values:batchUpdate");
    expect(calls[0].body).toMatchObject({ valueInputOption: "USER_ENTERED", data: [{ values: [["'=IMPORTXML(\"x\")", "ok", 5]] }] });
    expect(safeCell('=IF(J2>0,TDIST(ABS(I2),J2,2),"")', true)).toBe('=IF(J2>0,TDIST(ABS(I2),J2,2),"")');
    expect(safeCell('=HYPERLINK("http://evil")', true)).toBe('\'=HYPERLINK("http://evil")');
  });
});
