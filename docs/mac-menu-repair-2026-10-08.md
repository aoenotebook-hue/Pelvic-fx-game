# Mac menu repair — 8 October 2026

Story: learner navigation selects a screen within the current patient journey; authentication initialization and browser-return recovery determine whether that journey may be displayed.

## Findings and repairs

1. The inspected Safari game tab showed **Institutional sign-in**, no Account control and disabled Sync now. The previous signed-out page still rendered clickable learner navigation; its access gate intentionally kept the page on sign-in. Navigation is now absent while signed out, instead of looking broken. This does not bypass authentication.
2. A reproducible code-level defect affected Home and Quests while already on their route: entering a patient updates internal journey state, but clicking the same outer route does not change the `view` value, so the journey effect did not run. A navigation revision now explicitly resets the journey panel on every navigation selection, including the brand/home control. Saved events and drafts are not cleared.
3. A late initial authentication snapshot could overwrite a newer authentication event. Initial and focus-recovery snapshots now apply only if no newer authentication signal arrived. Returning to the game tab rechecks the existing browser session. Subscription and focus/visibility listeners are removed on unmount. Failures are reported, not treated as successful sign-in.

## Tests

Added regression coverage for repeated Home/Quests selections from an open patient, Resources and My progress navigation, a late null startup snapshot after sign-in, browser-focus session recovery, and hidden signed-out navigation. Existing sign-out, reward, immutable-event and permission tests retained.

The Safari tab inspected in this turn was not authenticated, despite the user's reported sign-in. No credentials or tokens were inspected and no learner records were changed. Live authenticated Mac navigation/sign-out remains to be checked after a successful sign-in is visibly present in that tab. A database read of only the existing teacher account's last successful sign-in timestamp returned 2026-10-08 02:06:56 UTC; this is earlier than the 13:48 UTC investigation and does not prove a new Mac session.

No backend configuration, permissions, student invitations or course content changes. Publication uses the existing Vercel project, connected mode and existing student alias. Local-source release, not a claim of GitHub push.

## Release result

- All 210 tests / 20 files passed; TypeScript and production build passed; `git diff --check` passed.
- Vercel production deployment `dpl_EfyEwHRdpTYgx978Zi77KbAkUXT8` reached READY; build duration 1.40 seconds.
- Generated deployment: https://pelvic-fx-game-bbswrcfyn-aoe5.vercel.app/
- Student URL: https://pelvic-fx-game-aoe5.vercel.app/
- Public build entry: `index-CfS5dwqu.js`.
- Source baseline: `ac9cf92`, `redesign/minigames-v1`, local working checkout including existing approved work.
- Public HTML confirmed `index-CfS5dwqu.js`. Isolated browser applied the PWA Refresh now action and visibly showed institutional sign-in without learner navigation; proof image `mac-menu-live-2026-10-08.png`.
- Native Mac Safari refresh could not be applied: the automatic permission review timed out. The last inspected native tab still showed the previous signed-out screen. This is not an authenticated Mac navigation pass.
