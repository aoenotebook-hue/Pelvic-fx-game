# Collection reward scheme

Content v2 uses immutable scheme `collections-250`. Browser and server import the same provider-neutral ledger in `src/domain/rewardRules.ts`. Rewards are derived achievements, not client-submitted currency.

| Achievement ID | Points | Condition |
|---|---:|---|
| decision:node | 10 or 8 | Preferred first response plus feedback acknowledgment =10; initially incorrect, resolved same-step correction plus feedback =8 total. Required handover reason must be present. |
| case:mission | 15 | All case decisions cleared and required safety reasoning resolved, including handover. |
| safety:concept | 5 | Each of six concepts resolved once. |
| shift:complete | 25 | All three cases, six concepts and final handover review/Finish shift recorded. |

15×10 +3×15 +6×5 +25 =250. Through corrections: 15×8 +45 +30 +25 =220.

Outfits unlock at 0,40,90,150,210. Corrected learners can earn the best outfit. Confidence, notes where optional, time, speed, streaks, reference reopening and replay do not award or remove points.

First core response is immutable for scoring. Duplicate responses/retries/feedback are reduced to sets keyed by achievement. Replacing a wrong first choice with a later preferred response does not earn 10. Saved totals are recomputed from events on resume.

Original v1 attempts retain `legacy-150`, original keys, original translations and 10/5 reward scoring with 0/30/60/90/120 clothing thresholds. They are not converted. A learner can explicitly open the separate revised attempt; the original records remain in IndexedDB.

Faculty CSV separates reward total/maximum/scheme, first-correct count, corrected count and original 30-point learning score. Case stamps, safety badge IDs and clothing level are exported. Reports include content version. The leaderboard uses confirmed reporting attempts only, in the same authorized cohort, content version and reward scheme. Equal totals have shared competition ranks (1,2,2,4); speed never resolves a tie.

The demo podium has explicitly fictional classmates and is not a cohort report. Cohort score visibility requires institutional privacy approval.
