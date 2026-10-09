# Account and sign-out repair — 8 October 2026

## Scope and behavior

The learner or assigned teacher opens **Account** in the top header, then **Sign out**. The control is not mixed with game navigation. It is available only while signed in. English and Thai labels, touch-sized controls, keyboard disclosure and Escape closure are provided.

Sign-out uses Supabase's supported `local` scope: the current browser session only, not other devices. IndexedDB learner events and offline files are not deleted. The account panel warns about unsent records and explains returning to the same account to submit them. Signing out does not claim those records were accepted.

The previous button discarded its promise and had no error/loading state; it was rendered even when signed out. The repair handles service errors, prevents concurrent clicks, explicitly returns to institutional sign-in after successful sign-out, hides staff controls, clears in-memory evidence, and blocks learner screens and automatic submission while signed out. Late synchronization messages cannot overwrite the signed-out state. Server authentication and assigned-cohort permissions are unchanged.

## Verification

- `npm run check`: 207 tests / 20 files passed, TypeScript and production build passed.
- Added tests: local sign-out scope/service errors; pending-work warning; duplicate click protection; error/retry; Thai labels; signed-out screen gating and removal of staff entry; staff state retained after a rejected sign-out without an auth change.
- `git diff --check` passed.
- Existing Mac Safari control was exercised; it gave no visible state change, but subsequent reload showed institutional sign-in. The cached PWA still displayed the old always-present Sign out button. Applying the release's Refresh now action showed the repaired signed-out page without that misleading button and with Sync now disabled.
- Production release was built on Vercel and assigned to the existing student URL. No database, invitations, account permissions or authentication requirements were changed.
- Final release: `dpl_73TPfUS5WirVgkBiTHAo3dCE1FPA`, READY, production; https://pelvic-fx-game-aoe5.vercel.app/ (generated deployment https://pelvic-fx-game-2cdjnfsig-aoe5.vercel.app/). Public build entry: `index-CjpucONK.js`.
- Anonymous faculty-workspace request remains HTTP 401. The isolated live browser remains on institutional sign-in even when Quests is selected while signed out.
- Live new-menu authenticated sign-out requires a fresh Mac sign-in after the above test signed the browser out. iPhone native-session behavior is not yet device-tested; a local browser logout does not intentionally revoke another device's session.
- The prior QA response-submission problem is not claimed resolved by this sign-out test. No new completion receipt is claimed.

## Provenance

Deployment is from the local working checkout, baseline `ac9cf92`, branch `redesign/minigames-v1`, including existing approved changes. This is not a claim of a new GitHub commit or push.

Official behavior reference: https://supabase.com/docs/reference/javascript/auth-signout
