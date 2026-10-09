# Learner access and Google Sheets setup

The approved 15 decisions, Thai/English content and rewards are unchanged. Learners enter an email and a Student ID, with no email link. Identity is self-reported: someone who knows both details can reopen that record. Faculty continue using verified sign-in and assigned-cohort authorization. Dedicated learner Auth principals cannot receive staff sessions through learner-entry.

## Already configured project identifiers

Supabase project: `wdedeqaqjyyudhjivnva`. Course: `2d82ff1d-efd9-42f1-9eb9-0c790301514b`. Self-registration cohort: `8a2510c9-737e-43ba-97cd-6f373bed43a2`.

Target workbook: [Pelvic Fx Game](https://docs.google.com/spreadsheets/d/1RCmIRdY8YUN3n5JlNVXn5A8X8up60bufMwt0LGkjt1E/edit).

## Finish Google configuration

1. In your institution's Google Cloud project, enable **Google Sheets API**. Create a dedicated service account for this workbook. Do not give it project-wide administrator access. If your institution disallows service-account keys, arrange workload identity with its administrator before changing this implementation.
2. In the workbook's Share dialog, grant **Editor** access to that service account email only. Keep the workbook private. Safari access and the Codex Drive connection do not give the application persistent access.
3. Create the service account's JSON key through Google's console. Keep it out of this repository and browser. In **Supabase → Edge Functions → Secrets**, configure `GOOGLE_SERVICE_ACCOUNT_EMAIL` from `client_email` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` from `private_key`. Paste the PEM with real newlines; escaped `\n` is also accepted. Never paste the key into chat.
4. Set `SHEETS_WORKER_SECRET` to a newly generated long random value in Supabase secrets. In **Supabase Vault**, add `ptd_sheets_worker_secret` with the same value and `ptd_sheets_worker_url` with `https://wdedeqaqjyyudhjivnva.supabase.co/functions/v1/sheets-worker`. Vault stores the scheduler credential separately. The worker accepts only this dedicated bearer credential.
5. `LEARNER_COURSE_ID`, `LEARNER_COHORT_ID`, `GOOGLE_SHEET_ID` and `GAME_APP_URL` select the course, cohort, workbook and teacher links. They are server configuration; public identifiers are not privileged credentials.
6. The additive migrations install the queue and `ptd-google-sheets-every-minute` cron job. Before Vault is configured, the job does nothing. After configuration, open the protected teacher area and select **Sync to Google Sheets**. Wait for the next minute, then refresh the teacher page to check delivery.
7. First successful delivery creates eight managed tabs and six fictional `DEMO` examples, backfills accepted records, and preserves unrelated tabs. If a requested tab name already exists without the application ownership marker, export safely fails rather than overwriting it. Rename that existing tab after checking its contents, then retry.
8. Read back Learner Results, Demo Examples and Sync Status & Guide. Run a second synchronization and confirm stable Record IDs appear once and the 250/220 examples match. Check the labelled QA attempt, teacher observations, leading-zero IDs and Bangkok dates. Live delivery cannot be claimed until these checks succeed.

## Operating the workbook

Class Overview has From/To received date, cohort and content-version filters. Dates use `YYYY-MM-DD` in Bangkok. Learner Results includes assessed and practice attempts; official comparisons use reporting assessed attempts of the same content/reward version. Registered learners are the participation denominator; students who never entered are unknown to this application.

Decision Evidence distinguishes missing, first-correct, corrected and unresolved responses. Handovers contains learner-authored reasons and expected teaching points. Teacher Reviews mirrors manual interpretation/priorities/uncertainty observations. Objective Analysis provides expected/observed counts and first/corrected/unresolved/missing evidence. Filter practice separately before summarizing objectives. Rewards measure game progress and do not establish clinical competence. Demo Examples is excluded from real totals.

Keep authored comments in the protected teacher area. Spreadsheet links reopen the selected learner attempt there. Sheet edits do not alter immutable learner evidence or teacher observations. Existing populated rows outside the managed record IDs are preserved. The managed tables currently allow 10,000 rows; exceeding this limit surfaces an export error and retains the queue.

## Reliability and recovery

Every accepted response, summary, membership and teacher observation increments a durable course queue revision. The worker leases a job, writes stable-ID rows, and acknowledges only the revision it delivered. New changes during delivery remain pending. Failures retry with backoff up to one hour; manual Sync resets retry timing. Sheets failure does not block learner saves. The status in the workbook reflects its last successful delivery; the teacher area shows current pending/error state.

Email/ID conflicts return a generic entry error and require staff correction. Do not silently change another student's identity. A verified administrator can inspect the conflicting profile/membership in Supabase and make a documented correction after checking the student. Keep student IDs as text.

## Deployment and checks

Apply `202610080005`, `202610080006`, and the forward repair `202610080007` migrations, configure server identifiers, and deploy `learner-entry`, `learner-context`, `learner-attempts`, `sheets-status`, `sheets-worker`, `start-attempt`, and `sync-events`. The repair corrects PostgreSQL named arguments in the existing cron job without creating a second schedule. `learner-entry` and `sheets-worker` use their own validation; all other learner and teacher endpoints require a user session. Staff endpoints additionally enforce assigned-cohort authorization.

Live service-account delivery was verified on 8 October 2026. See `google-sheets-live-verification-2026-10-08.md`. Operators can request the worker's protected, read-only `{"operation":"verify"}` check using the worker credential inside Vault. It returns tab counts, duplicate/formula-error checks, fictional examples and labelled QA results, not ordinary learner rows. Never expose that credential to the browser.

Run `npm run check`. Run Deno check for all changed functions with `supabase/functions/import_map.json` and Deno test for `supabase/functions/sheets-worker/google.deno-test.ts`. Stage the connected Vercel build, verify learner entry and accepted responses, then promote it and update the established student alias. Keep Vercel deployment protection for preview URLs. Real Mac Safari/iPhone touch, installation and offline tests remain distinct from phone-sized browser checks.
