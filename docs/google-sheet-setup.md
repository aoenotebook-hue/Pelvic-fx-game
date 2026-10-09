# Teacher evaluation sheet — set-up and use

The app writes every learner's results into a private Google Sheet that you own. The layout follows common
medical-education analyses: pre-test vs post-test, objective mastery, item analysis, misconceptions and course feedback.

## 1. Create the sheet (once, about 1 minute)

1. Download `docs/evaluation-workbook-template.xlsx` (it is also attached in the chat).
2. Go to Google Drive, then **New → File upload**, and choose the file.
3. Open it, then **File → Save as Google Sheets**. Name it *Pelvic Fx Game — Evaluation*.
4. Copy the sheet ID from the address bar. It is the long text between `/d/` and `/edit`.
5. Keep sharing **Restricted** (never "Anyone with the link"). Share only with course teachers.

Your older sheet "Pelvic Fx Game" was filled by a sync that is not in this app's code. Leave it as an archive.

## 2. Connect the app to the sheet (once, by the course administrator)

1. In Google Cloud Console, create a **service account** (no roles needed). Create a **JSON key** for it.
   Treat the key like a password.
2. In the Google Sheet, click **Share** and add the service account's e-mail (`…@….iam.gserviceaccount.com`) as **Editor**.
3. Store the secrets in Supabase. They never go into Vercel or the browser:
   ```
   supabase secrets set GOOGLE_SA_JSON="$(cat service-account.json)" SHEET_ID=<sheet id> ALLOWED_ORIGINS=https://pelvic-fx-game.vercel.app
   supabase functions deploy sheet-export
   ```
4. Delete the downloaded JSON key from your computer.

## 3. Daily use

In the app, open **Faculty**. You need your authenticator-app code; see the security checklist. Then:

- **Update Google Sheet now** replaces the raw tabs with the latest data. Analysis tabs recalculate automatically.
- **Download CSV** gives any single tab as a file. This works even before step 2 is done.

| Tab | One row is… | Use it to… |
|---|---|---|
| README | – | read definitions, the pass standard and the privacy rules |
| Dashboard | – | see enrolled, started and completed counts, pass rate, mean pre/post, normalized gain and course feedback at a glance |
| Objective Summary | a learning objective (LO1–LO7) | see first-try mastery in practice, the pre→post change and how often feedback fixed mistakes |
| Item Analysis | a station / test item | read difficulty *p*, discrimination *D*, time, hint use and a flag; revise items marked "very hard" or "low discrimination" |
| Pre-Post by Cohort | a cohort | read paired *t*, *p*, Cohen's *dz*, mean normalized gain and pass rate (for reports and research) |
| Misconceptions | a specific wrong card | plan the class debrief, starting with the most common mistakes |
| Attempts | a learner attempt | get each student's pre/post scores, pass standard, gain, LO1–LO7 % and time on task |
| Station Responses | a learner × station | find the raw evidence for any analysis (filter or pivot) |
| Handovers / **Handover Scoring** | a learner handover | read the student's SBAR reasoning and score it with the rubric (S, B, A, R each 0–2) |
| Teacher Reviews | a teacher observation saved in the app | review the 3-dimension rubric and the feedback given |
| Course Feedback | a learner's 1–5 ratings | see learners' reactions (Kirkpatrick level 1) |
| Roster | an enrolled learner | see who has not started or completed |
| **Manual Exclusions** | a learner to leave out | remove withdrawn students, students without consent, or test accounts from the statistics |

Tabs in **bold** are yours. The export never overwrites them. All other tabs are replaced on each update.

## 4. Pass standard and interpretation

- **Pass**: post-test ≥ 6/8 correct on the first try **and** both safety items correct: FS2 (no Foley with blood at the
  meatus) and FS6 (binder over the greater trochanters).
- **Normalized gain g** = (post − pre) / (8 − pre). Below 0.3 is low, 0.3–0.7 is medium, above 0.7 is high.
- **Difficulty p** below 0.30 or above 0.90, or **discrimination D** below 0.20: review the item and how the topic was taught.
- These are formative measures from a supervised game. They show knowing and "knows how" (Miller), not ward performance.
