# Focused learner journey and teacher assessment

Edition: `ptd-minigame-focused-2026-10-08`. Approved by Sorawut Thamyongkit on 2026-10-08 for student use, including English/Thai content and supplied images. Published to the existing course and deployed to Vercel. See the [release verification report](focused-release-verification-2026-10-08.md) for current access and authenticated verification limitations. The verification notes below describe the earlier local check, not completed live acceptance.

## Student instructions

Choose one of four characters. Select **Start first patient**, or walk to the unlocked patient. Follow **Next task** when returning. Each screen presents one team update and three action choices: choose, confirm, then review the feedback. A correct retry requires explicit explanation review. At each patient's handover, write one short reason before revealing the choices. Confidence and other notes remain optional.

There are **15 required decisions**, in three patient stories (6/5/4). There is no additional academy quiz, boss quiz or final examination in this edition. Charts, source-linked figures and reference cards remain available. At the end, review the three handovers and select **Finish shift**. Bring the personal learning summary to class. Rewards reflect game progress, not clinical competence: maximum 250; all initially incorrect but corrected and reviewed earns 220. Clothing thresholds remain 0/40/90/150/210.

Older attempts retain their original questions and scoring, including the previous 44-station edition. Moving to a new edition is explicit, never a silent conversion.

## Teacher instructions

In connected mode, the small **Teacher area** link near the credit appears only for authorized staff; it is absent from the learner's main menu. The separate `#teacher` entry still requires authentication and assigned-cohort permission. A URL is not an authorization mechanism. Local demo tools are clearly labelled and do not submit institutional records.

1. Choose a content version, date range and optional learner-ID search. Quick filters include Today, Last 7 days and All dates.
2. **Class summary** shows participation, first-response misconceptions, corrections and handovers awaiting discussion. Missing evidence is not an incorrect answer. Practice attempts are excluded from class totals.
3. **Open learner** to compare actual selected answers, corrections, optional confidence, reference use, pre-choice handover reasons and expected teaching points. Discuss before recording a rubric observation. Use the separate [teacher rubric and class discussion guide](teacher-rubric-and-class-guide.md); observations never change rewards or automatically judge free text.
4. **Export results** offers separate cohort, detailed evidence, teacher-review and objective CSV files. Open in Excel or import into Google Sheets through File → Import → Upload. These are manual exports, not automatic Google delivery. Keep identifiable files in approved institutional storage.
5. Print the anonymous class briefing for discussion. Learner rows, individual notes and staff-only observations are excluded from that print view.

Date filters use **Asia/Bangkok**, inclusive calendar days. Received-activity mode selects whole attempts with a confirmed server-received event in the range; it preserves all answer context in that attempt. Completion mode selects confirmed completion dates. Review exports use each observation's own review date. One latest eligible attempt per learner/cohort contributes to class totals; individual review retains matching attempts. Not-started is labelled as an all-date measure for the selected edition. A late offline upload therefore belongs to its received date, not an untrusted device-clock date.

## Educational blueprint and question review

This edition reuses the 15 authored clinical decisions, plausible alternatives, EN/TH text and corrective explanations from the reviewed case edition. See the [question-by-question source review](educational-review-v0.9.md) for exact key messages, misconceptions and supplied PDF pages. The [NBME guide](https://www.nbme.org/sites/default/files/2021-02/NBME_Item%20Writing%20Guide_R_6.pdf) informs focused decisions and homogeneous alternatives; this is not psychometric validation. Supported handover retrieval and later class discussion remain informed by [Larsen et al.](https://pubmed.ncbi.nlm.nih.gov/19930508/).

| Decision | Required evidence | Objective links |
|---|---|---|
| M1N1 | Recognize urgent physiological threat without claiming the source | LO2, LO5 |
| M1N2 | Communicate parallel assessment/resuscitation | LO5, LO7 |
| M1N3 | Recognize the supervised binder landmark | LO1, LO6 |
| M1N5 | Interpret transient response before imaging | LO5 |
| M1N4 | Discuss imaging in the stated unresolved-shock setting | LO3, LO5, LO7 |
| M1N6 | Explain and communicate urgent priorities | LO7 |
| M2N1 | Establish binder/image context | LO3, LO6 |
| M2N2 | Review anterior and posterior findings together | LO1, LO2, LO3 |
| M2N3 | Distinguish physiological and mechanical stability | LO2, LO3 |
| M2N4 | Request senior imaging/binder reassessment and a safe agreed plan | LO3, LO6 |
| M2N5 | Explain findings and uncertainty in handover | LO3, LO7 |
| M3N1 | Recognize possible open injury | LO4 |
| M3N2 | Recognize meatal bleeding as a warning, not a proven diagnosis | LO4 |
| M3N3 | Coordinate associated-injury review while trauma care continues | LO4, LO5, LO7 |
| M3N4 | Explain suspected injury, uncertainty and a senior request | LO4, LO7 |

These links document opportunities, not proof that every detailed outcome has been mastered. Detailed ligament anatomy and fracture-classification recall remain reference and in-class tasks; the 15 decisions do not independently measure every classification subtype. Use supplied slide 5, slide 14 and the source anatomy cards for comparison and recall during class. Six safety concepts and three explanatory handovers remain required. No extra numbered pre-class questions were introduced.

The supplied figures remain teaching examples, with enlargement, accessible descriptions and source-page links. Fictional case imaging reports remain authoritative. No fake diagnostic images or additional findings were generated. Binder wording retains supervised reassessment: the handout H18/BOAST discrepancy is visible in educator notes and must be reconciled with institutional practice before approval.

## Verification report

- 197 tests pass across 18 files; TypeScript and production PWA build pass.
- New tests cover all 15 first-correct and corrected paths, three handover preparations, explicit correction review, 250/220 totals, duplicate reward protection, browser/server calculation agreement and unchanged old attempts.
- Date/report tests cover Bangkok midnight boundaries, inclusive dates, invalid/reversed ranges, completion versus activity, practice exclusion, missing evidence, search, version isolation, independently dated reviews and spreadsheet formula escaping.
- Teacher component tests cover individual rationale/rubric storage, range validation and learner filtering. Existing authorization, synchronization, tied-rank, outfit and offline-resume tests remain passing.
- Local browser checks confirm character selection, Next task, three choices, disabled confirmation before selection, feedback review/reward, saved progress after reload, English/Thai text, separate teacher navigation and Today filter. A phone-width DOM check found no horizontal overflow. Responsive emulation is not real-device PWA validation.
- Automated CSV generation tests pass. Browser download completion was not confirmed: the browser-control download observer timed out. Native Excel/Sheets import, print-preview output, actual phone/tablet installation, touch usability, reduced-motion experience and educator review remain manual release checks.
- The latest content is not registered or published in production. New-edition authenticated service behavior has not been verified against the live cohort. No reporting QA attempt, invitation or production database change was made in this revision.

## Release gate

After educator approval, register this exact content bundle through the existing approved course-publication workflow, deploy the Supabase functions with the updated shared version rules, and only then release the matching Vercel frontend. Do not deploy this frontend alone against a backend that only recognizes the old edition. Keep old content registrations and attempts. Repeat authenticated start, upload, completion-receipt recovery and faculty export checks with approved practice-only QA data; do not manufacture official reporting evidence.
