# Deployment runbook

## v1.0 mini-game draft

Do not replace main/production until reviewed. Test the `redesign/minigames-v1` branch as a Vercel preview using the existing Vite project/build settings and committed npm lockfile. No Vercel deployment was made during this revision.

Apply migrations **001 initial → reward collections → learning reviews → 202610070001 minigame evidence** in an approved staging project. The fourth widens reward/core-score constraints and adds derived objective/mistake/star JSON; it does not publish v4 or change learner-response immutability/teacher-observation permissions. Keep old content records and attempt versions available.

Deploy all five updated functions together, with `supabase/functions/import_map.json` and their referenced `src/content`, `src/domain` and `src/games` modules. Their configured import map resolves old extensionless content imports and pins Zod to the browser lockfile version. The verified `@supabase/server` dependency is pinned to 1.9.1. Auth identity uses `userClaims.id` (not the obsolete `userClaims.sub`); course embeds are normalized for object/array shapes. Both were checked locally with the Deno runtime. No privileged key belongs in a `VITE_` variable.

After clinical/image approval, register an immutable **published** `ptd-minigame-draft-2026-10-07` bundle in `content_versions` through trusted institutional administration, or create a new approved content ID with matching registry/server rules. Do not edit the question/scoring payload under an already-used ID. Configure the existing `.env.example` variables, approved Auth/redirect URLs, courses, cohorts, memberships, faculty assignments and privacy/support policy. A project URL/ID alone does not complete this setup.

Staging acceptance: real learner sign-in → own attempt → raw response sync → server recomputation → confirmed receipt, including reconnect/empty-queue recovery; assigned faculty versus another cohort; roster not-started denominators; private review saving/history; CSV exports; matching-version tied podium ranks. Local rule and type checks do not establish live RLS/function success. No live credentials, approvals, service deployment or database execution were available/claimed here.

The teacher CSVs import into Excel or Google Sheets (File → Import → Upload). A scheduled direct Sheets integration is not enabled; do not publish identifiable learner notes to a public spreadsheet. Initial PWA caching includes supplied PDFs/images, around 41 MB; test installation, airplane mode, storage eviction and update recovery on actual devices before cohort delivery.

## v0.9 learning evidence and staff review

Apply the third migration after the two existing migrations in a reviewed staging project. Deploy all five functions with shared domain files `types.ts`, `engine.ts`, `learningRules.ts`, `authorization.ts`, `serverRules.ts`, `rewardRules.ts`. `faculty-workspace` protects summary/evidence/review operations by assigned cohort; `completion-status` checks authenticated attempt ownership. No production service was changed here.

Register the clinically reviewed immutable v3 bundle only after educator approval. Maintain v1/v2 content for saved attempts. The browser and server share progress evaluation for v3; published version IDs must match the supported registry/rules. A trigger retains the first confirmed completion timestamp. Teaching observations are a separate staff-only append-only table; never use the old learner-visible legacy teacher-review table for private notes.

Verify in staging: learner own-access, two distinct faculty cohorts, administrator scope, rejected altered event IDs, interruption/receipt recovery, auth expiry/sign-out, roster denominators, teacher history and spreadsheet escaping. Confirm no private observations appear in learner queries or class-facing printouts. SQL policies and hosted endpoints require live integration testing; pure rules/mocked transport tests do not replace it.

## v0.8 migration and version boundary

Apply both migrations in order in a separate reviewed staging project. The second adds reward/report columns and backfills only legacy totals; it does not publish content or enroll anyone. Deploy all three updated authenticated functions together. Ensure deployment includes `src/domain/serverRules.ts` and its dependency `rewardRules.ts`; neither imports React or privileged credentials. Re-sync existing attempts to populate detailed achievement fields.

Both original and revised content IDs are supported by the validation/recomputation endpoint. Publish a reviewed new immutable content bundle through the existing governance workflow; leave saved original bundles available for resume. The v2 ID in this source remains draft. Do not rename/alter its questions under an existing attempt; future approved editorial changes need a new ID and registered rule keys.

Configure `VITE_APP_MODE=connected`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_COURSE_ID`; keep service secrets server-side. Required institutional state: invitation-only or approved SSO Auth and redirect URLs; course/cohort/membership records; assigned faculty/admin roles; reviewed published content; preparation deadline and class location/link; support contact; privacy/retention policy and cohort reward-visibility approval.

No Supabase credentials/service configuration were supplied for this local release. Migrations, RLS and deployed endpoint integration have not been exercised against a live database. No production database, deployment, invitation or email was modified. Faculty download is the Excel-compatible delivery path; automatic email remains unconfigured.

Production PWA offline checks must run after the service worker finishes caching and controls the page. A file-presence/byte check replaces the former estimated-ready counter. First download still needs a connection; storage eviction and actual iOS/Android installation need real-device testing.

## Environments

Keep development, staging and production Supabase projects separate. Apply migrations in staging first, back up the database, verify RLS with real role accounts, then apply the identical reviewed migration to production. Never reuse a secret key in a browser variable.

## Web deployment

Build with `npm run build` and serve `dist/` over HTTPS. Preserve `/` as the manifest `start_url` and scope. Serve `sw.js` without long immutable caching; hashed JavaScript and CSS may use long immutable caching. Route unknown application paths to `index.html`. Confirm the manifest and service worker remain under the same public scope.

## Supabase

Apply `supabase/migrations/202610010001_initial.sql`; deploy `sync-events`; configure the approved identity provider and exact redirect origins; then create courses, cohorts, memberships, role assignments and an approved content version through institution-controlled administration. The initial administrator is bootstrapped once through a trusted SQL session and audited.

## Backup rollback and monitoring

Use provider backups plus a tested restore into staging. Roll back clinical content by retiring the affected version and selecting a prior approved immutable version for new attempts. Keep active attempts pinned; withdrawal blocks new connected attempts and is reconciled on reconnect. Monitor authentication errors, rejected/partial sync, event backlog, content-version conflicts, access failures and issue reports. Avoid patient or rationale text in third-party analytics.

## Support

Test stale content, server failure, expired login, interrupted download, account switch and cleared storage. Maintain a paper/text fallback. Remote revocation cannot instantly erase an offline device; communicate that limitation and avoid patient information.
