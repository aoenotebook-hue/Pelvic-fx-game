import { describe, expect, it } from "vitest";
import { assuranceLevel, corsHeaders, hasTwoStepVerification, withCors } from "../../supabase/functions/_shared/http";

const token = (claims: Record<string, unknown>) => `x.${btoa(JSON.stringify(claims)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")}.sig`;
const request = (headers: Record<string, string>, method = "POST") => new Request("https://example.test/fn", { method, headers });

describe("edge-function HTTP safety", () => {
  it("allows only the production origin, never a wildcard", () => {
    expect(corsHeaders(request({ origin: "https://pelvic-fx-game.vercel.app" }))["Access-Control-Allow-Origin"]).toBe("https://pelvic-fx-game.vercel.app");
    expect(corsHeaders(request({ origin: "https://evil.example" }))["Access-Control-Allow-Origin"]).toBeUndefined();
  });
  it("answers preflight without calling the authenticated handler", async () => {
    let called = false;
    const response = await withCors((_request: Request) => { called = true; return new Response("x"); })(request({ origin: "https://pelvic-fx-game.vercel.app" }, "OPTIONS"));
    expect(response.status).toBe(204);
    expect(called).toBe(false);
  });
  it("reads the MFA level from the access token", () => {
    expect(assuranceLevel(request({ authorization: `Bearer ${token({ aal: "aal2" })}` }))).toBe("aal2");
    expect(hasTwoStepVerification(request({ authorization: `Bearer ${token({ aal: "aal1" })}` }))).toBe(false);
    expect(hasTwoStepVerification(request({}))).toBe(false);
    expect(hasTwoStepVerification(request({ authorization: "Bearer not-a-token" }))).toBe(false);
  });
});

import { csvText } from "../domain/assessment";
describe("CSV export safety", () => {
  it("neutralises formulas, including after leading spaces, but keeps numbers numeric", () => {
    const text = csvText([["=HYPERLINK(\"x\")", "  +cmd", "@SUM(A1)", -3, 4.5, "plain"]]);
    expect(text).toContain(`"'=HYPERLINK(""x"")"`);
    expect(text).toContain(`"'  +cmd"`);
    expect(text).toContain(`"'@SUM(A1)"`);
    expect(text).toContain(",-3,4.5,");
    expect(text).toContain(`"plain"`);
  });
});
