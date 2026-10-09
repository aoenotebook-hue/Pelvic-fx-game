# Teacher evaluation sheet — how it works

Your existing Google Sheet (the one the app already fills every minute) now also receives the evaluation tabs.
Nothing new to set up: the same service account and the same Supabase secrets are used
(`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SHEET_ID`, `SHEETS_WORKER_SECRET`).

Keep sharing **Restricted** (never "Anyone with the link"). Share only with course teachers.

## When the sheet updates

- Automatically, about one minute after any new answer, sign-up or teacher review.
- On demand: **Faculty → Sync to Google Sheets**. The status line shows pending changes and the last delivery.
- **Faculty → Export results → Evaluation workbook → Download CSV** gives any single tab as a file.

## Tabs

Class tabs (from the first release): Class Overview, Learner Results, Decision Evidence, Handovers, Teacher Reviews,
Objective Analysis, Demo Examples, Sync Status & Guide.

Evaluation tabs (medical-education analysis, rewritten on every sync):

| Tab | One row is… | Use it to… |
|---|---|---|
| Dashboard | a measure | see enrolled / started / completed, pass rate, mean pre and post, normalized gain and course feedback |
| Objective Summary | a learning objective (LO1–LO7) | see first-try mastery in practice and the pre → post change |
| Item Analysis | a station or test item | read difficulty *p*, discrimination *D*, time and hints; revise items flagged "very hard", "very easy" or "low discrimination" |
| Pre-Post by Cohort | a cohort | read paired *t*, *p*, Cohen's *dz*, mean normalized gain and pass rate (for reports and research) |
| Attempts | a learner attempt | each student's pre/post score, pass standard, gain, LO1–LO7 % and time on task |
| Station Responses | a learner × station | the raw evidence for any analysis (filter or pivot) |
| Misconceptions | a specific wrong card | plan the class debrief, starting with the most common mistakes |
| Course Feedback | a learner's 1–5 ratings | learners' reactions (Kirkpatrick level 1) |
| Roster | an enrolled learner | who has not started or completed |
| **Manual Exclusions** | a learner to leave out | type a student ID and a reason (withdrew, no consent, test account); they are left out of all statistics |
| **Handover Scoring** | a learner handover | score the student's SBAR reasoning (S, B, A, R each 0–2) |

Tabs in **bold** are yours: the app creates them once, reads them, and never overwrites what you type.
New handovers are added at the bottom of Handover Scoring.

## Pass standard and interpretation

- Students play the focused edition: **3-item pre-test → 3 patient cases → 3-item post-test**.
- **Pass**: post-test 2 of 3 correct on the first try **and** both safety items correct:
  FS1 binder over the greater trochanters, FS2 no Foley with blood at the urethral meatus.
- **Normalized gain g** = (post − pre) / (3 − pre). Below 0.3 is low, 0.3–0.7 medium, above 0.7 high.
- With only 3 test items, individual scores are coarse: use them for feedback and class trends, not grading.
- **Difficulty p** below 0.30 or above 0.90, or **discrimination D** below 0.20: review the item and how it was taught.
  Discrimination needs at least 4 learners who finished the post-test.
- QA / demo / test accounts (IDs starting with QA, DEMO or TEST) and practice re-runs stay visible but are excluded
  from statistics.
- These are formative measures from a supervised game: they show "knows" and "knows how" (Miller), not ward performance.
