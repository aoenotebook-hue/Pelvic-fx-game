# Test report

For current v0.8 evidence, see [test-report-v0.8.md](test-report-v0.8.md). The material below describes prior releases and is not the revised-case test count or reward specification.

Date: 2 October 2026

## Version 0.7.0 update verification

The current local copy passes 20 automated tests and the production TypeScript/PWA build. Additional browser checks confirmed continuous held-key movement, release-to-stop, proximity-gated case entry, loaded room images, a wrong answer followed by same-step correction (+5 reward), an empty next-question form, inline reference paragraphs, and Thai rendering. Phone (390×844) and tablet (820×1180) were inspected; phone width equalled viewport width and the repaired patient image fitted inside its scene. No browser runtime errors were reported during these checks. Resume routing now returns to the first uncleared decision; unit tests cover pending feedback and pending correction.

These are local checks, not evidence of connected cohort services, automatic report delivery, clinical approval, or physical-device installation. The older detailed results below describe the previous release's checks and were not all rerun this time.

A fresh-browser full journey then completed all 15 decisions and saved a debrief. IndexedDB contained 15 core responses, 15 feedback acknowledgments and one reflection; the UI showed 150/150 reward, 15/15 steps, six resolved safety badges, three podium places and “Completed on this device”. All images in that final view loaded. No browser runtime errors were reported. This used only the clearly labelled local demo; no course server was contacted.

## Executed

| Check | Result |
|---|---|
| `npm test` | Passed: 3 files, 18 tests |
| `npm run build` | Passed: TypeScript and Vite production build |
| PWA build output | Passed: manifest and generated service worker produced, including 24 learner reactions, 20 clothing-level sprites, 21 patient situation/feedback sprites, selected teaching figures and all three supplied PDFs |
| Browser game check | Passed: page content, no Vite overlay, fourth character selection, free two-axis movement, disabled case entry outside the interaction zone, enabled entry near a patient and the correct clothing sprite |
| Thai language check | Passed: language state and document language switch, Thai navigation, Thai mission title and Thai M1N1 clinical evidence rendered; coverage tests require all 3 missions, 15 nodes, 15 corrections and 5 resources |
| Image/text overlap check | Passed by browser geometry and visual inspection: learner callout does not intersect learner image; patient status text does not intersect patient image |
| Reward podium check | Passed with isolated fictional completion data: 150/150 reward, clothing level 5, three-place podium, ordered comparison list, current learner rank and explicit fictional-demo label |
| Reference-source check | Passed: R1 rendered two supplied figures and direct local PDF links; source-page links are present in figure captions |
| Responsive check | Passed at 1280×1000, 820×1180 and 390×844. Document width matched viewport on phone/tablet, tablet navigation was repaired, and every direction-pad touch target was usable after correcting a mobile grid collision |
| Faculty report check | Passed in demo: the report is derived from local fictional events, one report row rendered, and the guarded Excel-compatible CSV control is available |
| WebMCP registration | Passed in browser verifier: `get_learning_progress` and `start_or_resume_learning` registered |
| Dependency audit during install | 0 known vulnerabilities reported |
| Secret pattern scan | No credential found; environment template contains only an explanatory secret-name comment |

## Rule coverage

Automated tests verify exactly 6+5+4 quest decisions; exactly 15 same-step corrections; zero additional completion-form questions; valid keys, branches and resources; no fabricated clinical approval; deterministic first-choice and corrective reward; immutable first response; replay cannot add reward; confidence cannot change reward; both S1 nodes; S4 at M2N4; all six safety badges through corrective learning; debrief-required completion; a situation reaction mapped to every decision; five clothing thresholds; 20 clothing sprites; 24 reaction sprites; 21 patient sprites; four character choices; proximity-gated case entry; and complete Thai content-key coverage.

## Defects repaired

- Fixed the clinical hero heading contrast detected by visual inspection.
- Fixed the home start action so it opens orientation before the first mission.
- Removed the former additional completion quiz and moved S4 evidence into M2N4, keeping the complete learner journey at exactly 15 numbered decisions.
- Split the connected Supabase client into a lazy production chunk to keep the local learning bundle smaller.
- Corrected IndexedDB stored-event typing and the staging/download display state.
- Reframed the entry experience as a playable hospital route and moved it ahead of explanatory home content.
- Added keyboard/touch character movement and verified that patient proximity enables the matching case.
- Added four unnamed selectable learner characters, fictional patient characters, ER art and six visual reaction poses per character: observe, urgent, inspect, communicate, celebrate and reconsider.
- Added node-specific reaction mapping for all 15 decisions, reward points and a clinical quest HUD; corrections remain retries within their parent decision.
- Reset page position when entering a new quest step so the HUD and reaction scene are visible from the top.
- Added progressive learner rewards based only on deterministic authored scoring/corrections.
- Replaced experience terminology with reward terminology throughout the learner and faculty interfaces.
- Added five professional clothing levels for every selectable character and situation/feedback patient poses that preserve clinical-status neutrality.
- Added a completed-quest podium; the connected endpoint verifies cohort membership and returns only pseudonymous rank and total reward.
- Added four selected source-linked teaching figures and local links to all three supplied PDFs; expanded the service-worker size limit so those resources precache successfully.
- Added supplied Mahidol and CNMI marks plus a small author credit; logo reuse remains pending institutional confirmation for learner release.
- Replaced the former demo-only summary export with a connected, RLS-scoped cohort report loader and Excel-compatible summary export.
- Repaired the phone navigation/header interaction found during visual verification.
- Added a fourth unnamed learner with six reaction poses and five clothing levels.
- Replaced fixed left/right station selection with bounded two-dimensional movement and patient proximity gates.
- Renamed all three bays for their quest and patient focus.
- Added a persistent English/Thai toggle and reviewable Thai content layer for the complete learner-facing clinical journey.
- Repaired the tablet navigation height and phone direction-pad collision found during multi-viewport verification.

## Not executed

- No Supabase project, identity provider or secret credentials were supplied. Migrations and Edge Functions, including `cohort-leaderboard`, were not deployed, so connected RLS, ranking, invitation, two-device and server receipt tests remain unverified against a real service.
- No real iPhone, Android phone, tablet or assistive-technology device was available. Browser-emulated layouts passed; the separate real-device checklist remains pending.
- The Thai content layer has not been signed off by a Thai-speaking clinical reviewer; it remains draft content.
- No clinical reviewer, course pilot or institutional privacy/retention decision was supplied or fabricated.
- Institutional permission to reuse the supplied Mahidol/CNMI marks and selected teaching figures A14–A17 has not been independently verified; these remain pending in the asset register.
- Automatic email delivery was not configured. The implemented path is authenticated synchronization plus a faculty-only downloadable report; email requires an approved mail service and recipient/privacy configuration.
