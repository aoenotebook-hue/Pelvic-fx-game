# Security checklist (app and teacher accounts)

## What the app now enforces

- **Teacher two-step verification.** Learner data, the faculty screens and the sheet export need an authenticator-app
  code (TOTP, assurance level `aal2`). This is checked in the Edge Functions **and** in the database policies.
  A stolen e-mail link alone cannot open student data.
- **Learners see only their own records.** Teachers see only the cohorts they are assigned to. Nobody can grant
  themselves a role, and role changes are written to `audit_events`. Run `scripts/test-rls.sh` against a scratch
  database to check this.
- **Sign-out clears the device.** It removes that learner's answers and drafts from a shared computer, with a warning
  if anything is unsent. Answers come back from the server at the next sign-in.
- **Server re-scores every answer.** It ignores the learner ID sent by the browser and uses the enrollment.
  Removed learners and unpublished content are refused.
- **Security headers** in `vercel.json`: strict Content-Security-Policy, HSTS, no framing, nosniff,
  Referrer-Policy and Permissions-Policy.
- **CORS** allows only the production site (`ALLOWED_ORIGINS`), never `*`.
- **Builds fail** if a secret key is put in a `VITE_` (browser) variable. Dependencies are pinned, and `npm audit`
  reports 0 vulnerabilities.
- **CSV and Google Sheet exports** neutralise spreadsheet formulas typed by learners.

## Teacher (you): one-time settings

1. **Supabase → Authentication → Multi-Factor → enable TOTP.** Then open Faculty in the app and scan the QR code
   with Google or Microsoft Authenticator.
2. Use **2-step verification** on the accounts that control the app: Google (Drive and Sheet), GitHub, Vercel,
   Supabase and your institutional e-mail.
3. Keep the evaluation sheet **Restricted**. Share it with named teachers only, never "anyone with the link".
4. Never paste the Supabase *service role / secret* key or the Google service-account JSON into chat, e-mail,
   GitHub or Vercel. They belong only in `supabase secrets`.
5. Invite learners individually. Automatic sign-up stays off (`shouldCreateUser: false`).
6. **Lost phone** → an administrator removes your factor in Supabase (Authentication → Users → MFA factors); you then
   enrol again.
7. **Student leaves the course** → delete their row in `memberships`. Their device can no longer submit.
8. At the end of the retention period, delete or anonymise rows in the sheet and in the database.

## Still to do on the live services (needs your credentials; not done from this repository)

- Apply `supabase/migrations/202610090002_security_hardening.sql` in staging, then production.
- Deploy the functions (`sync-events`, `start-attempt`, `faculty-workspace`, `completion-status`,
  `cohort-leaderboard`, `sheet-export`) and set `ALLOWED_ORIGINS`.
- Enable TOTP MFA in Supabase Auth, and set the Site URL and redirect URLs to the production domain only.
- Point Vercel production at this branch's merge (production currently builds from `redesign/minigames-v1`).

## Known residual risks

- Practice-station and test answer keys are in the app bundle, because the game gives instant feedback offline.
  The server re-scores everything, and the scores are formative. Do not use them as a high-stakes exam without
  moving the post-test to server-only scoring.
- Draft content: clinical wording, doses and images still need faculty approval before cohort release.
