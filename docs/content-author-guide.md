# Content author guide

For v0.8, revise all English/Thai copies together in `content.v2.ts`. Node metadata now includes `scenePhase`, `interaction`, `rationaleRequired` and `visuals` with question/feedback placement and teaching-example role. Only handovers require reasons; confidence is optional. Version-tag missions/resources/corrections as well as nodes. Register new versions without editing the original bundle; update the provider-neutral server keys and cross-check tests. Future reward-rule changes require a new scheme identifier, not modification of `collections-250` for saved attempts.

Content lives in `src/content/content.v1.ts` and is validated by `src/domain/schema.ts`. Stable IDs, not displayed letters, control scoring.

Each node includes case and version IDs, outcomes, concepts, safety flag, current evidence, vitals, optional asset, text alternative, question, stable options, key, response mode, rationale prompt, confidence options, accepted conditions, resources, references, retry and next node. Governance retains author, reviewer, dates, status and superseded version. Unknown reviewers remain null.

For each distractor, explain its specific reasoning problem. Do not use generic “incorrect” feedback. Do not add radiographic findings, drug doses, definitive surgical algorithms, outcome simulations or unrestricted AI feedback. Context-dependent pathways must state physiology and available resources.

Published content is immutable. Copy it to a new draft, update the version, run `npm run validate:content`, obtain clinical review, then record the real reviewer and date. A text-only case is valid. An image cannot publish until source, permission, deidentification, alt text and clinical review are complete.

The asset register is in the content bundle. A01–A09 are intentionally absent with complete text alternatives; A10 is the original neutral app mark; A11, A18 and A19 are original decorative learner characters; A12 and A13 are institutional marks cropped from the supplied slide deck; A14–A17 are selected supplied teaching figures; A20–A23 are fictional patient/game-environment art. Supplied institutional and teaching images remain `pending` until clinical review and reuse permission are recorded.
