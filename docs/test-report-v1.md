# Test report — mini-game v1.0 draft

Date: 2026-10-07. Repository: `aoenotebook-hue/Pelvic-fx-game`; local review branch `redesign/minigames-v1`. Content v4 is draft.

## Automated results

- `npm run check`: **169 tests across 12 files pass**; TypeScript and Vite/PWA production build pass.
- All 44 stations: authored correct and malformed answer paths, English/Thai strings, source metadata, schema/link integrity and same-mechanic corrections.
- Ten catalog evaluators/boards render; tap placement, gauge controls, ring-checkpoint gating, restored placements and accessible SVG titles tested. MCQ remains supported for legacy editions, not the primary new journey.
- Explanation-before-SBAR, initial feedback acknowledgment, explicit corrective review, interrupted draft resume and pending-review resume tested.
- All-first-correct **355** and all-corrected **307**, duplicate reward events, outfit 5, immutable first responses, forged outcomes/scores, partial resume, final A/B answers and browser/server summary agreement tested. Existing legacy reward/tie/synchronization/report tests retained.
- Added progression regression: all four preparation cases can clear before final badges, preventing a final-unlock deadlock.
- First-versus-resolved eight-station retrieval summaries are shared by browser/server and checked for all-correct and all-corrected journeys. The update action now explicitly activates the waiting service worker instead of only reloading the old worker; real-device update recovery remains a pilot requirement.
- Added course-embed authorization helper tests: object/array membership shapes accepted only for the requested course; malformed/missing relations rejected.
- Separate Deno check: **all five Edge Functions pass** with their declared import map and `@supabase/server@1.9.1`. The first check exposed seven existing identity/embed type errors; these were corrected and rechecked. This is compilation/type validation, not a hosted authentication test.

## Local browser observations

- English landmark task: three selections survived a page reload and re-entry; next requested landmark resumed at Sacrum.
- A complete first response was saved; **10 reward appeared only after explicit feedback review**.
- English/Thai phone-width (360 px) and tablet-width (768 px) views checked; document widths matched viewport widths, and inspected views reported no unloaded images or console warnings/errors.
- Learner/room imagery, labelled source links, instruction/feedback transitions and mobile faculty-navigation access inspected. The production build launched successfully in the desktop preview with no console errors. After service-worker activation/reload, its offline verification reported **ready**; the initial incomplete state was not reported as success.
- CSS disables walking/reward animations under reduced-motion preference. The ten board render tests check titled vector images in both languages. This does not replace a real screen-reader or touch-device audit.

## Boundaries and remaining acceptance work

- No production publication, invitations, remote migration, content approval or live Supabase calls were performed. Live Auth → function → RLS/database → faculty export/receipt and cross-cohort tests require institutional configuration.
- No real-device installation, airplane-mode run, iOS keyboard, Android touch drag, screen-reader reading order, storage eviction or update-during-an-attempt was verified. Use the existing real-device/pilot checklist.
- Source figures were inspected locally; educator approval, copyright/de-identification confirmation and clinical sign-off remain outstanding. Diagnostic image zones and final-form equivalence have not been validated.
- The initial >500 kB JavaScript chunk warning was resolved with the supported Vite/Rolldown runtime/validation split; final application chunk is about 372 kB and the build has no chunk-size warning. The generated cache has 105 entries, roughly 41 MB of supplied teaching media/PDFs/code. Network/download/storage performance should be piloted.
- No fabricated cohort data, course completion receipt or competence grade is presented in the new learner podium. Demo results are local evidence only.

See `redesign-v1-review.md` for station/source review, safety discrepancies, count/reward interpretation and plan adaptations; `minigame-student-teacher-guide.md` for assessment use and CSV/Sheets handling.
