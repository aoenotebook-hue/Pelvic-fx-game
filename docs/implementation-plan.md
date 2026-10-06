# Implementation plan

## Assumptions

- The repository was empty, so the requested React, TypeScript and Vite direction was retained.
- No approved diagnostic images were supplied. Mission 2 uses the complete textual imaging case; no synthetic radiographs were created.
- Course dates, links, facilitator contacts, privacy notice, retention decision and published version remain unset.
- English is the only implemented clinical language. The UI and content identifiers support a future reviewed Thai bundle, but no machine-translated clinical content is included.
- The local demo uses a single fictional learner and computes every visible metric from actual local events.

## Phases

1. Define validated provider-neutral types, content and deterministic rules.
2. Encode exactly 15 quest decisions, one same-step correction for each decision and five resources; integrate all six safety concepts into the quest route.
3. Build the complete learner journey, character reactions, feedback, same-step correction, debrief, progress and receipt states.
4. Add explicit offline pack, IndexedDB resume, outbox and PWA installation/update behavior.
5. Add Supabase schema, server authorization, authenticated event sync and server recomputation.
6. Add faculty aggregate, learner chronology, teacher review, guarded CSV and content/course review.
7. Verify content, rules, storage and interface journeys; record pending real-device checks.
8. Audit clinical fidelity and produce traceability, review and pilot artifacts.
9. Package setup, learner, educator, author, privacy and deployment guidance.
10. Run the evidence-based final audit and repair confirmed defects.
