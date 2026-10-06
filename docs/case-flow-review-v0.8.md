# Question-by-question clinical review — v0.8 draft

Content: `ptd-caseflow-draft-2026-10-02`. Rewards: `collections-250` (immutable first collection scheme). All English/Thai stems, choices, preferred explanations, alternatives and corrective items are authored together in `src/content/content.v2.ts`; translations are selected by version, not substituted into legacy attempts.

These are formative supervised-team prompts, not independent treatment instructions. Fictional case facts come from the supplied coding requirements, not the illustrative PDF patients. The text AP report is authoritative for patient 2. No additional radiographic finding, dose, operative algorithm or patient-outcome model has been added.

Source abbreviations: S = supplied 2024 medical-student slides; H = supplied Thai teaching handout. Page numbers below are PDF page numbers (including cover). The teaching plan and requirements seed define the supervised role, classroom separation and handover outcomes.

| Order / node | Team decision and preferred action | Correction within the same decision | Sources / figures |
|---|---|---|---|
| 1 / M1N1 | Recognize possible major haemorrhage from the stated physiology; request urgent team assessment. B | Do not wait for a fracture label to escalate recurrent compromise. C | Seed patient 1; S21–25; H8–11,20 |
| 2 / M1N2 | Communicate priorities while assessment/resuscitation continue in parallel. C | Coordinate urgent care, examination and senior communication. A | S21,23–26; H8–11,20 |
| 3 / M1N3 | Identify greater-trochanter binder landmark and request skilled review of high placement. A | Escalate correction of the high binder while urgent care continues. B | H17 Figure 12, H18; S32–34. Manikin photograph during question |
| 4 / M1N5 | Report brief BP rise followed by recurrent fall as a transient response requiring reassessment. C | A temporary rise does not establish controlled bleeding. A | Seed supplied trend; S23–25; H20 |
| 5 / M1N4 | Discuss continued resuscitation and urgent haemorrhage-control planning in the stated remote-CT setting. A | Imaging timing depends on physiology, response and safe capability. C | Seed CT setting; S21–25,31,38; H15–16,20 |
| 6 / M1N6 | Lead urgent handover with recurrent hypotension and request review; add brief reason/uncertainty. B | Add physiological trend, actions, response and urgent request. A | Seed O6/R4; S21–26; teaching plan communication outcome |
| 7 / M2N1 | Establish image quality, orientation and binder already documented at arrival. A | Clarify image context before interpretation/classification. B | Seed patient 2; S14; H11–16. AP-review figure in feedback |
| 8 / M2N2 | Review anterior injury and posterior-region concern together. B | Keep sacroiliac-region asymmetry and posterior pain in the assessment. C | Seed fictional report; S4–5,14–19; H1–7,11–16. Anatomy during question, AP review in feedback |
| 9 / M2N3 | Separate current physiological stability from unresolved mechanical stability. C | Structural stability still needs evidence despite normal BP. A | Seed BP122/76; S5,8,13; H1–7. Ligament figure in feedback |
| 10 / M2N4 | Request further imaging/senior reassessment and an agreed binder-removal plan. B | Do not assume a binder-on reassuring image completes reassessment. C | Seed S4; S14–19,32–34; H15–18; BOAST discrepancy below |
| 11 / M2N5 | Explain known ring evidence, binder context and unresolved stability in handover; brief reason required. C | Communicate findings plus uncertainty and requested review. B | Seed O6/R4; S14–19; H11–18 |
| 12 / M3N1 | Recognize wound finding as possible open injury and escalate, without claiming proven communication. A | Maintain suspicion and request senior wound assessment. C | Seed patient 3; S11,27,29; H18–19. Associated-injury anatomy in feedback |
| 13 / M3N2 | When meatal bleeding is revealed, raise suspected urethral injury and seek senior-led assessment before student-led catheterization. C | Avoid an independent procedure; request the urinary assessment plan. A | Seed S5; S11,27,49; H8–11; BOAST urological nuance below. Anatomy in feedback |
| 14 / M3N3 | Coordinate trauma, wound and urinary concerns through the senior team. B | Keep parallel concerns and responsibilities explicit. C | S11–12,21,27,29; H8–11,18–20. Anatomy during question |
| 15 / M3N4 | Handover suspected open/urinary injury and uncertainty without claiming confirmed diagnosis; brief reason required. A | Distinguish observed findings from suspected injury. B | Seed O6/R4; S11,27,29,49; H18–20 |

Three choices address each same decision; key positions are balanced (5 A, 5 B, 5 C). Corrective keys differ and all 15 retries have their own authored English/Thai feedback. No extra decision is introduced by the final handover review or Finish shift.

## Clinical discrepancy requiring educator resolution

H18 permits immediate binder release after a negative pelvic AP, with specialist discussion if uncertain. This is not reproduced as the game's decision rule. The seed's supervised reassessment is retained: a binder can mask injury, and removal requires an agreed senior/local plan. [BOAST pelvic-fracture guidance, standards 7–8](https://www.boa.ac.uk/resource/boast-3-pdf.html), checked 2 October 2026, supports post-binder reassessment after resuscitation and a network removal protocol. The exact institutional pathway and timing require clinical sign-off; the game does not provide an independent removal procedure.

For M3N2, the teaching point is the student's supervised boundary, not an absolute prohibition for all clinicians. [BOAST urological-trauma guidance](https://www.boa.ac.uk/resource/boast-14-pdf.html), checked 2 October 2026, permits a carefully bounded catheterization attempt by an experienced doctor. No catheter size, dose, procedural technique or definitive diagnosis is taught here.

## Figure and artwork review

- H17 Figure 12 is the actual embedded training-manikin photograph, not a photograph of this fictional patient. Its landmark interpretation is the decision, so it appears during M1N3.
- S14 AP-review figure illustrates a systematic review. Answer-revealing labels appear in feedback, not as diagnostic evidence for the fictional report.
- S5 ligament figure appears in M2N3 feedback; S11 anatomy is used in associated-injury teaching. Existing S4 anatomy is reused during ring review.
- Each teaching figure has accessible descriptive text, a source-page link, a native enlargement dialog and a teaching-example label. No diagnostic image was generated.
- The old A16 caption is corrected only in v2: supplied stabilization illustrations are not a validated incorrect-versus-correct landmark comparison.
- New decorative patients are awake, supported on complete wheeled beds, dressed and covered; patient 3 is an adult man. Their clinical state does not depend on answers. Learner movement/reactions communicate urgency, observation, communication, reconsideration or learning celebration.
- [Patient-art prompts and selected asset paths](patient-art-prompts-v0.8.md) record generation provenance. Extracted teaching figures use the unchanged supplied PDFs, not generated diagnostic images.

## Approval checklist

- [ ] Verify every English and Thai stem, choice, explanation and correction against the seed and local teaching objectives.
- [ ] Confirm transient-response/imaging sequence and binder-at-arrival continuity.
- [ ] Resolve H18/BOAST/local binder pathway discrepancy explicitly.
- [ ] Approve supervised urinary wording and distinguish suspected from proven injury.
- [ ] Approve source figure clarity, image permissions and institutional marks.
- [ ] Review each patient/learner pose for supported positioning and respectful portrayal.
- [ ] Obtain reviewer identity, review date and institutional permission before publishing a new content version.
