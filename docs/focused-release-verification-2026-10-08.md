# Focused edition deployment and verification — 2026-10-08

## Approved release update

### Subsequent access and QA authorization

#### Signed-in Mac verification: submission blocked

Subsequent repair and redeployment are documented in [submission authentication repair](submission-auth-repair-2026-10-08.md). Server authentication and permissions were not disabled. Live acceptance is pending renewed Mac sign-in.

The educator confirmed Mac and iPhone sign-in. The returned Safari game tab now visibly renders the approved 15-decision learner home, so the earlier sign-in visibility limitation is resolved on the Mac. Using the authorized QA workflow, M1N1 was answered correctly and its explanation explicitly acknowledged. The UI awards 10 local reward and retains two pending events. Safari's console records HTTP 401 from `start-attempt`; manual synchronization reports that submission did not finish. Read-only database inspection confirms no new-edition attempt or events were received. Verification stopped at this first broken client-to-service boundary: no further decisions, completion receipt, teacher export or full-shift success is claimed.

The existing older QA reporting attempt remains unchanged with six received events. New QA work remains on the Mac; do not clear browser storage or sign out before recovery. A separate console warning shows three Supabase Auth client instances created by the learner, faculty and podium modules; this is a maintainability risk, not a proven cause of the 401. Authentication diagnosis must inspect a credential-safe error response and distinguish gateway JWT validation from handler verification; do not blindly disable authentication. Official Supabase auth and error-code guidance was checked. No auth settings were changed during this check. Screenshot: `authenticated-sync-block-2026-10-08.png`. iPhone behavior was educator-reported, not directly device-tested.

The educator explicitly approved public student entry and reversed the QA practice-only restriction. The first project-wide protection change was rejected by the safety review because its effect on the student alias was unresolved; it did not execute. Read-only inspection confirmed that `pelvic-fx-game-aoe5.vercel.app` is an owned alias of the READY release, whereas the registered production domain is `pelvic-fx-game.vercel.app`. A safer, exact-alias protection override was then accepted for the student-facing alias only. Project-wide Vercel protection remains unchanged (`all_except_custom_domains`); no credentials or sharing links were distributed.

- Fresh unauthenticated HTTP now returns the actual release HTML and PWA manifest at the student alias; the generated release URL still redirects to Vercel authentication (302).
- Supabase faculty-workspace still rejects anonymous requests (401). Visiting `#teacher` without a game session leaves institutional sign-in visible, with no staff evidence exposed.
- The exact existing QA-INSTRUCTOR attempt `7a529380-d6d2-44bc-bf3b-2efc30dfef65` was changed from practice to initial/reporting in an audited transaction. Its original edition, six immutable events, two answered stations and incomplete status are unchanged. This reporting QA evidence can contribute to reports and, once eligible, rankings; it must not be mistaken for student evidence. New-edition initial QA attempts may now be used for reporting verification.
- No completion was fabricated and no receipt is claimed. The live browser needs educator sign-in before the remaining authenticated checks can continue. Screenshot: `public-student-entry-2026-10-08.png`.

The access and practice-only statements below are historical and superseded by this subsection.

Sorawut Thamyongkit explicitly approved the revised 15-decision English/Thai edition and supplied images for student use and publication on 2026-10-08. This supersedes the historical publication block below; it is an educator decision, not an independent clinical validation by the agent.

- The approved content-registration transaction completed. The existing course now selects published `ptd-minigame-focused-2026-10-08`, with 15 decisions and approval metadata. Older immutable bundles remain available.
- All five authenticated Supabase functions were redeployed: inventory confirms ACTIVE, version 4, JWT verification enabled.
- Vercel production deployment `dpl_AC2xCyNPgJGTvzzjJRDZx5rpcngn` is READY and assigned to `https://pelvic-fx-game-aoe5.vercel.app/`. Build succeeded. The first upload failed; the archive-upload retry succeeded.
- All 197 tests in 18 files and the TypeScript/PWA build pass. Release source is the local checkout, not a claimed GitHub push or merge.
- Authenticated Vercel HTTP access confirms the released asset `index-ajLWynzq.js`. Live browser update changed the displayed decision count from 44 to 15; English/Thai navigation toggles correctly. Screenshot: `approved-release-live-2026-10-08.png`.
- Fresh unauthenticated HTTP requests encounter Vercel Authentication. Existing browser access/cache is not proof that newly enrolled students can access the site. Protection settings were not changed. Student access requires an explicit decision about the production-domain gate; retain the app's individual Supabase authentication.
- Safari and the in-app browser currently show institutional sign-in. New-edition authenticated learner upload, teacher date-filter/export and receipt recovery were therefore NOT verified live in this release. QA remains practice-only; no official reporting QA attempt was created.
- Real-device installation/offline behavior, native Excel/Google Sheets import and print-preview acceptance remain outstanding. Automatic Google Sheets delivery is not configured.

Next checks: approve the narrowly scoped production-domain access change if students should not need Vercel accounts, then sign in to the game for authenticated verification. Do not create reporting QA evidence to test receipts; use the local receipt tests.

## Historical deployment attempt (before educator approval)

User requested deployment and verification of the locally completed focused edition.

## Target and source

- Verified Vercel owner/project: Aoe (`aoe5`), `pelvic-fx-game`, `prj_azTIkMQZ2VZWGxh6a9GZmztvZFl6`.
- Verified Supabase project: `wdedeqaqjyyudhjivnva`; existing course `2d82ff1d-efd9-42f1-9eb9-0c790301514b`.
- Source: local checkout on `ac9cf923d15b4bc71cdd4b475ddb7991bc00663b` plus uncommitted focused-edition and prior deployment fixes. No GitHub push or main merge claimed.
- Required four public browser settings remain present in Vercel Production. No broad environment download, credential extraction or change was performed.

## Completed

- Re-ran all 197 tests across 18 files: pass. TypeScript, Vite/PWA build and whitespace validation pass.
- Deployed the five existing authenticated Supabase functions: start-attempt, sync-events, cohort-leaderboard, faculty-workspace and completion-status. Inventory confirms all ACTIVE, version 3, JWT verification true. New shared scoring/content rules are deployed while older editions remain supported.
- Confirmed the existing four migrations are recorded. No new migration or learner-record write was executed.
- Live checks of all five functions: browser preflight returns 204; unauthenticated POST returns 401. These checks do not establish authenticated completion or teacher-export success.
- Prepared a local content-registration transaction at `/private/tmp/pelvic-focused-release-20261008.sql`. It checks assigned, confirmed faculty identity and unchanged immutable bundles. Audit wording now distinguishes requested release authorization from independent clinical/image approval.

## Publication blocked — not bypassed

The execution approval check rejected the production content-registration transaction: this specific 15-decision edition remains a clinical draft and explicit approval for student publication has not been established. The transaction did not run. No indirect retry or alternate publication route was used.

The frontend deployment was not executed. Deploying it alone would expose a latest edition that the course service cannot start. The live frontend therefore remains the previous release, and the course remains on `ptd-minigame-draft-2026-10-07`.

Required next authorization: the educator explicitly approves `ptd-minigame-focused-2026-10-08`, including its English/Thai questions, explanations and supplied figures, for student use and publication in this existing course. This must be an actual educator decision, not an inferred clinical review by the agent.

After approval, execute the reviewed transaction, release the matching connected frontend, and verify authenticated persistence, teacher date filters and exports. Keep QA practice-only; do not create official reporting QA evidence. Physical-device installation and native Excel/Google Sheets import remain separate acceptance checks.

This is a partial backend deployment, not a successful full-game release or completed authenticated end-to-end verification.
