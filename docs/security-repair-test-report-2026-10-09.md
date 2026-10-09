# Security repairs and release verification — 9 October 2026

## Outcome

The reviewed repairs are deployed to https://pelvic-fx-game-aoe5.vercel.app/ and https://pelvic-fx-game.vercel.app/. Vercel deployment `dpl_CW4utT1CKjrE9nF2LqbWoZLcURSc` is READY. Ten backend functions were deployed, followed by the additional `sync-events` replay repair. Migration `202610090001_learner_write_limits` is applied. Existing learner answers, teacher permissions, content versions and rewards were preserved. No invitations or new learner identities were created during this repair verification.

## Repairs

- Bound authenticated writes: 10 new attempts per user/course per rolling day, 20 attempts per user/course/content version, and 1,000 events per attempt. Database advisory locks serialize quota checks. Existing attempt retries remain idempotent. Start/sync request throttles add protection; these are not a guarantee against distributed abuse or multiple self-registered identities.
- Paginate complete event histories rather than relying on provider default row limits.
- Skip unchanged summary writes on replay so repeating accepted events does not inflate rewards or repeatedly queue full exports.
- Guard delayed account initialization and synchronization across account changes; discard responses when the authenticated account changes. Preserve local unsent work.
- Reject null/malformed request bodies safely instead of producing internal errors.
- Correct immutable event comparisons for JSONB key reordering and server-owned receipt metadata. Recovered, unchanged events are acknowledged; altered authored payloads remain rejected. No historic event payloads were rewritten.
- Add verified live anti-framing, MIME-sniffing, referrer and restricted-device-permission headers. HTTPS/HSTS remain enabled.
- Correct teacher reporting text: automatic Sheets delivery and date-filtered CSV export are separate services.

## Verification

| Check | Result |
| --- | --- |
| Browser/domain/component suite | 229 tests across 23 files passed |
| TypeScript and production/PWA build | Passed locally and on Vercel |
| Backend fixtures | 8 passed: Sheets retry/idempotency, safe readback, history pagination and canonical event identity |
| Changed backend type checking | Passed; final sync repair checked again |
| Published dependency advisory audit | 0 reported vulnerabilities at check time; not proof of absence |
| Database quota/privilege integration | Passed in rolled-back QA transaction; daily/cumulative limits, sequence boundary and protected mutation/RPC checks |
| Live learner entry/resume | Existing fictional QA profile and two accepted original events returned |
| Learner access to faculty/reporting | Both protected interfaces returned 403 |
| Learner access to Sheets worker | 401 |
| Other account completion receipt | 403 |
| Missing authentication | 401 |
| Conflicting email/student ID | 409, no session issued |
| Null requests to eight authenticated interfaces | 400, no internal error |
| Recovered event replay | Both existing events acknowledged; no retries/rejections |
| Altered existing event | Rejected; original evidence preserved |
| Replay persistence | Still two QA events, reward 10, original last-event timestamp unchanged |
| Teacher assignment | Existing faculty role remains bound to the assigned cohort |
| Established student URL | HTTP 200, new deployment and security headers verified |
| Whitespace/diff check | Passed |

The first live replay check failed, exposing the ordering/receipt bug; this report records the successful result only after implementing and redeploying the repair. The quota fixture initially combined two limits incorrectly; separate rolled-back subtransactions now test each limit independently.

## Google Sheets

Protected worker readback returned HTTP 200 and `ok: true`. All eight application-managed tabs are present, with zero duplicate IDs and zero formula errors. Rows: Learner Results 3; Decision Evidence 74; Handovers 9; Teacher Reviews 1; Objective Analysis 21; Demo Examples 6; Sync Status & Guide 8. The original non-managed tab was preserved by the existing integration. Demo rewards remain 0, 40, 0, 250, 220 and 240 and are excluded from real totals. QA records remain labelled and incomplete; no completion was fabricated.

Latest observed export queue: revision 18, delivered revision 18, no last error. Last success `2026-10-08 19:01:08.249 UTC` = `2026-10-09 02:01:08.249 Asia/Bangkok`. Repeated verification reused existing rows. Normal subsequent activity may advance these revisions.

## Security scope and remaining actions

The sealed pre-repair Codex Security scan identified one medium resource-consumption issue and one low account-partition race. Both have scoped repairs and the verification above. Scan coverage was partial: backend boundaries and selected critical frontend flows, not exhaustive frontend/dependency internals, historical Git secrets, Google sharing or personal account settings. The sealed report is retained unchanged in the Codex Security scan archive (`1c40cf6d-34c6-4198-946d-ce44441de273`). These are repair results, not a replacement scan or a claim that the application is vulnerability-free.

- Email + student ID remains intentionally self-reported learner identity: anyone who knows both can resume that learner record. It must not be used for high-stakes assessment or as verified identity. It does not issue teacher sessions.
- Enable two-step verification on your institutional email, Google, GitHub, Supabase and Vercel accounts where available. Their current personal MFA settings were not inspected or changed.
- Keep the workbook private to authorized educators and the dedicated service account; do not use public link sharing. Google sharing permissions were not independently inspected.
- Sign out on shared devices; local offline evidence is retained by design and is not protection against someone controlling the same browser profile.
- Full Mac Safari and physical iPhone re-testing remains outstanding; automated account/menu/joystick tests do not substitute for hardware checks.
- No secret values were printed. Historical secret scanning/rotation and external provider account security were not performed. Existing server secrets remain server-held.
- Database/endpoint limits reduce individual abuse. Open registration, provider quotas and finite workbook capacity still require operational monitoring for a large cohort.

Workbench-reported scan usage: input 6,050,652 tokens (cached input 5,580,288), output 18,757, total 6,069,409. This is the completion tool's reported measurement, not an independently measured incremental token estimate.
