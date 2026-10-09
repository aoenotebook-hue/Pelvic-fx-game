# Security checklist (app and teacher accounts)

## What the app now enforces

- **Teacher two-step verification.** Learner data, the faculty screens and the CSV export need an authenticator-app
  code (TOTP, assurance level `aal2`). This is checked in the Edge Functions **and** in the database policies.
  A stolen e-mail link alone cannot open student data.
- **Learners see only their own records.** Teachers see only the cohorts they are assigned to. Nobody can grant
  themselves a role, and role changes are written to `audit_events`. Run `scripts/test-rls.sh` against a scratch
  database to check this.
- **Student entry: student ID + a self-chosen 4-digit code.** The code is stored only as a salted PBKDF2 hash;
  5 wrong codes lock the ID for 15 minutes, and entry is rate-limited per ID and per network address. Learners cannot
  read the hash or lock columns. A teacher (with two-step verification) can reset a forgotten code; resets are
  written to `audit_events`.
- **Shared devices.** Records are kept per account, so another student cannot open them. Unsent answers stay on the
  device until the same student signs in again (so nothing is lost); students sign out from the Account menu.
- **Server re-scores every answer.** It ignores the learner ID sent by the browser and uses the enrollment.
  Removed learners and unpublished content are refused.
- **Security headers** in `vercel.json`: strict Content-Security-Policy, HSTS, no framing, nosniff,
  Referrer-Policy and Permissions-Policy.
- **CORS** allows only the two production domains (or `ALLOWED_ORIGINS` if set), never `*`.
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
5. Teachers sign in by e-mail link only if already invited (`shouldCreateUser: false`). Students create their own
   entry with student ID + code; tell them not to share the code. If a student says "my ID is already taken",
   reset that code from Faculty while the student is with you.
6. **Lost phone** → an administrator removes your factor in Supabase (Authentication → Users → MFA factors); you then
   enrol again.
7. **Student leaves the course** → delete their row in `memberships`. Their device can no longer submit.
8. At the end of the retention period, delete or anonymise rows in the sheet and in the database.

## Known residual risks

- **A 4-digit code is short.** The lock and rate limits stop guessing online, but someone who watches a student type
  it can enter as that student. Anyone who knows an unused student ID can claim it first; the teacher reset fixes this.
  Acceptable for formative practice, not for graded assessment.
- Practice-station and test answer keys are in the app bundle, because the game gives instant feedback offline.
  The server re-scores everything, and the scores are formative. Do not use them as a high-stakes exam without
  moving the post-test to server-only scoring.
- Draft content: clinical wording, doses and images still need faculty approval before cohort release.
