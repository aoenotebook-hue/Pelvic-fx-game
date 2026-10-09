# Submission authentication repair — 2026-10-08

## Evidence and scope

Authenticated Safari displayed the approved learner journey, but `start-attempt` returned HTTP 401. Its response-only diagnostics (no credentials inspected) identify `@supabase/server` code `UNUSABLE_CREDENTIAL`: authorization absent, only a publishable API key received. This is not evidence of invalid clinical content, a missing faculty grant, or a reason to disable server authentication. Multiple Auth clients were also reported at runtime. Three modules independently constructed clients under the same session-storage key; competing initialization/magic-link recovery is a plausible cause of missing session state.

The repair shares one client per project/key configuration across learner, faculty and leaderboard adapters. Every protected function call retrieves the current session and explicitly sends its user token to the configured Supabase project. Missing or erroneous sessions fail locally without sending public-key-only requests. Tokens are handled only inside application transport code, never logged or exported. No new dependency, clinical content, database migration or role grant was introduced. The five server handlers retain `auth: "user"`, JWT verification and their existing ownership/cohort permission checks.

## Automated verification

- 201 tests pass across 18 files; TypeScript and production PWA build pass.
- Four new regression tests verify shared Auth initialization, current/refreshed user tokens on all five protected endpoints, no protected invocation without a session, and no submission when session recovery errors.
- Existing queue ordering, partial acceptance, completion recovery, immutable responses, authorization, date filtering and reward tests still pass.
- Whitespace validation passes.

## Deployment and live checks

- Vercel project verified: `aoe5/pelvic-fx-game`, `prj_azTIkMQZ2VZWGxh6a9GZmztvZFl6`.
- Production deployment `dpl_FRME5LKHLPfgNmkJQEmSTmqjvFHn` is READY. The existing student alias `https://pelvic-fx-game-aoe5.vercel.app/` was assigned to that exact release. Fresh public HTML loads `index-DmN_v2W6.js`.
- Source is the local checkout plus the repair; no GitHub push or main merge is claimed.
- Anonymous faculty-workspace request still returns 401. No backend authentication or permission setting was changed.
- Safari's cached app update was explicitly applied. A usable persisted session is not present after refresh, so a new existing-account sign-in is needed before live QA submission can be retried. The two saved M1N1 QA events were not cleared. Do not equate a successful build with authenticated acceptance, completion receipt or teacher export success.
- The existing-account sign-in request was accepted by the UI ("Check your institutional email"); no invitation or new account was created. The educator must open the latest link on the Mac to resume live verification.
- The isolated in-app browser also applied the app update. DOM inspection confirms its active script is `index-DmN_v2W6.js`. Task-only screenshot: `auth-repair-public-entry-2026-10-08.png`. A whole-Safari screenshot was blocked to avoid capturing unrelated private tabs; no alternate whole-window capture was attempted.
- A bounded Vercel error-log query returned no log entries. This static frontend query does not establish a clean Supabase runtime or authenticated success.
- Full receipt, teacher export and physical-device acceptance remain outstanding until the repaired session is exercised. No completion was fabricated.

Reference: [Supabase server error handling](https://github.com/supabase/server/blob/main/docs/error-handling.md#unusable_credential). The observed response differentiates an absent user credential from a failed JWT check.
