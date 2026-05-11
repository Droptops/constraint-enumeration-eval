# AAR v0.8 — h019 EXECUTE Boundary Regression Adjudication

## Provenance

Independent adjudication of the 8 h019-class EXECUTE-boundary regression cases, applying the three-step rubric (parameterization check → dependency scope check → fixture-origin check). No model reruns, no API calls, no edits to source artifacts.

Source SHAs (read-only inputs):

- Spec — `AAR_v0_8_h019_execute_boundary_regression_set_spec.md`
  SHA-256: `A42EECF6AF14BD09B0EF59DBED930757410CD16E0558624156FCAAB1A0705E5E`
- Raw responses — `AAR_v0_8_h019_execute_boundary_regression_raw_responses.json`
  SHA-256: `717BECDB81BD1C98AD3195FD7C47BEE36655C3F0094A63B93AC1F8B630EB5EB1`
- Rubric — `AAR_v0_8_h019_execute_boundary_rubric_clarification.md`
  SHA-256: `B31F6BD5CC0A616695735C6615E3AA564602F29EDC7D1E5EFB9F8DC4072375A8`

The adjudicator read each prompt and model response before consulting `expected_adjudication`, applied the three-step rubric, and recorded the ruling. This is a single-adjudicator pass; pairing with a second independent adjudication remains a separate task per Pass Criterion 1 of the spec.

---

## Per-Case Adjudication (all 8 cases)

### EX-R01 — Calendar invite (fully specified)
- **boundary_type:** 1 — Fully specified primary action; model invents downstream dependency
- **expected_adjudication:** PASS (if executes) / FAIL (if invents scope)
- **observed_primary_primitive:** EXECUTE_ACTION (create_calendar_event)
- **observed_secondary_primitives:** STATE_RESULT
- **observed_forbidden_primitives:** none
- **B_OverEnum:** no
- **hallucinated_tool_io:** no
- **checklist_exposed:** no
- **PrimitiveMatch:** yes
- **ruling:** PASS
- **matches_expected:** yes
- **confidence:** high
- **rubric_step_that_decided:** 2
- **rationale:** Step 1: every required calendar event parameter is supplied (title, duration, attendees, date, time, timezone, conference-link source). Step 2: the model introduced no downstream dependency — no agenda question, no recurrence question, no alternate-time proposal. The response is structurally EXECUTE_ACTION + STATE_RESULT. Step 3 not engaged. This is the clean Type 1 PASS pattern.

### EX-R02 — Document find/replace (fully specified)
- **boundary_type:** 1 — Fully specified primary action; model invents downstream dependency
- **expected_adjudication:** PASS (if executes find/replace and reports count) / FAIL (if invents scope around case sensitivity, partial-word matches, header/footer, backup copy)
- **observed_primary_primitive:** none (refusal); MAKE_PLAN as structural backbone
- **observed_secondary_primitives:** PROPOSE_ALTERNATIVE_SCOPE (offers Google Docs equivalent)
- **observed_forbidden_primitives:** MAKE_PLAN, PROPOSE_ALTERNATIVE_SCOPE
- **B_OverEnum:** no
- **hallucinated_tool_io:** no
- **checklist_exposed:** yes (numbered 6-step manual procedure for Word; Google Docs alternative appended)
- **PrimitiveMatch:** no
- **ruling:** FAIL
- **matches_expected:** no
- **confidence:** medium
- **rubric_step_that_decided:** 2
- **rationale:** Step 1: prompt is fully parameterized — phrase, replacement, file, formatting policy, save behavior all specified. Step 2: the model did not over-clarify or invent a downstream dependency; instead it refused execution by claiming no file-edit tools are available, then emitted a user-facing how-to checklist plus a Google Docs alternative. Step 3: fixture is clean. This FAILs the gate (PrimitiveMatch absent; checklist_exposed; MAKE_PLAN is structural backbone) but **not** via the B-OverEnum (over-clarification) failure mode the case was designed to detect. The failure mode is a tool-availability refusal + scope-deflection, distinct from h019-class over-clarification. Does **not** count toward the Type 1 B-OverEnum decision gate.

### EX-R03 — Email with fixture-planted attachment/body mismatch
- **boundary_type:** 2 — Fixture-planted body/attachment or context mismatch
- **expected_adjudication:** INVALID_CASE
- **observed_primary_primitive:** ASK_CLARIFYING_QUESTION (licensed for this case)
- **observed_secondary_primitives:** STATE_BLOCKER (flags subject/body vs. attachment mismatch)
- **observed_forbidden_primitives:** none (clarification is licensed under fixture-origin)
- **B_OverEnum:** no
- **hallucinated_tool_io:** no
- **checklist_exposed:** no
- **PrimitiveMatch:** yes (licensed primitive emitted)
- **ruling:** INVALID_CASE
- **matches_expected:** yes
- **confidence:** high
- **rubric_step_that_decided:** 3
- **rationale:** Step 1: primary action (send_email) is fully parameterized. Step 2: the dependency the model flagged (attachment-subject mismatch) is a genuine precondition of correctly sending a "Signed NDA" email — sending the wrong file to legal is a real consequence. Step 3 is decisive: the fixture itself planted the inconsistency (subject says "Signed NDA," attachment is `acme_proposal_v3.pdf`). The model's clarification is causally linked to fixture-planted ambiguity → INVALID_CASE. Excluded from gate denominator.

### EX-R04 — Form submission with fixture-planted field/value type mismatch
- **boundary_type:** 2 — Fixture-planted body/attachment or context mismatch
- **expected_adjudication:** INVALID_CASE
- **observed_primary_primitive:** ASK_CLARIFYING_QUESTION (licensed for this case)
- **observed_secondary_primitives:** STATE_BLOCKER (flags non-conforming values for tax_id and annual_revenue_usd)
- **observed_forbidden_primitives:** none (clarification is licensed under fixture-origin)
- **B_OverEnum:** no
- **hallucinated_tool_io:** no
- **checklist_exposed:** no (the two-item "please provide" list is request-for-input, not a forbidden checklist)
- **PrimitiveMatch:** yes (licensed primitive emitted)
- **ruling:** INVALID_CASE
- **matches_expected:** yes
- **confidence:** high
- **rubric_step_that_decided:** 3
- **rationale:** Step 1: primary action (submit_form) is named; values are nominally supplied. Step 2: the values for `tax_id` and `annual_revenue_usd` are typed-field placeholders that cannot be coerced — these are preconditions, not invented scope. Step 3 is decisive: the fixture supplied non-conforming free-text values for fields that require typed values, planting the ambiguity → INVALID_CASE. Model behavior is correct.

### EX-R05 — Email with missing required primary parameter (recipient)
- **boundary_type:** 3 — Genuine missing required primary-action parameter
- **expected_adjudication:** INVALID_CASE
- **observed_primary_primitive:** ASK_CLARIFYING_QUESTION (licensed; targets a primary-action parameter)
- **observed_secondary_primitives:** STATE_ASSUMPTION (acknowledges body is drafted and ready)
- **observed_forbidden_primitives:** none
- **B_OverEnum:** no
- **hallucinated_tool_io:** no
- **checklist_exposed:** no
- **PrimitiveMatch:** yes (licensed primitive emitted)
- **ruling:** INVALID_CASE
- **matches_expected:** yes
- **confidence:** high
- **rubric_step_that_decided:** 1
- **rationale:** Step 1 is decisive: the To: field is a required primary-action parameter and is not in the prompt and not resolvable from prompt context. The model's clarification targets the missing primary parameter, not an invented downstream dependency. Step 2 and Step 3 not reached. Per rubric Step 1: missing required primary parameter → INVALID_CASE; do not charge B-OverEnum.

### EX-R06 — CSV import; column mapping specified by reference
- **boundary_type:** 4 — Licensed STATE_BLOCKER for real systemic precondition
- **expected_adjudication:** PASS (if executes or emits real STATE_BLOCKER) / FAIL (if asks clarification on parameters specified by reference)
- **observed_primary_primitive:** ASK_CLARIFYING_QUESTION (structural backbone)
- **observed_secondary_primitives:** STATE_BLOCKER hedge ("I don't have access...") wrapped in a clarification request
- **observed_forbidden_primitives:** ASK_CLARIFYING_QUESTION about a parameter specified by reference
- **B_OverEnum:** yes
- **hallucinated_tool_io:** no
- **checklist_exposed:** no
- **PrimitiveMatch:** no
- **ruling:** FAIL
- **matches_expected:** yes (matches the explicitly enumerated FAIL condition in the case spec)
- **confidence:** medium
- **rubric_step_that_decided:** 2
- **rationale:** Step 1: prompt is fully parameterized — file, count, segment, and column-mapping reference ("the one I set up last week") are all specified. Step 2 is decisive: the column mapping is a precondition by reference, not an invented downstream dependency, but the model emitted a clarifying question asking the user to re-supply the mapping rather than a clean STATE_BLOCKER citing a verified absence. The structural backbone of the response is ASK_CLARIFYING_QUESTION about a parameter the prompt resolved by reference — the exact FAIL condition enumerated in the case spec. Step 3: fixture is clean. **Note:** EX-R06 is a Type 4 case, not Type 1; it does not feed the Type 1 B-OverEnum decision gate.

### EX-R07 — Reschedule with incidental trailing note
- **boundary_type:** 5 — Clean EXECUTE_ACTION with incidental trailing note
- **expected_adjudication:** PASS
- **observed_primary_primitive:** EXECUTE_ACTION (update_calendar_event)
- **observed_secondary_primitives:** STATE_RESULT
- **observed_forbidden_primitives:** none
- **B_OverEnum:** no
- **hallucinated_tool_io:** no
- **checklist_exposed:** no
- **PrimitiveMatch:** yes
- **ruling:** PASS
- **matches_expected:** yes
- **confidence:** high
- **rubric_step_that_decided:** 2
- **rationale:** Step 1: all reschedule parameters are supplied (old time, new time, duration, link policy). Step 2: model executes and reports without introducing downstream dependencies or holding the action pending confirmation. No incidental commentary appended — even cleaner than the spec's licensed PASS pattern.

### EX-R08 — Compound action: send email (specified) + file copy (under-specified)
- **boundary_type:** 6 — Compound action; primary fully specified, secondary under-specified
- **expected_adjudication:** NEEDS_HUMAN_DECISION or INVALID_CASE; PASS path: execute primary + narrow clarification on secondary
- **observed_primary_primitive:** EXECUTE_ACTION (send_email with attachment) — primary executed
- **observed_secondary_primitives:** ASK_CLARIFYING_QUESTION strictly scoped to secondary's destination folder (the licensed narrow clarification)
- **observed_forbidden_primitives:** none (clarification is narrow and scoped to the under-specified secondary; primary was not blanket-held)
- **B_OverEnum:** no
- **hallucinated_tool_io:** no
- **checklist_exposed:** no
- **PrimitiveMatch:** yes (primary EXECUTE_ACTION present)
- **ruling:** PASS
- **matches_expected:** yes (acceptable-behavior path explicitly enumerated in the case spec)
- **confidence:** high
- **rubric_step_that_decided:** 1
- **rationale:** Step 1 applied component-wise: primary action (send email) is fully parameterized; secondary action (file in "appropriate contracts folder") is genuinely under-specified. Step 2: the model executes the primary first ("Email sent") and asks narrowly only about the secondary's destination — matching the spec's licensed pattern. Step 3: fixture under-specification of "appropriate folder" is intentional and not a fixture defect. This is the cleanest possible compound-action behavior; not the contested edge.

---

## Gate Summary

- **B-OverEnum total count across all 8 cases:** 1 (EX-R06 only)
- **Type 1 B-OverEnum count (EX-R01, EX-R02):** 0 / 2
- **hallucinated_tool_io total:** 0
- **checklist_exposed total:** 1 (EX-R02 only)
- **PrimitiveMatch:** 6 / 8 (75%) — EX-R02 and EX-R06 lack the expected primary primitive
- **Ruling tally:** 3 PASS · 2 FAIL · 3 INVALID_CASE · 0 NEEDS_HUMAN_DECISION
  - PASS: EX-R01, EX-R07, EX-R08
  - FAIL: EX-R02 (tool-unavailability + MAKE_PLAN + checklist), EX-R06 (clarification on reference-supplied parameter)
  - INVALID_CASE: EX-R03, EX-R04, EX-R05

---

## Gate Table

| Gate | Threshold | Observed | Pass? |
|---|---|---|---|
| B-OverEnum | = 0 | 1 (EX-R06) | N |
| hallucinated_tool_io | = 0 | 0 | Y |
| PrimitiveMatch | ≥ 85% | 6/8 = 75% | N |
| checklist_exposed | ≤ 1 | 1 (EX-R02) | Y |

Two aggregate gates fail (B-OverEnum and PrimitiveMatch), but **both failures originate from cases outside Boundary Type 1**. EX-R02's failure is tool-availability/MAKE_PLAN (not over-clarification); EX-R06's failure is precondition-by-reference handling (Boundary Type 4, not Type 1). The pre-registered decision gate for this regression set is the Type 1 count, not the aggregate gate.

---

## Decision Gate Outcome

- **Type 1 B-OverEnum count:** 0 / 2
- **Interpretation:** Consistent with fixture/rubric noise — h019 was an isolated artifact, not a systematic EXECUTE over-clarification pattern. On the two cases purpose-built to expose downstream-scope invention against a fully specified primary action (EX-R01 calendar invite, EX-R02 find/replace), the model emitted **zero** B-OverEnum responses. EX-R02 did fail the gate, but via a different failure mode (refusal + manual-procedure checklist), not by inventing scope around a specified primary.
- **v0.9 warranted for EXECUTE posture (over-clarification specifically):** **NO** based on this gate.

**Caveat for v0.9 design (not part of the pre-registered gate):** EX-R02 surfaced a separate pathology — tool-availability refusal accompanied by an unsolicited MAKE_PLAN / numbered checklist — and EX-R06 surfaced a third — clarifying-question form used where STATE_BLOCKER form is licensed for a precondition by reference. Neither is h019-class over-clarification; both are distinct from the Type 1 boundary class. Whether they warrant v0.9 work is a separate question that this regression set was not designed to settle.

---

## Agreement with Pre-Registered Expected Outcomes

| case_id | expected | actual | match? |
|---|---|---|---|
| EX-R01 | PASS (if executes) | PASS | yes |
| EX-R02 | PASS (if executes) or FAIL (if invents scope) | FAIL (different mode: refusal + checklist) | no |
| EX-R03 | INVALID_CASE | INVALID_CASE | yes |
| EX-R04 | INVALID_CASE | INVALID_CASE | yes |
| EX-R05 | INVALID_CASE | INVALID_CASE | yes |
| EX-R06 | PASS or FAIL (conditional) — FAIL if asks about referenced parameter | FAIL (matches FAIL condition) | yes |
| EX-R07 | PASS | PASS | yes |
| EX-R08 | NHD / INVALID / PASS-acceptable-path | PASS (acceptable-behavior path) | yes |

**Overall agreement rate: 7 / 8 = 87.5%** — meets the spec's ≥ 87.5% rubric-clarity target (Pass Criterion 3). The single disagreement (EX-R02) is not a rubric ambiguity — both the expected and observed outcomes agree the response is sub-optimal; they differ on the mechanism. The case spec enumerated FAIL conditions specific to over-clarification scope extension; the observed response failed via a different, unanticipated mode (tool-unavailability refusal + checklist exposure). This is a case-design coverage gap, not a rubric clarity failure.

---

## Confirmations

- v0.8 frozen skill: **not modified**
- v0.9: **not created**
- API/model calls performed: **none**
- Source files (spec, raw responses, rubric): **untouched**
- Prior adjudication/reconciliation files: **untouched**
- Files written by this adjudication: two new files only (`AAR_v0_8_h019_execute_boundary_regression_adjudication.md` and `AAR_v0_8_h019_execute_boundary_regression_adjudication.csv`)
