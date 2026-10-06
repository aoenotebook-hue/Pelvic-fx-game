# Architecture decision record 001

## Decision

Use React and TypeScript with Vite, `vite-plugin-pwa`, native IndexedDB through `idb`, Zod validation, and optional Supabase Auth Postgres and Edge Functions.

The case engine, content schema and server rule summary are plain TypeScript without React or Supabase dependencies. The browser stores immutable events by account and attempt. Supabase is an adapter around the same stable content IDs and rules.

## Why

This keeps a small, testable domain core; supports a fully usable offline demonstration; prevents provider-specific logic from becoming the clinical content model; and makes authorization enforceable in database policies and authenticated functions.

## Consequences

Clinical content remains reviewable as structured data. Device completion is provisional until a server acknowledgement exists. Offline answer content is inspectable by a technically capable learner, so this app remains formative rather than a secure examination system.
