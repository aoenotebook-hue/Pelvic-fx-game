// Shared HTTP safety for every Edge Function: an origin allow-list for CORS and the
// teacher two-step-verification (MFA) check. Kept free of Supabase imports so it is easy to test.

/** Comma-separated list, e.g. "https://pelvic-fx-game.vercel.app". Set with `supabase secrets set ALLOWED_ORIGINS=...`. */
// Both production domains of the Vercel project.
const DEFAULT_ORIGINS = ["https://pelvic-fx-game.vercel.app", "https://pelvic-fx-game-aoe5.vercel.app"];
function allowedOrigins(): string[] {
  // deno-lint-ignore no-explicit-any
  const raw = (globalThis as any).Deno?.env?.get?.("ALLOWED_ORIGINS") as string | undefined;
  return raw ? raw.split(",").map((value) => value.trim()).filter(Boolean) : DEFAULT_ORIGINS;
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  // Only listed origins are echoed back; anything else gets no CORS permission at all (never "*").
  if (!allowedOrigins().includes(origin)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

// deno-lint-ignore no-explicit-any
type Handler = (request: Request, ...rest: any[]) => Response | Promise<Response>;

/** Answers CORS preflight before authentication and adds CORS headers to every response. */
export function withCors<H extends Handler>(handler: H): H {
  // deno-lint-ignore no-explicit-any
  return (async (request: Request, ...rest: any[]) => {
    const headers = corsHeaders(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const response = await handler(request, ...rest);
    const merged = new Headers(response.headers);
    for (const [key, value] of Object.entries(headers)) merged.set(key, value);
    merged.set("Cache-Control", "no-store");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: merged });
  }) as H;
}

/**
 * Authenticator assurance level from the caller's access token. The gateway has already verified
 * the token's signature (verify_jwt = true); here we only read its "aal" claim.
 */
export function assuranceLevel(request: Request): string | null {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "="));
    const claims = JSON.parse(json) as { aal?: unknown };
    return typeof claims.aal === "string" ? claims.aal : null;
  } catch {
    return null;
  }
}

/** Teachers see identifiable learner data, so their session must have passed two-step verification. */
export function hasTwoStepVerification(request: Request): boolean {
  return assuranceLevel(request) === "aal2";
}
