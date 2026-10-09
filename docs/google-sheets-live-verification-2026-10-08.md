# Google Sheets live verification — 8 October 2026

## Result

The application's dedicated Google service-account connection successfully wrote and read back the existing private Pelvic Fx Game workbook. No Google credentials were printed, committed or sent to the browser. No learner responses, completion timestamps, rewards or permissions were modified.

Workbook: https://docs.google.com/spreadsheets/d/1RCmIRdY8YUN3n5JlNVXn5A8X8up60bufMwt0LGkjt1E/edit

## Repair deployed

The configured cron job existed but failed with `column "url" does not exist`: its function named arguments used `=` instead of PostgreSQL `:=`. Forward migration `202610080007_repair_sheet_schedule.sql` repaired the same job and was recorded in migration history. The original migration is retained unchanged. There is still one active one-minute job.

The sheets-worker function was redeployed with a dedicated-secret-protected, read-only verification operation. Student/faculty authentication is unchanged. Ordinary learner rows are not returned by this diagnostic operation.

## Live checks

- Initial export returned HTTP 200 and `delivered: true` through credentials selected inside Vault.
- A second queue revision was delivered automatically by the repaired schedule: revision 13 / delivered revision 13, no last error. Confirmed successful delivery at 2026-10-08 15:41:08 UTC (22:41:08 Bangkok).
- Scheduled executions at 15:41 and 15:42 UTC both succeeded.
- Readback after both deliveries returned identical managed record counts and zero duplicate IDs or formula errors across all eight tabs.

| Tab | Managed records |
| --- | ---: |
| Class Overview | Dashboard, not stable-ID records |
| Learner Results | 3 |
| Decision Evidence | 74 |
| Handovers | 9 |
| Teacher Reviews | 1 |
| Objective Analysis | 21 |
| Demo Examples | 6 |
| Sync Status & Guide | 8 |

Decision rows include missing evidence and retained earlier content versions; they are not all answered decisions. The existing QA population is two registered accounts and two assessed attempts, with zero completed attempts. Practice is separate. The six DEMO rows do not enter these totals.

Example rewards read directly from Google Sheets: registered/not started 0, incomplete 40, unresolved 0, all-first-correct 250, all-corrected 220, mixed corrected 240.

Labelled QA readback: QA-ENTRY-1008 initial attempt has one answered decision / reward 10; its practice reset has zero answers / reward 0; QA-INSTRUCTOR retained initial attempt has two answered decisions / reward 18. All remain incomplete, matching the existing accepted evidence. No fictional completion was added.

## Local verification

- Four Deno integration fixtures passed: repeat upsert, RAW/text and formula injection protection, retry without duplicates, preservation of foreign rows/unowned tabs, and diagnostic detection of duplicates/formula errors without exposing learner emails.
- Eight targeted Vitest tests passed (reporting plus imported focused-content fixtures), including engine-generated 250/220 examples, Bangkok dates, leading-zero IDs, practice separation and missing evidence.
- Deno type checking of sheets-worker passed.

## Limitations and operation

The separate Codex Google Drive connection still returns permission denied; the app's service account works independently. Workbook values/formulas were verified directly through that service account. Native Google Sheets visual layout and real-device browser behavior were not rechecked in this backend-only repair.

Refresh the workbook to see updates. Accepted learner records and teacher reviews queue a delivery on the next minute; retry/backoff applies during service outages. Use the protected teacher area's Sync to Google Sheets button for an explicit retry. Check Sync Status & Guide for the last successful delivery, and the teacher area for current pending/errors. Local unsent student work cannot appear in Sheets until the application accepts it.
