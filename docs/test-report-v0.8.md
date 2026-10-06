# Test report — v0.8.0

Run locally 2–3 October 2026 (Asia/Bangkok). This is technical evidence, not clinical approval or a real-cohort pilot.

## Automated checks

`npm run check` passed: 50 tests across 5 files, followed by TypeScript compilation and the production Vite/PWA build.

Coverage includes all 15 bilingual decisions and corrections; 6/5/4 sequence; transient response before imaging; binder introduced at imaging-case arrival; exactly three required handover reasons; optional confidence/notes; immutable first answers; feedback gating; all-correct 250 and all-corrected 220; every interrupted event prefix; cloned resume events; duplicate events, later answer replay and repeated corrections; case stamps and six badges; exact outfit thresholds; tied ranks; version isolation; original keys/scoring retained; saved legacy/new session selection; unknown versions preserved rather than silently replaced; provider-neutral client/server reward and completion agreement; server option validation and refusal of learner-submitted teacher review.

Existing UI checks cover four unnamed characters, English/Thai entry, proximity activation, held-key walking and release/blur stopping. Added UI checks confirm optional confidence/reason on action steps and mandatory brief reason at a handover.

## Browser checks

- Full first-correct route: 15 immutable first responses, 0 corrections, 3 handover notes, no confidence submitted, 250/250 reward, 15 cleared steps, 6 badges, outfit 5 and three podium cards.
- Full corrected route: 15 immutable first responses, 15 successful same-step corrections, 3 handover notes, no confidence submitted, 220/250 reward, 15 cleared steps, 6 badges and outfit 5.
- No broken images or horizontal overflow in the full routes at desktop viewport.
- English/Thai case screens checked at 390×844 phone emulation and 820×1180 tablet emulation. The phone check exposed a grid placement issue that made the learner too small; corrected and visually rechecked with separated text/learner/patient areas.
- Native figure enlargement opened at the original binder image's 1344-pixel width; Escape closed it. Source PDF links for all three resources returned HTTP200. Page anchors are preserved.
- Reduced-motion emulation reported learner animation `none`.
- Production service worker installed and precached 98 entries (approximately 40.7 MiB). Cached-file verification checked actual response bytes before reporting ready.
- Interrupted first decision resumed offline after reload at feedback, with 0 reward before acknowledgment. Collecting the reviewed feedback yielded 10 while still offline. Patient/learner images loaded; no browser errors were reported.
- Faculty demo downloaded a real local CSV with content version, reward total/maximum/scheme, first-correct, corrected, learning score, outfit, case stamps and safety badge columns. It contains fictional local data only.
- Final Thai completion screen displayed the localized reward podium, with shared ranks 1,2,3,3 for totals 250,240,220,220 and no overflow.

## Limitations and warnings

Build emits a non-failing main-bundle size warning (approximately 547kB uncompressed). Images/PDFs make the offline pack comparatively large; assess slow-network loading and storage eviction during the pilot. Download requires first access online and an active, fully cached production service worker; development preview does not certify offline readiness.

Supabase migrations and deployed Auth/RLS/function/database flows were not executed: no institutional URL/key/course configuration or live service was provided, and Supabase/Deno CLI execution was not available in this workspace. The shared server summary/validation/reward functions were exercised locally by tests; this does not establish live service integration success.

Still required: real iOS Safari and Android installation/standalone testing; actual tablet/phone touch hold/release and screen readers; rotation and virtual keyboard; low storage/cache eviction; service-worker upgrades with interrupted sessions; real account switching/revocation and multi-device conflicts; staged Auth/RLS/authorization, faculty assignments, live CSV and cohort leaderboard privacy checks.

Clinical English/Thai wording, binder guidance discrepancy, all reused figures, institutional marks and new decorative patient artwork remain pending educator/institutional approval. No production deployment, database mutation, enrollment, invitation or email was performed.
