# Learner access, joystick and Sheets reporting — 8 October 2026

## Delivered

Connected learner email/Student-ID registration without email delivery; dedicated learner-only Auth identities; own-profile/attempt interfaces; accepted-event resume; preserved local outbox and visible rejection records; account actions and header Student ID; practice attempt metadata/reset; analogue joystick plus keyboard controls; managed Sheets reporting, six evaluated fictional examples, durable queue, one-minute scheduler and staff-only status/queue interface.

The approved content version and reward rules were not revised. Existing attempts keep their original content. No real student account, invitation, free-text grade or clinical diagnosis was fabricated. Existing dirty repository work was preserved. Deployment used this local checkout; no new GitHub commit or push is claimed.

## Automated checks

- `npm run check`: **227 passing tests in 23 files**, TypeScript and production build passed. This retains all 15 paths, correction review/handovers, interrupted resume, 250/220 totals, outfit thresholds, duplicate achievements and tied ranks. Added identity validation, staff-role exclusion, practice metadata/parent registration, menu actions/outside click/Escape, joystick dead zone/speed/cancellation and report rows.
- Deno check passed for all seven changed/new server functions with the committed import map/lockfile.
- Three Deno workbook fixtures passed: stable IDs/repeated delivery with RAW values, failed-write recovery without duplicates, and refusal to overwrite an existing unowned tab. These use mocked Google responses, not the real workbook.
- Live transactional database assertions passed and rolled back: request limits, exclusive leases, preservation of a new queue revision during delivery, and no authenticated policies exposing the private queue/limit tables.
- `scripts/verify-learner-entry.ts` passed against deployed services using the fictional `QA-ENTRY-1008`: own profile and two accepted events retrieved; faculty-workspace and sheets-status rejected learner access with 403; conflicting email/ID rejected with 409 and no session; unauthenticated evidence rejected with 401. No session credentials were printed.
- `docs/demo-examples.csv` was generated using the shared application evaluation. All-first-correct = 250; all-corrected = 220. Examples exist separately from real cohort evidence.
- After the final teacher-link changes, all 22 targeted faculty/account/reporting tests passed and the production build passed again. Final worker changes also passed Deno checking and the three workbook fixtures.

## Browser/database evidence

The student URL accepted a fictional learner using only email/ID. The header displayed `QA-ENTRY-1008`. A first-correct decision plus explicit feedback review produced two accepted database events and 10 rewards on reporting attempt `c5015f83-5694-4c9c-bbfe-6e2782311b36`. Its existing answers were unchanged by reset.

Reset showed a confirmation and returned to zero rewards/first outfit/first patient. The final reset registered server practice attempt `7c531faf-32c8-4e2e-a786-fab7df8c9eba`, linked to the original reporting attempt; a subsequent database query confirmed the original still had its two accepted events and 10 rewards. A separate origin with independent browser storage signed into the same pair and retrieved the original accepted answer and 10 rewards. Opening the teacher route as this learner displayed “Assigned faculty authorization is required”; protected API denial was also independently verified. Final production sign-out returned to Enter game and returning entry restored the same learner ID.

Phone-sized English/Thai layouts were inspected. The joystick remained clear of the case button and patient artwork. A drag moved the character from its initial position to approximately x52.12/y75.08 and release stopped input. The corrected header prevented the overlap discovered at a narrow desktop window. Independent 1280px and 768px layouts had scrollWidth = clientWidth. Temporary viewport overrides were reset. Spreadsheet teacher links select the linked attempt's original content version and do not silently open another learner when an attempt is unavailable.

Mac Safari verification was interrupted by browser activity before it could complete. Real iPhone touch, installed-PWA offline behavior and native Safari full flow remain unverified in this release. Browser size checks and synthetic pointer cancellation tests do not substitute for those hardware checks. A newly authenticated positive faculty/teacher-Sheets workflow has not been completed live; teacher authorization logic/UI tests passed and live learner-denial checks passed.

## Deployment

Vercel production deployment **READY**: `dpl_H5VNZ4x1XEByQdha6fTcipqEKp2T`, build URL `https://pelvic-fx-game-a7xt2m9r8-aoe5.vercel.app`. Both `https://pelvic-fx-game.vercel.app` and the established student URL `https://pelvic-fx-game-aoe5.vercel.app` point to it. Remote frontend build passed (Vite transformation 1.18 seconds). The preceding release's recent error-log lookup returned no logs; this is not proof of complete runtime observability for a static frontend.

Two additive Supabase migrations applied successfully and were recorded: `202610080005` and `202610080006`. Seven backend functions deployed successfully; the final Sheets worker includes readable answers, filtered discussion priorities and existing invited-account email backfill. The cron job was active with schedule every minute. A status query before the final practice registration found queue revision 10, delivered revision 0 and no last-success timestamp. The public student HTML was checked after alias update and served the completed `index-DAt6WvUX.js` bundle.

## Exact remaining blocker

No Google service-account email/private key or Sheets worker secret was configured in Supabase at inspection. Vault worker URL/secret setup is also required. Until configured, the scheduler is safely inert. **No rows or demo examples were written to the real Google Sheet, and live Google readback, matching totals and repeated-sync verification have not succeeded.** The queue retains accepted work. Workbook formulas and styling require live readback/visual validation after service access is configured.

Follow [Google configuration instructions](learner-entry-sheets-setup.md). Existing Safari access is not a persistent server credential; the connected Drive account previously returned permission denied. Do not post service-account keys in chat. A service account needs Editor access only to the existing target workbook.
