# Educator guide

For the 15-decision journey and separate teacher area with date-range reports, use the [focused edition guide](focused-edition-2026-10-08.md) and [release verification report](focused-release-verification-2026-10-08.md). Instructions below remain relevant to older saved attempts. The edition was educator-approved and published on 2026-10-08; production access and authenticated acceptance checks remain as recorded in the report.

## v0.9 class priorities and individual review

Open Faculty workspace after authorized sign-in. Check participation and received status first; no received responses are not incorrect answers. Select the content version for comparison, review objective/concept denominators and common first-response misconceptions, then inspect the exact learner choices, correction history, contextual references, optional confidence and three handover reasons. Advice is authored; the teacher decides what fits. Free text is not automatically graded.

After discussion, record the three-dimension manual rubric, observation, feedback and next step by case or safety concept. Staff-only records retain reviewer/time/attempt/content and never change rewards. See [rubric and class guide](teacher-rubric-and-class-guide.md). Download cohort, evidence and teacher-review CSVs separately. Print the anonymous briefing without identifiable notes. The demo uses local fictional records only; institutional reporting/review confirmation require the configured service.

## v0.8 case-flow revision

Use [the 15-item bilingual clinical review](case-flow-review-v0.8.md) and [versioned reward rules](reward-rules-v0.8.md) for this release. Three continuous patient stories have 6/5/4 decisions. Only the three handovers require short reasons; all confidence ratings are optional. The final review displays those notes and Finish shift records completion without an extra question.

Inspect first-correct count and corrected count separately from reward. All-correct learners can collect 250; all-corrected learners 220 and the best outfit. Case/badge/shift rewards are collections, not clinical performance marks. The original 30-point learning score remains a separate report field.

CSV now includes reward total, maximum, scheme, content version, first-correct/15, corrected/15, clothing level, case stamp IDs and safety badge IDs. Do not combine ranking across versions. Equal reward totals share rank with no speed tiebreaker.

The handout's H18 immediate removal after a negative AP differs from the retained seed/BOAST supervised binder-reassessment approach. Review the documented discrepancy and institution-specific policy before sign-off. Meatal bleeding prompts senior-led assessment, not a universal prohibition for experienced clinicians or a student procedure.

New artwork is decorative: supported, covered adults on complete beds; learner celebrations do not modify patient physiology. Approve clinical wording, Thai adaptation, source-figure reuse, institutional marks and all artwork before release. Older attempts are not overwritten or rescored.

## Before release

Create the course and cohort, invite each learner through institutional identity or an individual account, assign faculty only to their cohorts, and keep editor access separate from learner-result access. Configure deadline, time zone, class link or location, facilitator contact, privacy notice, retention decision, content version and released follow-up links.

Clinical reviewers must approve every stem, key, distractor explanation, correction, accepted contextual alternative and local-pathway phrase. Published versions are immutable. A change creates a new draft and requires a new review.

## Seven day sequence

- Seven days before: release the course entry, access help, 45-minute workload, approved content and backup format.
- One day before: review assigned-cohort aggregates, first-attempt errors, corrections, confidence and unresolved safety concepts. Select at most two misconceptions for live clarification.
- Live class: use existing institutional meeting, polling and assessment tools. The PWA is not a live multiplayer dependency.
- Day 2 and day 7: release links only when the teacher-controlled tasks are available. Their unseen keys must never enter the downloadable practice bundle.
- Follow-up: contact learners with unresolved safety concepts privately and use a focused resource plus parallel decision.

## Reporting rules

The earliest server-accepted initial attempt for a learner, course and content version is the reporting attempt. Concurrent device attempts remain separate and are flagged; they are never silently merged. An authorized faculty member may designate an alternative with an audit record. Replays are labelled practice and never add points to the initial score.

Teacher review records reviewer, time, reason, version, concept, outcome and result. It preserves the original answer and does not award a correct-first score. Offline work unknown to the server must not be reported as confirmed completion.

CSV exports are role-restricted and prefix spreadsheet-formula-leading values. Do not treat duration, confidence, points or badges as clinical competence.

## Before-class performance report

In connected mode, learner events are stored locally first and submitted to the authenticated course service whenever a connection is available. The server recomputes the report summary from accepted events. Faculty can see only their assigned cohorts and can download a UTF-8, Excel-compatible CSV from **Faculty workspace > Cohort**. It includes learner identifier, attempt and content version, total reward, decisions reviewed, quests reviewed, safety badges resolved, debrief state, completion state and server timestamps.

The learner-facing end-of-quest podium requires deployment of the authenticated `cohort-leaderboard` function. It verifies course membership server-side and returns only pseudonymous rank, total reward and clothing level for reporting attempts. It does not return learner identifiers, answers or rationales. Enable it only after the institution approves cohort score visibility in the course privacy notice.

The local demo never emails or uploads a report. Automatic email delivery is intentionally not included without an institution-approved mail service, verified recipient, privacy review and retention decision. For the current implementation, the authenticated dashboard and guarded CSV are the appropriate pre-class delivery methods.

## Supplied teaching sources

The game content and each reference card were cross-checked against the supplied CNMI pelvic-injury teaching plan, the 2024 medical-student pelvic-fracture slide set, and the Thai pelvic-fracture teaching handout. Learners can open local copies of all three PDFs from each relevant card. Selected anatomy, AP-review, associated-injury and binder-positioning figures are reproduced with source-page links; the header institutional marks were cropped from the supplied slide set. Patient photographs, operative images and unapproved diagnostic case images were not republished. Clinical reviewers must approve the adapted wording, each selected figure and all institutional image use before learner release.

The emergency-room scene, learner characters and bed-bound patient characters are fictional, non-graphic game art. They do not represent clinical findings or calculate outcomes. Correct responses trigger a visible positive reaction and progressive badges; incorrect responses trigger a pause-and-review reaction without simulated deterioration.
# Learner entry and spreadsheet reporting update

Student entry uses self-reported email and Student ID. Faculty sign-in and assigned-cohort permissions remain separate. Participation counts registered learners, including those without received answers; they cannot count students who never registered.

Use date filters to choose your class briefing, open actual answers and three handovers, and record observations/advice in the protected teacher area. Reset attempts are practice and preserve the original assessed evidence. Rewards and clothing describe progress; first-answer performance, correction review and teacher observations describe different evidence.

**Sync to Google Sheets** queues delivery to your existing workbook. Configure the dedicated Google service account and Vault scheduler values using [setup instructions](learner-entry-sheets-setup.md). CSV downloads remain available while Sheets configuration is pending. Six fictional examples will be placed only on Demo Examples after the first successful delivery; they do not contribute to class totals.
