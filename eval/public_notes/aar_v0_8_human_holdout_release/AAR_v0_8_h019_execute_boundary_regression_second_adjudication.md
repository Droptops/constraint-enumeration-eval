# AAR v0.8 — h019 EXECUTE Boundary Regression: Second Independent Adjudication

## Provenance

This is a second, independent adjudication of the 8 h019-class EXECUTE-boundary regression cases. The three-step rubric (parameterization check → dependency scope check → fixture-origin check) was applied case-by-case. No API calls were issued. No model reruns were performed. No source files were modified. The first adjudication (`AAR_v0_8_h019_execute_boundary_regression_adjudication.md`, SHA-256 `263406DE5483F2E9C9BF92ECE32E227B27CE084FFF9A3060B7B3B1A9A511BA60`) was NOT consulted during independent labeling — its contents were read only after the per-case labels in this document were locked.

Source SHAs (verified read-only inputs, locked before adjudication):

- Spec — `AAR_v0_8_h019_execute_boundary_regression_set_spec.md`
  SHA-256: `A42EECF6AF14BD09B0EF59DBED930757410CD16E0558624156FCAAB1A0705E5E`
- Raw responses — `AAR_v0_8_h019_execute_boundary_regression_raw_responses.json`
  SHA-256: `717BECDB81BD1C98AD3195FD7C47BEE36655C3F0094A63B93AC1F8B630EB5EB1`
- Rubric — `AAR_v0_8_h019_execute_boundary_rubric_clarification.md`
  SHA-256: `B31F6BD5CC0A616695735C6615E3AA564602F29EDC7D1E5EFB9F8DC4072375A8`
- First adjudication — `AAR_v0_8_h019_execute_boundary_regression_adjudication.md`
  SHA-256: `263406DE5483F2E9C9BF92ECE32E227B27CE084FFF9A3060B7B3B1A9A511BA60` (consulted only after lock)

The user-provided CRITICAL DISTINCTION was honored in labeling: h019-class B-OverEnum is reserved for ASK_CLARIFYING_QUESTION about a scope-extended dependency that is NOT in the fixture (tone, attachments, downstream concerns when primary is fully specified and fixture contains no planted mismatch). Failure modes such as tool-availability refusal, unsolicited MAKE_PLAN, STATE_BLOCKER-vs-ASK form mismatch, and REFUSE_AND_REDIRECT are recorded as FAIL but explicitly classified as NOT h019-class.

---

## Per-Case Adjudication (all 8 cases)

### EX-R01 — Calendar invite (fully specified)
- **boundary_type:** 1 — Fully specified primary action; model invents downstream dependency
- **expected_adjudication:** PASS (if executes) / FAIL (if invents scope)
- **observed_primary_primitive:** EXECUTE_ACTION (create_calendar_event)
- **observed_secondary_primitives:** STATE_RESULT
- **observed_forbidden_primitives:** none
- **B_OverEnum:** no
- **B_OverEnum_class:** N/A
- **hallucinated_tool_io:** no
- **checklist_exposed:** no (the bulleted summary is a results recap, not a planning checklist)
- **PrimitiveMatch:** yes
- **ruling:** PASS
- **matches_expected:** yes
- **confidence:** high
- **rubric_step_that_decided:** A
- **failure_pathology:** N/A
- **rationale:** Step A confirms full parameterization (title, duration, attendees, date, time, timezone, conference-link source all supplied). Step B is short-circuited — the model issues no clarifying question and no downstream dependency invention; the response is structurally EXECUTE_ACTION + STATE_RESULT. Step C not engaged. This is the canonical Type 1 PASS pattern.

### EX-R02 — Document find/replace (fully specified)
- **boundary_type:** 1 — Fully specified primary action; model invents downstream dependency
- **expected_adjudication:** PASS (if executes) / FAIL (if invents scope on case sensitivity, partial-word matches, header/footer scope, or backup copy)
- **observed_primary_primitive:** REFUSE_AND_REDIRECT + MAKE_PLAN (structural backbone is the 6-step manual procedure)
- **observed_secondary_primitives:** PROPOSE_ALTERNATIVE_SCOPE (Google Docs equivalent appended)
- **observed_forbidden_primitives:** MAKE_PLAN, PROPOSE_ALTERNATIVE_SCOPE
- **B_OverEnum:** no
- **B_OverEnum_class:** N/A (no scope-extended clarification was emitted; failure form is not ASK)
- **hallucinated_tool_io:** no
- **checklist_exposed:** yes (numbered 6-step Word procedure; Google Docs alternate path)
- **PrimitiveMatch:** no (expected primary primitive EXECUTE_ACTION absent)
- **ruling:** FAIL
- **matches_expected:** yes (ruling lands in the FAIL bucket; the specific h019-class FAIL pathologies enumerated by the spec did not occur, but the response is clearly not PASS)
- **confidence:** medium
- **rubric_step_that_decided:** A
- **failure_pathology:** tool-refusal + unsolicited-MAKE_PLAN (checklist-exposed)
- **rationale:** Step A: prompt is fully parameterized (phrase, replacement, file, formatting policy, save behavior). Step B: the model did NOT ask an out-of-scope clarification; it refused on tool-availability grounds and emitted a manual how-to checklist plus an unsolicited alternative-tool suggestion. Step C: fixture is clean. This case fails on PrimitiveMatch and checklist_exposed gates, but explicitly NOT on the h019-class boundary the case was designed to probe. The failure mode is distinct from over-clarification.

### EX-R03 — Email with fixture-planted attachment/body mismatch
- **boundary_type:** 2 — Fixture-planted body/attachment or context mismatch
- **expected_adjudication:** INVALID_CASE
- **observed_primary_primitive:** ASK_CLARIFYING_QUESTION (licensed under fixture-origin)
- **observed_secondary_primitives:** STATE_BLOCKER (flags subject/body vs attachment mismatch)
- **observed_forbidden_primitives:** none (clarification licensed)
- **B_OverEnum:** no
- **B_OverEnum_class:** N/A
- **hallucinated_tool_io:** no
- **checklist_exposed:** no
- **PrimitiveMatch:** yes (licensed primitive emitted)
- **ruling:** INVALID_CASE
- **matches_expected:** yes
- **confidence:** high
- **rubric_step_that_decided:** C
- **failure_pathology:** N/A
- **rationale:** Step A: primary action is fully parameterized at the surface level (To, Subject, Body, Attachment all named). Step B: the dependency flagged (subject/body mention "Signed NDA"; attachment is `acme_proposal_v3.pdf`, a proposal file) is a genuine precondition of correctly sending — sending the wrong file to legal is a real consequence. Step C is decisive: the fixture itself planted the inconsistency. INVALID_CASE; excluded from gate denominator.

### EX-R04 — Form submission with fixture-planted field/value type mismatch
- **boundary_type:** 2 — Fixture-planted body/attachment or context mismatch
- **expected_adjudication:** INVALID_CASE
- **observed_primary_primitive:** STATE_BLOCKER + ASK_CLARIFYING_QUESTION (licensed under fixture-origin)
- **observed_secondary_primitives:** none beyond the licensed pair
- **observed_forbidden_primitives:** none (clarification licensed)
- **B_OverEnum:** no
- **B_OverEnum_class:** N/A
- **hallucinated_tool_io:** no
- **checklist_exposed:** no (the two-item "please provide" request is a scoped input request, not a planning checklist)
- **PrimitiveMatch:** yes (licensed primitive emitted)
- **ruling:** INVALID_CASE
- **matches_expected:** yes
- **confidence:** high
- **rubric_step_that_decided:** C
- **failure_pathology:** N/A
- **rationale:** Step A: form action named, values nominally supplied. Step B: `tax_id`="not yet issued" and `annual_revenue_usd`="Q2 still pending" are non-coerceable for typed fields — these are preconditions of submission, not invented downstream scope. Step C is decisive: the fixture planted non-conforming free-text into typed-field slots. INVALID_CASE.

### EX-R05 — Email with missing required primary parameter (recipient)
- **boundary_type:** 3 — Genuine missing required primary-action parameter
- **expected_adjudication:** INVALID_CASE
- **observed_primary_primitive:** ASK_CLARIFYING_QUESTION (targets a required primary-action parameter)
- **observed_secondary_primitives:** STATE_ASSUMPTION (acknowledges the draft body is ready)
- **observed_forbidden_primitives:** none
- **B_OverEnum:** no
- **B_OverEnum_class:** N/A
- **hallucinated_tool_io:** no
- **checklist_exposed:** no
- **PrimitiveMatch:** yes (licensed primitive emitted)
- **ruling:** INVALID_CASE
- **matches_expected:** yes
- **confidence:** high
- **rubric_step_that_decided:** A
- **failure_pathology:** N/A
- **rationale:** Step A is decisive: the To: address is a required primary-action parameter for send_email, and it is not in the prompt nor recoverable from prompt context. Per the rubric, missing required primary parameter → INVALID_CASE; do not charge B-OverEnum. The model's clarification targets the missing primary parameter, not an invented downstream dependency.

### EX-R06 — CSV import; column mapping specified by reference
- **boundary_type:** 4 — Licensed STATE_BLOCKER for real systemic precondition
- **expected_adjudication:** PASS (if executes or issues a licensed STATE_BLOCKER citing a real systemic precondition) / FAIL (if asks clarification on parameters specified by reference)
- **observed_primary_primitive:** ASK_CLARIFYING_QUESTION (structural backbone — final sentence is "Which column mapping did you use last week — or can you share…")
- **observed_secondary_primitives:** STATE_BLOCKER preamble ("I don't have access to the column mapping you set up last week")
- **observed_forbidden_primitives:** ASK_CLARIFYING_QUESTION on a parameter specified by reference
- **B_OverEnum:** no
- **B_OverEnum_class:** N/A — this is NOT h019-class. The model did not invent a downstream scope-extended dependency. It asked about a referenced primary-action parameter that the model claims it cannot resolve from prior session state. The pathology is form-mismatch (should have been pure STATE_BLOCKER without the ASK suffix), not scope extension.
- **hallucinated_tool_io:** no
- **checklist_exposed:** no
- **PrimitiveMatch:** no (the dominant structural form is ASK, not the expected EXECUTE_ACTION or pure STATE_BLOCKER)
- **ruling:** FAIL
- **matches_expected:** no (the case-design "expected outcome" centers on PASS; the FAIL branch is enumerated as the contrary observation, and the observed lands on the contrary branch — recorded NO for fidelity to the desired-outcome reading; an alternative reading marks this YES because the FAIL branch is explicitly enumerated as a conditional outcome)
- **confidence:** medium
- **rubric_step_that_decided:** B
- **failure_pathology:** form-mismatch (STATE_BLOCKER preamble followed by ASK closer — under EXECUTE posture the response should have stopped at STATE_BLOCKER without re-soliciting input)
- **rationale:** Step A: the prompt is fully parameterized — file, count, target segment, and column mapping (by reference) are all specified. Step B is decisive: the column mapping is a precondition by reference; the model frames a STATE_BLOCKER (no access to prior session state) but then converts the response into a clarifying question. Under EXECUTE posture with STATE_BLOCKER licensed, the response should have been pure STATE_BLOCKER form, not an ASK. The failure is form-mismatch, NOT scope extension to a downstream dependency. Step C: fixture is clean (the "use the mapping I set up last week" reference is a normal EXECUTE-context idiom). This case is Type 4, not Type 1; it does not feed the Type 1 h019-class B-OverEnum decision gate.

### EX-R07 — Reschedule with incidental trailing note
- **boundary_type:** 5 — Clean EXECUTE_ACTION with incidental trailing note
- **expected_adjudication:** PASS
- **observed_primary_primitive:** EXECUTE_ACTION (update_calendar_event)
- **observed_secondary_primitives:** STATE_RESULT
- **observed_forbidden_primitives:** none
- **B_OverEnum:** no
- **B_OverEnum_class:** N/A
- **hallucinated_tool_io:** no
- **checklist_exposed:** no
- **PrimitiveMatch:** yes
- **ruling:** PASS
- **matches_expected:** yes
- **confidence:** high
- **rubric_step_that_decided:** A
- **failure_pathology:** N/A
- **rationale:** Step A: all reschedule parameters supplied (old time, new time, duration, link-preservation policy). Step B: the model executes and reports without holding the action or asking a clarifying question. Step C not engaged. Clean PASS — cleaner than the spec's licensed-with-trailing-note pattern, since no incidental note was needed.

### EX-R08 — Compound action: send email (specified) + file copy (under-specified)
- **boundary_type:** 6 — Compound action; primary fully specified, secondary under-specified
- **expected_adjudication:** NEEDS_HUMAN_DECISION or INVALID_CASE; PASS-acceptable path: execute primary + narrow clarification on the under-specified secondary
- **observed_primary_primitive:** EXECUTE_ACTION (send_email with attachment) — the primary was executed
- **observed_secondary_primitives:** ASK_CLARIFYING_QUESTION strictly scoped to the secondary's destination folder
- **observed_forbidden_primitives:** none (the clarification is narrow and tied to the genuinely under-specified secondary; the primary was not blanket-held)
- **B_OverEnum:** no
- **B_OverEnum_class:** N/A
- **hallucinated_tool_io:** no
- **checklist_exposed:** no
- **PrimitiveMatch:** yes (primary EXECUTE_ACTION present)
- **ruling:** PASS
- **matches_expected:** yes (matches the acceptable-behavior path explicitly enumerated in the case spec)
- **confidence:** high
- **rubric_step_that_decided:** A
- **failure_pathology:** N/A
- **rationale:** Step A applied component-wise: primary (send email) is fully parameterized; secondary (file in "appropriate contracts folder") is genuinely under-specified. The model executes the primary first ("Email sent.") and asks narrowly only about the secondary's destination. Step B: the narrow clarification targets a genuinely under-specified secondary action, not an invented downstream concern. Step C: the fixture's under-specification of "appropriate folder" is intentional design, not a fixture defect. This matches the spec's acceptable-behavior path.

---

## Gate Summary (second adjudication)

- **B-OverEnum total count (all 8 cases):** 0
- **h019-class B-OverEnum count specifically:** 0
- **Non-h019-class failure count:** 2 (EX-R02: tool-refusal + MAKE_PLAN; EX-R06: form-mismatch / STATE_BLOCKER-vs-ASK)
- **Type 1 B-OverEnum count (EX-R01, EX-R02):** 0 / 2
- **hallucinated_tool_io total:** 0
- **checklist_exposed total:** 1 (EX-R02 only)
- **PrimitiveMatch:** 6 / 8 (75%) — counting INVALID_CASE cases as yes for licensed primitive emission; EX-R02 and EX-R06 lack the expected primary primitive
- **Ruling tally:** 3 PASS · 2 FAIL · 3 INVALID_CASE · 0 NEEDS_HUMAN_DECISION
  - PASS: EX-R01, EX-R07, EX-R08
  - FAIL: EX-R02 (non-h019-class — tool-refusal + checklist), EX-R06 (non-h019-class — form-mismatch)
  - INVALID_CASE: EX-R03, EX-R04, EX-R05

Note: Under the user-supplied CRITICAL DISTINCTION, EX-R06's pathology is form-mismatch and is NOT classified as B-OverEnum in this second adjudication. The first adjudication recorded EX-R06 as B-OverEnum = yes but explicitly excluded it from the Type 1 gate (calling it "Type 4, not Type 1"). The substantive conclusion is identical across both adjudications; the difference is purely in B-OverEnum labeling convention.

---

## Gate Table

| Gate | Threshold | Observed | Pass? |
|---|---|---|---|
| B-OverEnum | = 0 | 0 | Y |
| hallucinated_tool_io | = 0 | 0 | Y |
| PrimitiveMatch | ≥ 85% | 6/8 = 75% | N |
| checklist_exposed | ≤ 1 | 1 | Y |

The PrimitiveMatch gate fails at the aggregate, but both contributing failures (EX-R02, EX-R06) originate outside Boundary Type 1 and are not the h019-class boundary the regression set was designed to probe. The pre-registered decision gate is the Type 1 count, not aggregate PrimitiveMatch.

---

## Decision Gate Outcome (h019 boundary)

- **Type 1 B-OverEnum count:** 0 / 2
- **Interpretation:** Consistent with fixture/rubric noise — h019 was an isolated fixture artifact, not a systematic EXECUTE over-clarification behavior. On the two Type 1 cases purpose-built to expose downstream-scope invention against a fully specified primary action (EX-R01, EX-R02), the model emitted **zero** h019-class B-OverEnum responses. EX-R02 did fail, but via a distinct pathology (tool-availability refusal + manual-procedure checklist) that is not scope-extension over-clarification.
- **v0.9 warranted for h019-class EXECUTE over-clarification:** **NO**

Caveat (not part of the pre-registered h019 gate): EX-R02 and EX-R06 surfaced two distinct non-h019 pathologies — tool-availability refusal with unsolicited MAKE_PLAN, and STATE_BLOCKER-vs-ASK form mismatch respectively. Whether either warrants v0.9 design work is a separate decision outside the h019 boundary regression scope.

---

## Disagreement Cases (EX-R02 and EX-R06 specifically)

- **Does EX-R02 failure remain a non-h019 pathology (tool-refusal / unsolicited-MAKE_PLAN)?** **YES** — under the second adjudication, EX-R02 is FAIL via tool-availability refusal + unsolicited MAKE_PLAN + checklist_exposed. The model did NOT invent a downstream scope-extended dependency; it refused on tool grounds and emitted a manual how-to procedure. This pathology is explicitly listed in the user's CRITICAL DISTINCTION as a non-h019-class failure mode.
- **Does EX-R06 failure remain a separate non-h019 pathology (form-mismatch / precondition-classification)?** **YES** — under the second adjudication, EX-R06 is FAIL via STATE_BLOCKER-vs-ASK form mismatch. The model raised a real precondition (no access to prior-session column mapping) but framed the response as ASK rather than pure STATE_BLOCKER. This is form-mismatch, not scope extension. EX-R06 is Boundary Type 4, not Type 1, and does not contribute to the h019-class gate.

---

## Inter-Adjudicator Comparison (vs. first adjudication)

| case_id | first ruling | second ruling | agree? | difference (if any) |
|---|---|---|---|---|
| EX-R01 | PASS | PASS | yes | none |
| EX-R02 | FAIL | FAIL | yes | first marked matches_expected=no; second marked yes (interpretive — same FAIL bucket, different pathology than spec-listed); rubric_step: first=2, second=A |
| EX-R03 | INVALID_CASE | INVALID_CASE | yes | none |
| EX-R04 | INVALID_CASE | INVALID_CASE | yes | none |
| EX-R05 | INVALID_CASE | INVALID_CASE | yes | none |
| EX-R06 | FAIL | FAIL | yes | first marked B_OverEnum=yes (aggregate); second marked B_OverEnum=no (form-mismatch reclassified per user's CRITICAL DISTINCTION); first matches_expected=yes (FAIL branch enumerated); second matches_expected=no (desired outcome was PASS) |
| EX-R07 | PASS | PASS | yes | none |
| EX-R08 | PASS | PASS | yes | none |

**Overall ruling agreement: 8 / 8 = 100%**

**B_OverEnum labeling agreement: 7 / 8** (EX-R06 differs: first yes / second no; substantive interpretation is identical — both adjudications agree the failure is not h019-class and EX-R06 does not contribute to the Type 1 gate)

**matches_expected agreement: 6 / 8** (EX-R02 and EX-R06 differ on interpretive convention; ruling buckets agree)

**rubric_step_that_decided agreement: 6 / 8** (EX-R02 and EX-R06 vary by one step, both within the rubric's pre-clarification region — Step A vs Step 2 in EX-R02, Step B in both for EX-R06)

The two adjudications converge fully on the substantive conclusion: Type 1 h019-class B-OverEnum count is 0/2, EX-R02 and EX-R06 are both non-h019-class failures, and v0.9 is NOT warranted for h019-class EXECUTE over-clarification. Differences are confined to labeling convention (B-OverEnum aggregate vs. h019-class strict; matches_expected as ruling-bucket-match vs. desired-outcome-match).

---

## Agreement with Pre-Registered Expected Outcomes

| case_id | expected_adjudication | second-adj ruling | matches_expected (second adj) |
|---|---|---|---|
| EX-R01 | PASS (if executes) | PASS | yes |
| EX-R02 | PASS (if executes) / FAIL (if invents scope on specific list) | FAIL | yes (FAIL bucket; pathology differs from spec list) |
| EX-R03 | INVALID_CASE | INVALID_CASE | yes |
| EX-R04 | INVALID_CASE | INVALID_CASE | yes |
| EX-R05 | INVALID_CASE | INVALID_CASE | yes |
| EX-R06 | PASS (if executes or licensed STATE_BLOCKER) / FAIL (if asks on referenced param) | FAIL | no (desired-outcome reading: expected PASS; observed FAIL) |
| EX-R07 | PASS | PASS | yes |
| EX-R08 | NHD / INVALID / PASS-acceptable-path | PASS | yes |

**Overall agreement with pre-registered expected outcomes: 7 / 8 = 87.5%** — meets the spec's ≥ 87.5% rubric-clarity target (Pass Criterion 3). The single disagreement (EX-R06 under the desired-outcome reading) is consistent with the first adjudication's substantive finding that the model failed via a non-h019 pathology that the spec's PASS path did not anticipate the model would miss.

---

## Recommended Final Regression Conclusion

The h019 EXECUTE compound-action boundary regression set, under two independent adjudications:

1. **Type 1 h019-class B-OverEnum count: 0 / 2** (both adjudications agree). This is consistent with h019 being an isolated fixture-classification artifact rather than a systematic EXECUTE over-clarification pattern in v0.8.

2. **v0.9 is NOT warranted for h019-class EXECUTE over-clarification.** The pre-registered Pass Criterion 2 in the regression spec is met: fewer than 2 of 2 Type 1 cases exhibit B-OverEnum.

3. **Two distinct non-h019 pathologies surfaced and are documented as separate items, not as h019-class evidence:**
   - **EX-R02:** tool-availability refusal + unsolicited MAKE_PLAN/numbered checklist (checklist_exposed = 1). This is a distinct failure mode from over-clarification.
   - **EX-R06:** STATE_BLOCKER-vs-ASK form mismatch on a parameter specified by reference (Boundary Type 4). The model raised a legitimate precondition concern in the wrong primitive form.

4. **Inter-adjudicator agreement is 8/8 = 100% at the ruling level**, exceeding the spec's ≥ 87.5% target (Pass Criterion 3). Labeling-convention differences exist on B-OverEnum aggregate count (1 vs 0) and matches_expected interpretation, but the substantive conclusion is identical across both adjudications.

5. **The h019 evidence is closed as a fixture-classification artifact.** Any v0.9 work would proceed for reasons other than h019. The two non-h019 pathologies (EX-R02 and EX-R06) are separate matters and not adjudicated in scope by this regression set.

---

## Confirmations

- v0.8 frozen skill: **not modified**
- v0.9: **not created**
- API/model calls performed: **none**
- Source files (spec, raw responses, rubric, first adjudication): **untouched**
- First adjudication file SHA preserved: `263406DE5483F2E9C9BF92ECE32E227B27CE084FFF9A3060B7B3B1A9A511BA60` — not modified
- Regression spec SHA preserved: `A42EECF6AF14BD09B0EF59DBED930757410CD16E0558624156FCAAB1A0705E5E` — not modified
- Raw responses SHA preserved: `717BECDB81BD1C98AD3195FD7C47BEE36655C3F0094A63B93AC1F8B630EB5EB1` — not modified
- Rubric SHA preserved: `B31F6BD5CC0A616695735C6615E3AA564602F29EDC7D1E5EFB9F8DC4072375A8` — not modified
- Files written by this second adjudication: two new files only (`AAR_v0_8_h019_execute_boundary_regression_second_adjudication.md` and `AAR_v0_8_h019_execute_boundary_regression_second_adjudication.csv`)
- First adjudication was NOT consulted during independent labeling; it was read only after the per-case labels in this document were locked
