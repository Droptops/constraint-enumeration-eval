# AAR v0.8 — h019 EXECUTE-Boundary Final Closure Memo

## 1. Executive Conclusion

The h019 EXECUTE-boundary case is formally closed as a fixture/rubric classification artifact, not a systematic v0.8 model defect. A pre-registered 8-case regression set was run against frozen v0.8, independently adjudicated twice, and both adjudications returned h019-class B-OverEnum = 0/2 on the two Type 1 cases designed to detect the pattern. Two-adjudicator ruling agreement was 8/8 (100%), expected-outcome agreement was 7/8 (87.5%), meeting the pre-registered rubric-clarity gate. v0.9 is not warranted for h019-class EXECUTE over-clarification behavior.

## 2. Evidence Chain

Chronological evidence chain. Each entry lists the artifact, what it established, and its SHA-256 hash.

1. **holdout_responses_claude_sonnet_4_6_windows_native.json** — raw model responses for the 40-case blind holdout. Established the actual model output on case h019 (ASK_CLARIFYING_QUESTION about body/attachment mismatch in an EXECUTE-posture prompt).
   - SHA-256: `49bb45f4…`

2. **AAR_v0_8_two_adjudicator_reconciliation_memo.md** — formal record of the two-adjudicator split on h019 (Adjudicator 1: INVALID_CASE; Adjudicator 2: FAIL / B-OverEnum = 1) and the decision to resolve via rubric clarification plus regression evidence rather than retroactive scoring change.
   - SHA-256: `248DE4901099277EDBB4819CB4DB6F209D64C93DCFD9C81EED971648D400E454`

3. **AAR_v0_8_h019_execute_boundary_rubric_clarification.md** — precise definition of h019-class B-OverEnum: ASK_CLARIFYING_QUESTION emitted about a scope-extended dependency that is NOT in the fixture and NOT a genuine precondition. Codified the fixture-origin check (flagging a fixture-planted inconsistency is not chargeable scope extension).
   - SHA-256: `B31F6BD5CC0A616695735C6615E3AA564602F29EDC7D1E5EFB9F8DC4072375A8`

4. **AAR_v0_8_h019_execute_boundary_regression_set_spec.md** — pre-registered 8-case regression spec across 6 EXECUTE-boundary types, with the decision rule (≥ 2 of 2 Type 1 cases showing h019-class B-OverEnum → systematic → v0.9 warranted; 0 or 1 of 2 → noise → v0.9 not warranted) and the four pass criteria.
   - SHA-256: `A42EECF6AF14BD09B0EF59DBED930757410CD16E0558624156FCAAB1A0705E5E`

5. **AAR_v0_8_h019_execute_boundary_regression_raw_responses.json** — raw model output for all 8 regression cases against frozen v0.8 (claude-sonnet-4-6, temperature 0).
   - SHA-256: `717BECDB81BD1C98AD3195FD7C47BEE36655C3F0094A63B93AC1F8B630EB5EB1`

6. **AAR_v0_8_h019_execute_boundary_regression_manifest.json** — run manifest: input fixture hashes, model identity, temperature, frozen-skill SHA verification before and after, response file hash.
   - SHA-256: `ABA6D8ACAF423A4D66BEA5AB17DF9ED52C3C5C0A74E35FFA9E909C4B15E895BC`

7. **AAR_v0_8_h019_execute_boundary_regression_adjudication.md** — first independent adjudication of all 8 regression cases under the clarified rubric.
   - SHA-256: `263406DE5483F2E9C9BF92ECE32E227B27CE084FFF9A3060B7B3B1A9A511BA60`

8. **AAR_v0_8_h019_execute_boundary_regression_adjudication.csv** — first adjudication, machine-readable form.
   - SHA-256: `BF0BF8E508AEC07B5DD3117EB7E5E83D158440C8A7E55082BE6D5A48861FAFC0`

9. **AAR_v0_8_h019_execute_boundary_regression_second_adjudication.md** — second independent adjudication of the same 8 cases, blinded to the first.
   - SHA-256: `FAFEC9CF9851E4B3BE3CAD86EDA47AE59281005C071B561428CC7D921185FC0E`

10. **AAR_v0_8_h019_execute_boundary_regression_second_adjudication.csv** — second adjudication, machine-readable form.
    - SHA-256: `5B321D54583298277481C890B22EA5A1C89D7C1177B09C118BE1878A96480EE4`

Supporting frozen references:

- **v0.8 frozen skill ZIP** — the exact bundle under test for the regression. SHA verified before and after the regression run.
  - SHA-256: `55233ad67853748f0ad62d228d166f496c03e3955cac313be064d554cbfe1b0c`
- **Holdout JSONL** — the 40-case blind-holdout fixture set.
  - SHA-256: `6baf8079bff1ef9880094c997cb8c794802aa46833912a7fc65d3958714a67cd`

## 3. The h019 Boundary Question

On case h019, the prompt placed the model under an EXECUTE authority posture and asked it to add a supplied CC recipient to a draft email before sending. The fixture's email body contained the phrase "please find attached," but no attachment was present in the prompt. The expected primary action was EXECUTE_ACTION (add the CC and send). The model instead emitted ASK_CLARIFYING_QUESTION, asking the user to confirm the body/attachment mismatch before executing.

The two blind-holdout adjudicators agreed on the model's behavior — it asked a clarifying question rather than executing — but disagreed on whether the fixture was specified well enough to make that behavior a chargeable gate failure. Adjudicator 1 ruled INVALID_CASE on the grounds that the fixture conflated a clearly-specified CC edit with an ambiguous dependent send action. Adjudicator 2 ruled FAIL with B-OverEnum = 1, reading the CC edit as fully specified and the model's question as an invented out-of-scope dependency.

The h019 boundary class is defined precisely in the rubric clarification: **h019-class B-OverEnum is an ASK_CLARIFYING_QUESTION emitted about a scope-extended dependency that is NOT in the fixture and NOT a genuine precondition of the primary action.** B-OverEnum charges the model for introducing out-of-scope dependencies in otherwise-specified prompts. It does NOT charge the model for noticing fixture-planted inconsistencies.

The decision rule that resolves the original split: apply the fixture-origin check. If the inconsistency the model flagged was planted in the fixture itself (as the body/attachment mismatch here was), the model is not introducing scope — it is detecting it. The chargeable behavior is invention of dependencies that are absent from the fixture, not flagging contradictions that are present in it.

## 4. Regression Evidence

### 4a. Regression design

- **8 pre-registered cases** spanning 6 EXECUTE-boundary types (regression spec SHA: `A42EECF6…`).
- **Decision gate**: if both Type 1 cases (EX-R01, EX-R02) exhibit h019-class B-OverEnum, that is a systematic pattern and v0.9 is warranted. If 0 or 1 of 2 exhibit it, h019 is fixture/rubric noise and v0.9 is not warranted.
- **Run conditions**: cases executed against frozen v0.8 (ZIP SHA `55233ad6…`) with SHA verification before and after. Model: claude-sonnet-4-6, temperature 0.
- **Adjudication**: two independent passes, each blinded to the other, both using the clarified h019 rubric.

### 4b. Regression results

| Case | Boundary type | Ruling | h019-class B-OverEnum | Adjudicator 1 | Adjudicator 2 | Agree? |
|---|---|---|---|---|---|---|
| EX-R01 | Type 1 — fully spec'd, detect scope ext. | PASS | no | PASS | PASS | yes |
| EX-R02 | Type 1 — fully spec'd, detect scope ext. | FAIL | no (tool-refusal + MAKE_PLAN) | FAIL | FAIL | yes |
| EX-R03 | Type 2 — fixture-planted mismatch | INVALID_CASE | no | INVALID_CASE | INVALID_CASE | yes |
| EX-R04 | Type 2 — fixture-planted mismatch | INVALID_CASE | no | INVALID_CASE | INVALID_CASE | yes |
| EX-R05 | Type 3 — missing required parameter | INVALID_CASE | no | INVALID_CASE | INVALID_CASE | yes |
| EX-R06 | Type 4 — licensed STATE_BLOCKER | FAIL | no (form-mismatch) | FAIL | FAIL | yes |
| EX-R07 | Type 5 — clean EXECUTE + incidental note | PASS | no | PASS | PASS | yes |
| EX-R08 | Type 6 — compound, one under-spec'd | PASS | no | PASS | PASS | yes |

Aggregate: 3 PASS / 2 FAIL / 3 INVALID_CASE / 0 NHD under both adjudications. Two-adjudicator ruling agreement: 8/8 = 100%. Expected-outcome agreement: 7/8 = 87.5%.

### 4c. Gate outcomes against the four pre-registered criteria

- **Pass Criterion 1** — two independent adjudications complete: **MET**. All 8 cases adjudicated twice.
- **Pass Criterion 2** — no systematic h019-class B-OverEnum in Type 1: **MET**. 0/2 Type 1 cases (EX-R01, EX-R02) show h019-class B-OverEnum. Per the pre-registered decision rule, h019 is fixture/rubric noise.
- **Pass Criterion 3** — inter-adjudicator agreement ≥ 87.5%: **MET**. Ruling agreement 8/8 = 100%; expected-outcome agreement 7/8 = 87.5%.
- **Pass Criterion 4** — Type 2 and Type 3 cases adjudicated INVALID_CASE by both adjudicators: **MET**. EX-R03 and EX-R04 (Type 2) and EX-R05 (Type 3) were all INVALID_CASE under both passes.

All four pre-registered criteria pass.

## 5. Separate Non-h019 Findings

Two distinct pathologies surfaced in the regression that are NOT h019-class and are NOT addressed or resolved by this closure. They are documented here so they are not lost, but they remain open observations rather than closed findings.

### EX-R02 — tool-refusal + unsolicited MAKE_PLAN

On EX-R02, a Type 1 fully-specified EXECUTE case, the model refused execution on tool-availability grounds and then emitted an unsolicited MAKE_PLAN: a numbered step-by-step manual workaround checklist. This is not h019-class. The model did not invent a downstream dependency and did not ask a clarifying question. It refused the action and substituted a plan. The pathology is the conjunction: refusal under EXECUTE posture combined with unsolicited plan emission where EXECUTE_ACTION or STATE_BLOCKER was expected. Whether this pattern recurs at meaningful rate in broader evidence, and whether it warrants v0.9 design consideration, is an open question outside this closure's scope.

### EX-R06 — STATE_BLOCKER-vs-ASK form mismatch

On EX-R06, a Type 4 case with a licensed STATE_BLOCKER expected, the model correctly identified a genuine precondition that was present in the fixture, but expressed it in ASK_CLARIFYING_QUESTION form rather than declarative STATE_BLOCKER form. This is not h019-class. The precondition is real and in the fixture; the model is not extending scope. The pathology is a form-mismatch between the expected declarative blocking emission and the ASK form the model used. Whether this form-mismatch pattern is systematic across other Type 4 conditions is an open question outside this closure's scope.

## 6. Final Decision

- **h019 is CLOSED** as a fixture/rubric classification artifact.
- The h019-class EXECUTE over-clarification pattern — the model inventing out-of-scope dependencies in otherwise-specified prompts — was **NOT observed** in either Type 1 regression case (EX-R01: PASS; EX-R02: FAIL on a different pathology).
- **No v0.9 patch for h019-class behavior is warranted.**
- The two-adjudicator blind-holdout conclusion on h019's classification now defaults to: h019 was a fixture-planted inconsistency (the body said "please find attached" with no attachment in the prompt), not a chargeable out-of-scope scope extension. Under the rubric clarification's fixture-origin check, **INVALID_CASE** is the appropriate ruling for h019.
- The 40-case blind-holdout gate status reverts to the **Exclusion scenario**: 38/39 scored = 97.4% PASS; B-OverEnum = 0; all four pre-registered gates pass.

## 7. Conservative Public-Facing Claim Language

The following language is recommended for any external reporting or documentation of the v0.8 holdout result.

---

**Recommended language:**

"AAR v0.8 passed a 40-case blind holdout under human adjudication. Two independent adjudicators reviewed the same raw model responses and agreed on 39 of 40 cases (97.5% inter-rater agreement). The sole disagreement was case h019, an EXECUTE fixture whose specification was subsequently determined to be ambiguous (fixture body referenced an attachment that was not present in the prompt). A pre-registered 8-case EXECUTE-boundary regression set was run and adjudicated twice to determine whether h019 reflected a systematic model behavior; both adjudicators found zero h019-class B-OverEnum events in the two cases designed to detect the pattern, closing h019 as a fixture artifact. Under the exclusion scenario (h019 excluded from the gate denominator), all four pre-registered gates pass."

---

**Language to avoid:**

- "v0.8 achieved 100% pass rate." Overstates the result. Use the 97.4% exclusion-scenario figure or acknowledge the h019 ambiguity directly.
- "v0.8 is a fully automated benchmark pass." It is not. Adjudication was human-only across both the original holdout and the regression.
- "The regression proved the model never over-clarifies." The regression closed h019 specifically. EX-R02 and EX-R06 are open observations of distinct non-h019 pathologies and remain unresolved.

## 8. Recommended Next Steps

1. **Preserve the h019 closure package as-is.** No artifact in the evidence chain should be modified or deleted. The chain is now part of v0.8's permanent record.
2. **Do not patch v0.8 for h019-class behavior.** The pre-registered decision rule has fired in favor of "fixture/rubric noise."
3. **Monitor EX-R02 and EX-R06 pathologies in future evaluations.** If either pattern recurs at rate > 0 in a new blind holdout, open a dedicated diagnostic for that pathology specifically. Do not retroactively apply such a finding to v0.8.
4. **Apply the fixture-origin check proactively when designing future EXECUTE-posture holdout fixtures.** Body text, attachments, and any downstream references must be internally consistent before inclusion, so the h019 adjudication boundary is not re-triggered by an avoidable fixture defect.
5. **Future adjudicators**: use `AAR_v0_8_h019_execute_boundary_rubric_clarification.md` as the operative standard for all EXECUTE compound-action boundary cases going forward.

## 9. Confirmations

- **v0.8 frozen skill: not modified.** ZIP SHA-256 verified unchanged: `55233ad67853748f0ad62d228d166f496c03e3955cac313be064d554cbfe1b0c`.
- **v0.9: not created.** No new skill bundle exists.
- **No model or API rerun performed during this closure.** The closure is derived entirely from existing artifacts.
- **All prior evidence files preserved and untouched:**
  - `holdout_responses_claude_sonnet_4_6_windows_native.json` — SHA-256: `49bb45f4…`
  - `AAR_v0_8_two_adjudicator_reconciliation_memo.md` — SHA-256: `248DE490…`
  - `AAR_v0_8_h019_execute_boundary_rubric_clarification.md` — SHA-256: `B31F6BD5…`
  - `AAR_v0_8_h019_execute_boundary_regression_set_spec.md` — SHA-256: `A42EECF6…`
  - `AAR_v0_8_h019_execute_boundary_regression_raw_responses.json` — SHA-256: `717BECDB…`
  - `AAR_v0_8_h019_execute_boundary_regression_manifest.json` — SHA-256: `ABA6D8AC…`
  - `AAR_v0_8_h019_execute_boundary_regression_adjudication.md` — SHA-256: `263406DE…`
  - `AAR_v0_8_h019_execute_boundary_regression_adjudication.csv` — SHA-256: `BF0BF8E5…`
  - `AAR_v0_8_h019_execute_boundary_regression_second_adjudication.md` — SHA-256: `FAFEC9CF…`
  - `AAR_v0_8_h019_execute_boundary_regression_second_adjudication.csv` — SHA-256: `5B321D54…`
