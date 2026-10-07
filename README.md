# Pelvic Trauma Decisions

Current edition: **v1.0.0-draft**, content `ptd-minigame-draft-2026-10-07`. New attempts use Pelvis Academy, three patient stories, 24 practice stations, four three-station boss rounds and an eight-station A/B retrieval shift. Illustrated sorting, matching, sequencing, landmarks, gauges, ring review and SBAR replace repetitive MCQ cards. Existing v1–v3 attempts remain pinned. See the [redesign/source review](docs/redesign-v1-review.md), [student/teacher guide](docs/minigame-student-teacher-guide.md) and [test report](docs/test-report-v1.md). The sections below describe earlier editions where marked.

Four migrations and all five functions are required for connected v4 delivery. `202610070001_minigame_evidence.sql` is local only. Clinical approval, image rights and institutional Auth/cohort configuration remain necessary. Nothing in this release publishes content, enrolls learners or changes a live service. The development-only illustration review is at `/#/art`.

Current learning-quality revision: v0.9.0, content `ptd-learning-draft-2026-10-03`. The 15-decision game now records explanation-before-choice handovers, explicit corrective explanation review, contextual references and a personal evidence summary. Faculty get class priorities, enrolled participation, individual evidence, a separate manual observation rubric, three CSV exports and an anonymous printable briefing. See [educational review](docs/educational-review-v0.9.md), [teacher rubric/class guide](docs/teacher-rubric-and-class-guide.md) and [test report](docs/test-report-v0.9.md).

Apply all three local migrations in order in staging, including `202610030001_learning_reviews.sql`. Deploy all five functions: `start-attempt`, `sync-events`, `cohort-leaderboard`, `faculty-workspace`, `completion-status`. The new staff-only observation table has no learner read/write policy. Existing attempt questions/scoring remain pinned. No production configuration or clinical approval is implied by the local demo.

Current revision: v0.8.0. New attempts use three continuous patient stories, optional confidence/notes, three required handover reasons, a handover review and Finish shift. Rewards are 250 maximum / 220 when all initial mistakes are corrected; both routes unlock outfit 5. Existing attempts retain their original version. See [case review](docs/case-flow-review-v0.8.md), [reward rules](docs/reward-rules-v0.8.md) and [current test report](docs/test-report-v0.8.md).

An installable, case-based formative PWA for clinical-year students preparing for a pelvic-fracture flipped classroom. Learners choose one of four unnamed characters, move freely around an illustrated three-bed emergency room, approach fictional patients, and act as supervised junior team members. Cases activate only inside the relevant patient's interaction zone. The complete game has exactly 15 quest decisions; corrective practice stays inside its parent decision and there is no additional completion quiz. Authored feedback drives situation-specific character and patient reactions, reward points, five clothing levels and six safety badges. An English/Thai toggle localizes the learner journey while retaining familiar English clinical terms where clearer. The application is not a pre-class examination and does not certify independent trauma management or hands-on binder skill.

## Local demo

Requirements: a current Node.js release supported by the installed Vite version and npm.

```bash
cp .env.example .env
npm ci
npm run dev
```

Open the local URL shown by Vite. The default `VITE_APP_MODE=demo` is intentionally labelled and uses only fictional, device-local records. It never falls back from failed connected authentication to a privileged demo account.

Run verification:

```bash
npm test
npm run build
npm run preview
```

## Connected course setup

1. Create a separate Supabase project for each environment.
2. Apply both local migrations, in order: `202610010001_initial.sql`, then `202610020001_reward_collections.sql`. Review in staging before any production operation.
3. Deploy the authenticated functions in `supabase/functions/`.
4. Bootstrap the first administrator through an institution-controlled SQL session; never expose this operation to the browser.
5. Configure an institutional identity provider or invitation-only email authentication and its approved redirect URLs.
6. Set only these public browser values:

```text
VITE_APP_MODE=connected
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_COURSE_ID=<course UUID>
```

Supabase secret keys stay in the provider's server environment. They must never use a `VITE_` prefix. The publishable project key is intentionally public and depends on grants, RLS and server authorization.

Connected operation still requires an institution-created course, cohort, learner memberships, assigned faculty roles and a clinically approved published content version. Demo content is `draft` and must not be changed to `published` without a real reviewer and review date.

Learner performance is captured as immutable events and synchronized to the course service when connected. Authorized faculty can open the cohort dashboard and download an Excel-compatible CSV before class. The demo export is calculated only from fictional local events; it is never presented as institutional data. Automatic email delivery is not configured because it requires an approved mail provider and recipient/privacy configuration.

The end-of-quest podium compares total reward only. Connected mode obtains a pseudonymous ranking from the authenticated learner's own cohort through the protected `cohort-leaderboard` endpoint; it does not expose answers or rationales. Demo classmates are clearly labelled fictional. Deploying this endpoint and approving cohort score visibility are institutional configuration steps.

Reference cards include selected figures from the user-supplied teaching materials and direct links to local copies of all three supplied PDFs in `public/resources/`. Every card declares its source document IDs, and every displayed figure links to its source page. Supplied institutional marks and teaching figures remain permission/clinical-review pending; fictional game art is explicitly non-clinical.

## Architecture

- `src/domain`: provider- and React-independent types, validation, scoring and completion rules.
- `src/content`: versioned authored learning bundle.
- `src/storage`: account-partitioned IndexedDB event log, drafts, outbox and offline-pack state.
- `src/sync`: explicit demo and connected adapters.
- `supabase`: Postgres schema, server-enforced RLS and authenticated batch-event endpoint.
- `docs`: guides, clinical review, deployment, privacy, pilot and audit evidence.

Every response is an immutable event with an attempt ID, event ID, client sequence, content version and timestamps. Device writes store the response and its pending-upload state atomically. The server validates ownership, version, payload size, option membership and ordering; retries are idempotent and altered event IDs are rejected. Server summaries are recomputed from accepted events.

## Release boundary

This repository is ready for local demonstration and technical review. It has not been connected to an institutional identity provider, deployed, tested on real phones, clinically signed off, or used with real students. See `docs/requirements-audit.md` and `docs/test-report.md`.
