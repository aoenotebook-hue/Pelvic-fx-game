# Test report — v0.9.0

Local verification: 3 October 2026, Asia/Bangkok. Technical/educational-design evidence only; not clinical approval or an institutional pilot.

## Automated checks

`npm run check` passed: **85 tests in 8 files**, then TypeScript compilation and the production Vite/PWA build.

Coverage includes the 15 authored bilingual nodes and corrections; source/teaching metadata; preserved 6/5/4 case flow; reason-before-choice handover gating; optional confidence; explicit corrective explanation acknowledgment; immutable first answers; correct 250 and corrected 220 rewards; every interrupted event prefix and cloned resume; duplicate-event/replay protection; thresholds and shared tied ranks; version isolation and saved v1/v2 attempts; shared browser/server v3 evaluation; event/sequence validation; enrolled objective denominators and separate missing/incorrect/corrected evidence; formula-safe UTF-8 CSV encoding; assigned-cohort authorization logic; separate teacher rubric storage without reward changes; large submission queues split into 100/100/51; partial transport failure preserving accepted acknowledgments; receipt recovery without a response queue; and auth-change listener cleanup.

Transport/auth tests use controlled mocks. They do not establish that hosted endpoints, SQL migrations or real Supabase accounts work.

## Browser evidence

- Full first-correct route: 15 first responses, no corrections, three preparation/handover reasons, omitted optional confidence, 250/250 reward, 15 cleared decisions, six badges and podium. A final recheck recorded no browser errors.
- Full corrected route: 15 first responses and 15 corrections, explicit explanation-review actions, three handovers, omitted confidence, 220/250 reward, 15 cleared decisions and six badges.
- Actual IndexedDB concurrent writes allocated sequences 1/2/3. Same-ID repetition returned its original sequence without adding a record; altered payload was rejected. An abort-rejection error surfaced during testing, was explicitly handled, and the fresh-session recheck reported no unhandled rejections or browser errors.
- Production preview: saved first answer/feedback survived an offline reload; Resume quest opened M1N2. This is browser emulation, not a real-device installation test.
- English case at 390×844 and Thai case at 820×1180: no horizontal overflow; learner/patient/text areas visually separated. Reduced-motion emulation returned `none` for both encounter images.
- All three supplied source PDFs returned HTTP200. Source-page anchors and existing teaching figures remain available. Full routes reported no broken images. The selected image set is unchanged from v0.8, where original binder enlargement and Escape closing were checked.
- Faculty browser view rendered actual saved-attempt objective counts and private review controls. UI tests inspect learner notes and separate rubric saving. The anonymous print path excludes staff-private sections; physical printing and institutional privacy review remain required.

Evidence images: `deliverables/v0.9-entry.png`, `v0.9-complete.png`, `v0.9-faculty-filled.png`, `v0.9-phone-en.png`, `v0.9-tablet-th.png` in the parent workspace.

## Build notes

Production precache: 98 files, approximately 41.7 MiB, including supplied PDFs and game assets. First download requires a connection and enough browser storage. Main JavaScript is approximately 575 kB uncompressed; Vite reports a non-failing chunk-size warning. No dependency was added for this revision; the existing lockfile is included.

## Not verified / institutional configuration required

No Supabase URL/project key/course ID, institutional identity setup or approved published clinical bundle was supplied. No hosted function deployment, migration application, database-policy execution, real invitation, email delivery or production change was performed. Live cohort reporting, server-confirmed review saves, cross-cohort API/RLS checks, authenticated receipt timestamps and ranking therefore still need staged integration testing with learner/faculty/admin accounts.

Required configuration: `VITE_APP_MODE=connected`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_COURSE_ID`; all three migrations; all five authenticated functions; course/cohort/member/assigned-role records; approved Auth redirect/SSO or invitation policy; clinically approved immutable content and image permissions; deadline/class/support/privacy/retention settings. Privileged service credentials stay server-side.

Real-device checks remain: iOS Safari and Android installation, tablet/desktop browsers, touch movement, keyboard-only full journey, screen-reader review, storage eviction, offline account changes, service-worker updates and actual printing. EN/TH clinical/editorial approval and reconciliation of the handout binder-removal discrepancy are still necessary before real delivery.
