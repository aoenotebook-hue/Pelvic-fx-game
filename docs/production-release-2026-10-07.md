# Full release preparation — 2026-10-07

The educator reported review and requested GitHub push, production release (not demo), and faster/smoother character movement.

## Prepared changes

- Room walking uses accelerated/decelerated pixel-space velocity, normalized diagonals, direction-facing, depth scaling and subtle two-step body/shadow animation. Short keyboard/touch taps move without position jumps. Blur, hidden tabs, pointer cancellation and case entry stop input; room bounds remain enforced. Reduced-motion users do not receive gait animation.
- Memoized learning/reward calculations avoid repeating them on every movement frame.
- Production builds refuse demo mode, missing public app settings, invalid course UUIDs and privileged browser keys. Local demonstration remains available for development and legacy tests.
- Email sign-in requests existing accounts only (`shouldCreateUser: false`). It does not enroll students or grant faculty roles.

## Verified destination and current blocker

- GitHub: `aoenotebook-hue/Pelvic-fx-game`, original production branch `main` at `5e63238` during inspection.
- Vercel: team **Aoe / aoe5**, project **pelvic-fx-game**, ID `prj_azTIkMQZ2VZWGxh6a9GZmztvZFl6`. Existing deployment inspected as READY; no new production release claimed.
- Supabase: `wdedeqaqjyyudhjivnva`; the Vercel integration contains public Supabase settings but none of the four required `VITE_` app settings.
- Public read-only check: `/auth/v1/settings` returns 200 with email enabled; automatic signup is enabled at the service, while this app explicitly refuses automatic account creation.
- Public schema check: `/rest/v1/courses` returns 404 / `PGRST205`: `public.courses` is absent from the schema cache. Backend initialization must therefore be completed before the full cohort release.
- Broad production-environment download was rejected by the safety review because it could retrieve database/JWT/service secrets. It was not executed. A narrower permission request for the project's database connection/server-side service key was presented to the educator. No restriction was bypassed.
- Linking the verified existing Vercel project succeeded. Its generated local configuration is ignored by Git. No secret is intentionally printed, committed or placed in browser variables.

## Remaining release requirements

1. Confirm scoped backend access, inspect existing database state and apply only the required reviewed migrations (all four are supplied in `supabase/migrations`). Do not erase existing data.
2. Deploy all five authenticated Edge Functions and their shared imports.
3. Register the actual course/cohort and reviewed content, with the real educator's Auth identity as reviewer. Do not fabricate a reviewer, enrollment or approval record.
4. Confirm instructor identity/assigned-cohort authorization separately; invite/enroll learners only when explicitly authorized.
5. Confirm Auth site/redirect URLs, approved mail delivery and institutional privacy/retention settings.
6. Set `VITE_APP_MODE=connected`, public Supabase URL/publishable key, and the real `VITE_COURSE_ID` in production. Server credentials stay server-side.
7. Build/stage the production version; verify sign-in → authorized attempt → response → database → faculty evidence/CSV → completion receipt. Promote only after the confirmed boundaries work.

No production deployment, database migration, invitation, staff-role grant or completion receipt was performed during the preparation recorded here. See the deployment runbook for the implementation details.

## Subsequent authorised setup and verification — 2026-10-07

The preparation above is historical, not the current database state.

- After scoped setup approval, inspected the initially empty application schema and applied all four migrations. Verified 12 application tables with RLS enabled on all 12 and four migration-history records.
- Created course `2d82ff1d-efd9-42f1-9eb9-0c790301514b` and initial cohort `8a2510c9-737e-43ba-97cd-6f373bed43a2`. No semester, deadline or student enrollment was invented.
- After explicit invitation/access approval, sent one instructor invitation. Verified the instructor accepted it and had a confirmed Auth account. Granted only one cohort-scoped faculty assignment; no administrator assignment or student invitation was created.
- Re-ran `npm run check`: 179 tests across 14 files passed; TypeScript and Vite/PWA build passed. This local build is not evidence of a connected production release.
- Dashboard inspection shows no deployed Edge Functions. The CLI deployment-access check returned `AccessTokenRequiredError`. Browser dashboard login is not CLI management authentication.
- Backend deployment and live end-to-end verification remain blocked pending a user-completed Supabase CLI login. Do not request credentials in chat or extract dashboard session tokens. Content registration, production app configuration/staging, authenticated learner persistence/receipt tests and faculty report/export tests remain unverified. Existing production remains unchanged.

For subsequent successful backend deployment and connected staging on 2026-10-08, see `backend-verification-2026-10-08.md`; it supersedes the CLI-login blocker above.
