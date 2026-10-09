# Learning traceability

| Outcome | Quest decisions | Completion evidence | Resource | Automated evidence |
|---|---|---|---|---|
| O1 Recognize risk | M1N1 M1N5 | authored feedback and journey log | R2 | content and engine tests |
| O2 Assess safely | M3N1 M3N2 M3N3 | safety badges S5/S6 | R2 | safety-resolution tests |
| O3 Interpret evidence | M2N1–M2N4 | evidence-clue feedback and S4 at M2N4 | R1 R2 | content links and workflow tests |
| O4 Prioritize care | M1N2 M1N4 M1N5 M2N4 M3N3 | authored feedback and safety badges | R2 | scoring and completion tests |
| O5 Binder reasoning | M1N3 M2N4 | safety badges S2/S4 | R3 | S2 and S4 tests |
| O6 Communicate | M1N6 M2N5 M3N4 | debrief and authored feedback | R4 | immutable rationale/event tests |


## v1.1 mini-game edition (lesson-plan objectives LO1–LO7)

Each objective has ≥ 2 practice stations, one pre-test item and one post-test item. `src/content/lecture-coverage.test.ts`
checks that every lecture fact below is taught in a scored station.

| Objective | Practice stations | Pre / post item | Key lecture facts covered |
|---|---|---|---|
| LO1 Mechanism & associated injuries | C0S1 C0S2 C0S3 C0S4 C2S6 | PT1 / FS1 | APC/LC/VS force; ligament roles; associated injuries 51/48/35/26/20/16% |
| LO2 History & examination | C1S1 C3S1 C3S2 C3S3 C3S5 | PT2 / FS2 | ABCDE, AMPLE, head-to-toe; compression test once, not when unstable; PR/PV, high-riding prostate, meatal blood; L5/S1; pulses; Morel-Lavallée |
| LO3 Imaging | C2S1 C2S2 C2S3 C2S4 C2S5 C2S6 | PT3 / FS3 | AP ~90%; ring trace; straddle → posterior ring; inlet 25°/outlet 60°; Judet; CT indications; instability signs |
| LO4 Open vs closed | C3S2 C3S4 C3S6 C3S7 | PT4 / FS4 | communicating wound (external/internal), perineal wound, mortality 30–50% |
| LO5 Initial treatment | C1S2 C1S3 C1S6 C1S7 C2S5 C3S5 C3S6 C3S7 | PT5 / FS5 | shock classes; 2 large IV; 2 L crystalloid; MTP 1:1:1; ≥4 U; lethal triad; hypotension causes; 80/20 venous/arterial; flowchart; Gustilo antibiotics ≤3 h; tetanus; debridement |
| LO6 Pelvic binder | C1S3 C1S4 C1S5 | PT6 / FS6, FS8 | every suspected fracture; trochanters; legs IR + padding; sheet + clamps; dress wounds; remove <24 h |
| LO7 Referral & handover | C1S7 C2S6 C3S7 | PT7 / FS7 | SBAR; gen surg + ortho (+ urology) |

Pass standard: FS ≥ 6/8 first try and both must-pass items (FS2, FS6). The evaluation sheet is described in
`docs/google-sheet-setup.md`.
