# Release notes

## v0.9.0 — learning evidence and teacher review

Adds immutable learning edition `ptd-learning-draft-2026-10-03` while preserving v1/v2. Revised plausible alternatives, three reason-before-choice handovers, explicit correction explanation review, contextual reference events and personal learning summaries. Faculty workspace adds participation, objective/concept denominators, exact learner evidence, authored discussion/advice, a separate staff-only manual rubric/history, three CSV exports and anonymous print briefing.

Submissions are serialized, ordered/batched and retried on new online work/reconnection/auth recovery; receipt recovery works independently of the event queue. Atomic local sequence allocation protects concurrent writes. The new migration preserves first confirmed completion time and introduces staff-only observations. 250/220 rewards and shared tied ranks are unchanged. See [current test report](test-report-v0.9.md) for verified and unverified boundaries.

## v0.8.0 — 3 October 2026

Implemented continuous 6/5/4 patient stories, fully revised English/Thai questions and corrections, prior-evidence charts, scene updates, three required handover reasons, optional confidence/notes and Finish shift. Added H17/S5/S11 figures, reused S14/S4, source-page links and enlargement. Corrected A16 caption and added supported, covered decorative patients.

Shared browser/server collections give 250 all-correct or 220 all-corrected, outfits at 0/40/90/150/210, six badges and three case stamps. Reports separate first-answer performance; version-isolated ranking shares ties. Original attempts retain original content/translations/scoring. Local migration, server integration, completion-receipt persistence and actual cached-file verification are included.

50 tests and the production build passed; both browser routes and offline interruption recovery verified. Live services and clinical/real-device review remain pending. The Desktop/app working copy is not a Git checkout: the archive includes the lockfile, but no Git commit or production publication is claimed. Prior work and the v0.7 archive were preserved.

## v0.7.0

Continuous walking now supports held arrow keys, WASD and captured touch-pad controls. The earned clothing sprite alternates legs and faces the walking direction. Key release, pointer cancellation, window blur and visibility changes stop movement. Reduced-motion mode preserves movement without limb animation.

Repeated home, room and encounter instructions were shortened without changing the authored clinical decisions. Source notes collapse in reference cards, while feedback now opens the relevant authored reference inline. Fixed phone patient-image clipping, disabled installation-help access, stale answer-form state between nodes, resume skipping pending feedback/corrections, and safety badges incorrectly inferred from question position.

The current writable working copy is in the teaching-resource folder's `app` directory. The earlier Documents copy is preserved but is not updated by this release.

Local demo build updated on 2 October 2026.

Recorded direct versions include React 19.3.0, TypeScript 7.0.2, Vite 8.3.2, vite-plugin-pwa 1.3.0, Vitest 5.0.3, Supabase JavaScript 2.117.2, idb 8.0.3 and Zod 4.6.5. The committed lockfile is authoritative for all transitive versions.

This release expands the emergency-room quest to four unnamed selectable adult learner characters, with six reaction poses and five professional clothing levels for each. The learner now moves freely in two dimensions with arrow keys, WASD or an on-screen direction pad; a case can be entered only inside the relevant patient's interaction zone. The bays are named Haemorrhage Response, Pelvic Imaging Review and Sensitive Injury Assessment to match their patient quests.

An English/Thai toggle now localizes the learner navigation, all three mission introductions, all 15 core decisions, all 15 same-step corrective items and all five learning resources. Familiar English clinical terminology remains where it improves clarity. The Thai layer remains part of the clinical-review draft and requires review by a Thai-speaking clinical educator.

The release retains exactly 15 learner-facing decisions, 21 situation-specific fictional patient poses, deterministic reward points, five clothing levels, the privacy-limited cohort podium, six safety badges, Sorawut Thamyongkit creator credit, Mahidol/CNMI header branding, source-linked figures, local copies of all three supplied PDFs, offline resume and the authenticated cohort report export designed for Excel. It contains no invented diagnostic images or simulated outcomes, institutional identity configuration, real learner accounts, automatic email service or production deployment.
