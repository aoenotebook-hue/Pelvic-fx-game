# Connected backend deployment — 2026-10-08 (Asia/Bangkok)

Target: Supabase `wdedeqaqjyyudhjivnva`; Vercel `aoe5/pelvic-fx-game`, project `prj_azTIkMQZ2VZWGxh6a9GZmztvZFl6`. Source baseline `ac9cf923d15b4bc71cdd4b475ddb7991bc00663b` plus explicit shared-module import fixes, registration tooling and deployment exclusions. This release used the local checkout, not a merged GitHub main commit.

## Completed

- CLI management authentication verified; function inventory was initially empty.
- Deployed start-attempt, sync-events, cohort-leaderboard, faculty-workspace and completion-status. Inventory confirms all ACTIVE, version 2, JWT verification true and import maps enabled. Explicit TypeScript extensions remove initial asset-discovery warnings without changing question/scoring payloads.
- Registered four immutable source bundles following the educator's reported review/release request. Prior versions remain draft; latest `ptd-minigame-draft-2026-10-07` is published and selected for the existing course. Registration checks the confirmed assigned educator and rejects differing existing bundles. This is not independent clinical/image-licensing approval; authored draft notices remain intact.
- Configured four public production browser variables: mode, Supabase URL/publishable key and course UUID. No privileged browser key.
- 179 tests across 14 files pass; TypeScript and Vite/PWA build pass after import fixes.
- Connected Vercel build READY: `dpl_6jSMHeHTQXkPU7QDH672uSE146Z1`, https://pelvic-fx-game-jg3bxfghm-aoe5.vercel.app. Deployed with --prod --skip-domain; CLI nevertheless reported the generated team alias https://pelvic-fx-game-aoe5.vercel.app. Do not describe all aliases as unchanged. No explicit promotion or GitHub main merge performed.
- Safari renders the team alias in CONNECTED mode with EN/Thai toggle and institutional sign-in.
- Live HTTP checks of all five services: browser preflight 204 and unauthenticated POST 401. No learner records written by these checks.

## Remaining live verification

Full-shift completion, official completion-receipt recovery, offline reconnect, cross-cohort denial and physical-device installation remain unverified. The authenticated checks below establish only their stated boundaries.

QA-INSTRUCTOR enrollment was explicitly approved and completed. Proposed exact extra Auth return URLs still await approval; existing URLs remain unchanged and include the team alias.

Student roster, approved mail/SSO, privacy/retention settings, clinical/image approval and physical-device PWA checks remain institutional requirements. No automatic Google Sheets delivery enabled.

## Authenticated test follow-up

- Educator explicitly approved QA enrollment. Created and verified membership `QA-INSTRUCTOR` for the existing confirmed instructor account in the initial cohort; no new invitation or elevated role.
- In-app browser still displayed the institutional sign-in form, not an authenticated teacher workspace. The visible sign-in action returned a generic failure. Console also reported multiple GoTrueClient instances; this is a warning, not an established cause of the failure.
- One diagnostic sign-in request using the same public configuration and existing account was accepted by Supabase (`requestAccepted: true`). This confirms request acceptance, not email delivery or authenticated access. Human must open the individual email sign-in link in the browser used for testing. No code, session token or password was collected.
- The email link subsequently opened an authenticated session in Safari; the in-app browser remained anonymous. No credential/session token was extracted.

## Signed-in QA evidence

- Safari displayed connected mode and authorized faculty tools for the confirmed educator. A live QA attempt `7a529380-d6d2-44bc-bf3b-2efc30dfef65` was created. Because the client initially starts all attempts as initial, this specifically approved QA attempt was classified as practice with an audit entry; immutable responses were not changed.
- C0S1 was deliberately answered incompletely (`["ilium"]`), first feedback acknowledged, all six landmarks corrected, and corrective explanation explicitly acknowledged. Database confirmation: four events in sequence (`core_response`, `feedback_ack`, `correction_response`, `correction_feedback_ack`); one answered station, zero first-correct, one corrected, reward 8, incomplete.
- Browser reward matched the server's 8 and survived reload; UI showed Saved and checked. Teacher individual evidence displayed the original answer and reviewed correction. Practice evidence is excluded from official class-priority totals and podium; roster accordingly reports no official received responses. Its wording could distinguish practice-only evidence more clearly.
- Saved one staff-only observation scoped to mission-0. All rubric dimensions remain not_observed; every free-text field is labelled QA TEST ONLY and explicitly disclaims clinical discussion/competence assessment. Server confirmed one review with the correct content version and scope; UI showed Teacher review confirmed.
- Teacher reviews CSV downloaded to `../qa-teacher-reviews-2026-10-08.csv`. Header and QA row match reviewer, UTC timestamp, attempt, version, scope, quoted rubric and the three authored QA fields. This establishes a real Excel-compatible review export, not automated Google Sheets delivery or a full learner-evidence export.

## Submission-warning fix and recheck

Before any response creates an attempt, the app can show “Submission did not finish. Your work remains saved on this device.” The empty-queue branch in `src/App.tsx` calls recoverCompletion unconditionally; completion-status returns 403 when no owned server attempt exists. The message was observed before answering and cleared after real responses synchronized. This is a misleading new-user recovery state, not evidence of lost work.

Fixed after explicit user approval: `recoverKnownCompletion` only requests recovery when the current attempt has a locally persisted server acknowledgment. New attempts get a neutral no-pending-events message. Known attempts still recover completion with an empty queue; denial and transport errors are not converted to success. Empty-queue UI updates are guarded against an intervening account/attempt switch.

- Four regression tests cover new/unacknowledged/other-attempt records, known completed receipt recovery, known incomplete attempts, and propagated recovery errors. All **183 tests / 15 files** and TypeScript + production PWA build pass.
- Deployed from this local checkout: `dpl_Hx1BfsGmVEGdHNKZLRZFGKunF92U`, https://pelvic-fx-game-4gtn30apk-aoe5.vercel.app, READY. CLI again reported team alias https://pelvic-fx-game-aoe5.vercel.app despite --skip-domain. No explicit promotion, GitHub main merge, Auth URL expansion or database migration was performed for this fix.
- Activated the service-worker update in both test browsers. New local-attempt/sign-in screen changed from the false submission failure to “No pending events. Start a quest when you are ready.” This browser remained unauthenticated; the signed-in new-account case is covered by regression logic, not a newly created account.
- Signed-in Safari practice: C0S2 memory matching submitted and feedback reviewed; server now confirms six immutable events, two answered stations, one first-correct, one corrected, 18 reward, incomplete and practice-only. Reload/update preserved the two stations and 18 reward. Empty-queue check succeeded without reward changes.
- Faculty workspace reloaded with C0S1 corrected, C0S2 first_correct, and the original QA observation history. Official totals still exclude practice responses.
- Safari offline pack verification reported “Offline files verified” and ready. This checks cached resources; it is not a network-disconnection/reconnection submission test.

The user explicitly chose to keep QA practice-only and test official completion-receipt logic locally. No reporting QA attempt was created. Receipt transport/recovery passes local mocked tests; no live official receipt is claimed. Full-shift completion, actual offline reconnection and cross-cohort rejection remain live acceptance checks before unrestricted student delivery.
