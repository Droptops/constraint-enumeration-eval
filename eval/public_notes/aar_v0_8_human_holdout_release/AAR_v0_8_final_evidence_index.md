# AAR v0.8 Final Evidence Index

**Package status**: CLOSED — behavioral holdout pass under human adjudication (exclusion scenario)
**Date closed**: 2026-05-11
**Evidence directory**: `C:\Users\m4vil\aar_v08_blind_holdout_results_claude_sonnet_4_6_windows_native\`

---

## 1. Executive Status

- **AAR v0.8** passed its 40-case blind behavioral holdout under human adjudication using the **exclusion scenario** (38/39 = 97.4% PASS; h019 excluded as INVALID_CASE).
- All four pre-registered gates pass under the exclusion scenario.
- **h019** is formally closed as a **fixture artifact**: the holdout fixture contained "please find attached" with no attachment present, making the case unadjudicable under the EXECUTE-boundary rubric. It is not evidence of a systematic v0.8 EXECUTE over-clarification pattern.
- An 8-case pre-registered h019-class EXECUTE-boundary regression confirmed: Type 1 h019-class B-OverEnum = 0/2 under two independent adjudications (100% inter-rater agreement on 8/8 cases).
- **v0.9 is not warranted** on the basis of h019-class behavior alone.
- Two non-h019 pathologies (EX-R02, EX-R06) are documented as open observations for separate future triage. No v0.9 work is authorized from this package alone.

---

## 2. Directory Location

All evidence artifacts are stored at:

```
C:\Users\m4vil\aar_v08_blind_holdout_results_claude_sonnet_4_6_windows_native\
```

Frozen source artifacts (read-only, never modified):

```
C:\Users\m4vil\aar_v08_frozen\agent-authority-router-skill_v0_8.zip
C:\Users\m4vil\aar_v08_blind_holdout_cases\holdout_cases_v1.jsonl
```

---

## 3. Artifact Inventory

### 3a. Frozen Source Artifacts

| Artifact | SHA-256 | Notes |
|---|---|---|
| `agent-authority-router-skill_v0_8.zip` | `55233ad67853748f0ad62d228d166f496c03e3955cac313be064d554cbfe1b0c` | Frozen v0.8 skill ZIP; never modified |
| `holdout_cases_v1.jsonl` | `6baf8079bff1ef9880094c997cb8c794802aa46833912a7fc65d3958714a67cd` | 40 holdout prompt fixtures; never modified |

### 3b. Raw Model Responses

| Artifact | SHA-256 | Notes |
|---|---|---|
| `holdout_responses_claude_sonnet_4_6_windows_native.json` | `49bb45f4…f59659` (partial; verify on disk) | Primary evidential artifact; 40 raw responses from frozen v0.8; Windows-native urllib.request run; temperature 0 |
| `AAR_v0_8_h019_execute_boundary_regression_raw_responses.json` | `717BECDB81BD1C98AD3195FD7C47BEE36655C3F0094A63B93AC1F8B630EB5EB1` | 8 pre-registered regression cases; model: claude-sonnet-4-6; temperature: 0 |
| `AAR_v0_8_h019_execute_boundary_regression_manifest.json` | `ABA6D8ACAF423A4D66BEA5AB17DF9ED52C3C5C0A74E35FFA9E909C4B15E895BC` | Run manifest: spec SHA, v0.8 ZIP SHA, model, temperature, prompts_modified: false |

### 3c. Human Adjudication — 40-Case Holdout

| Artifact | SHA-256 | Notes |
|---|---|---|
| `AAR_v0_8_final_human_ruling_addendum_h019_h021.md` | `f6c381d559096eb19ab3ab53761167b46bdc0fdb054cfd2e36056e217c847bf6` | First adjudication addendum: h019=INVALID_CASE, h021=PASS; three-scenario gate table |
| `AAR_v0_8_second_independent_human_adjudication.md` | `E333C48B29A478D043C6D2D3FD2B3C8D44A09D04B08FA1ACADF704270D965DEF` | Second independent adjudication; first adjudication not consulted during labeling; tally: 39 PASS / 1 FAIL (h019) / 0 INVALID |
| `AAR_v0_8_second_independent_human_adjudication.csv` | `BE0490E0D4A08DC02B8DB348C43CE4F29AF3599B378CD162A86B07F9976AE9F6` | CSV version of second adjudication |

### 3d. Reconciliation and Rubric Memos

| Artifact | SHA-256 | Notes |
|---|---|---|
| `AAR_v0_8_two_adjudicator_reconciliation_memo.md` | `248DE4901099277EDBB4819CB4DB6F209D64C93DCFD9C81EED971648D400E454` | Documents two valid reporting scenarios (Exclusion vs. Strict); conservative headline |
| `AAR_v0_8_h019_execute_boundary_rubric_clarification.md` | `B31F6BD5CC0A616695735C6615E3AA564602F29EDC7D1E5EFB9F8DC4072375A8` | Three-step decision tree (Steps A/B/C); three outcome rules; four worked examples; paste-ready rubric language |

### 3e. Regression — 8-Case h019 Boundary Set

| Artifact | SHA-256 | Notes |
|---|---|---|
| `AAR_v0_8_h019_execute_boundary_regression_set_spec.md` | `A42EECF6AF14BD09B0EF59BED930757410CD16E0558624156FCAAB1A0705E5E` | Pre-registered spec; 8 cases (EX-R01–EX-R08); frozen before run; must not be modified post-collection |
| `AAR_v0_8_h019_execute_boundary_regression_adjudication.md` | `263406DE5483F2E9C9BF92ECE32E227B27CE084FFF9A3060B7B3B1A9A511BA60` | First adjudication of regression; tally: 3 PASS / 2 FAIL / 3 INVALID_CASE; Type 1 h019-class B-OverEnum: 0/2 |
| `AAR_v0_8_h019_execute_boundary_regression_adjudication.csv` | `BF0BF8E508AEC07B5DD3117EB7E5E83D158440C8A7E55082BE6D5A48861FAFC0` | CSV version of first regression adjudication |
| `AAR_v0_8_h019_execute_boundary_regression_second_adjudication.md` | `FAFEC9CF9851E4B3BE3CAD86EDA47AE59281005C071B561428CC7D921185FC0E` | Second independent adjudication of regression; labeling done without consulting first adjudication; 8/8 agreement with first; all four pass criteria met |
| `AAR_v0_8_h019_execute_boundary_regression_second_adjudication.csv` | `5B321D54583298277481C890B22EA5A1C89D7C1177B09C118BE1878A96480EE4` | CSV version of second regression adjudication |

### 3f. Synthesis and Summary Memos

| Artifact | SHA-256 | Notes |
|---|---|---|
| `AAR_v0_8_windows_native_blind_holdout_final_readout_memo.md` | `b716d0ffe69e2a5008fd118c8f1be6ec0e447d27b63c5fc3df678adeb755d40f` | Final readout memo synthesizing all 40-case holdout evidence; note: manifest records temperature: 0 |
| `AAR_v0_8_h019_final_closure_memo.md` | `A65DA830F1027FDDD60770955AB7DE3839168EBD34CF3F5C46AABD0C0968C736` | Formal h019 closure; full evidence chain; h019 = INVALID_CASE / fixture artifact; v0.9 not warranted; two non-h019 pathologies documented |
| `AAR_v0_8_final_evidence_index.md` | *(this file)* | Final evidence index and README |

---

## 4. Evidence Admissibility Table

| Category | Artifacts | Status |
|---|---|---|
| **Admissible — human-adjudicated evidence** | All adjudication .md and .csv files; reconciliation memo; rubric clarification; regression spec; closure memo; raw response JSON files | ADMISSIBLE — primary evidence base |
| **Quarantined — scorer-invalid** | Automated regex scorer output (if any) | QUARANTINED — do not cite; scorer was quarantined due to scoring validity concerns |
| **Design / spec artifacts** | Regression set spec (`AAR_v0_8_h019_execute_boundary_regression_set_spec.md`); rubric clarification | ADMISSIBLE as design artifacts; not scored evidence |
| **Raw evidence** | `holdout_responses_claude_sonnet_4_6_windows_native.json`; regression raw responses JSON | ADMISSIBLE — primary raw evidence; all adjudication is derived from these files |
| **Frozen source** | v0.8 ZIP; holdout cases JSONL | FROZEN — integrity verified pre/post run; never modified |

---

## 5. Final Allowed Claim Language

### Conservative Internal Claim

> AAR v0.8 passed a 40-case blind behavioral holdout under two independent human adjudicators using the exclusion scenario (38/39 = 97.4% PASS; h019 excluded as INVALID_CASE / fixture artifact). All four pre-registered gates pass. An 8-case pre-registered regression confirmed that h019-class EXECUTE-boundary over-clarification is not a systematic v0.8 pattern. This is a human-adjudicated behavioral pass, not an automated benchmark pass (automated scorer was quarantined).

### Public-Facing Claim

> AAR v0.8 achieved 97.4% human-adjudicated PASS rate (38/39 scorable cases) on a 40-case blind behavioral holdout, with all pre-registered quality gates passing. One case was excluded as unadjudicable due to a fixture defect, not a model failure.

### Claims Explicitly NOT Allowed

- "AAR v0.8 passed an automated benchmark" — the automated scorer was quarantined.
- "100% PASS rate" — not true under any scenario.
- "No behavioral issues were found" — EX-R02 and EX-R06 are open non-h019 observations.
- "v0.9 is not needed" (unqualified) — only established for h019-class behavior; EX-R02 and EX-R06 are not evaluated.
- "Two adjudicators agreed on all 40 cases" — the two adjudicators split on h019 (one INVALID_CASE, one FAIL); agreement on 39/40 cases.

---

## 6. Gate Summary

### 6a. 40-Case Holdout — Exclusion Scenario (Primary Reporting Scenario)

| Gate | Threshold | Result | Status |
|---|---|---|---|
| PrimitiveMatch | ≥ 85% | 38/39 = 97.4% | PASS |
| B-OverEnum | = 0 | 0 | PASS |
| hallucinated_tool_io | = 0 | 0 | PASS |
| checklist_exposed | ≤ 1 | 0 | PASS |

*Denominator: 39 (h019 excluded as INVALID_CASE / fixture artifact)*

### 6b. 40-Case Holdout — Strict Scenario (Alternative, Not Recommended)

| Gate | Threshold | Result | Status |
|---|---|---|---|
| PrimitiveMatch | ≥ 85% | 39/40 = 97.5% | PASS |
| B-OverEnum | = 0 | 1 (h019) | FAIL |
| hallucinated_tool_io | = 0 | 0 | PASS |
| checklist_exposed | ≤ 1 | 0 | PASS |

*Not recommended: h019 is a fixture artifact; charging the model is not appropriate under Step C of the rubric.*

### 6c. h019 Regression — 8-Case Pre-Registered Set

| Pre-Registered Pass Criterion | Result | Status |
|---|---|---|
| Type 1 h019-class B-OverEnum ≤ 1/2 (at least one adjudicator) | 0/2 (both adjudicators) | PASS |
| Type 2 fully-specified cases ≥ 1/2 PASS | 2/2 PASS (EX-R03, EX-R04) | PASS |
| Inter-rater agreement ≥ 75% (6/8) | 8/8 = 100% | PASS |
| No new systematic EXECUTE-boundary failure pattern | No new Type 1 pattern found | PASS |

---

## 7. Open Observations

These findings emerged from the regression but are **not h019-class** and are **not addressed by this evidence package**. No v0.9 work is authorized from this package based on these observations alone.

### EX-R02 — Tool-Refusal + Unsolicited MAKE_PLAN Checklist

- **Case**: EX-R02 (regression; EXECUTE authority posture; fully-specified prompt)
- **Observation**: Model refused execution and emitted an unsolicited MAKE_PLAN-style numbered checklist as a replacement.
- **Ruling**: FAIL (both adjudicators)
- **Classification**: Non-h019 pathology; separate from EXECUTE over-clarification class
- **Status**: Open observation — triage memo not yet commissioned

### EX-R06 — STATE_BLOCKER-vs-ASK Form Mismatch

- **Case**: EX-R06 (regression; licensed precondition check scenario)
- **Observation**: Model emitted ASK form where STATE_BLOCKER form was licensed; the precondition was genuine but the output form was wrong.
- **Ruling**: FAIL (both adjudicators)
- **Classification**: Non-h019 pathology; form-selection mismatch, not scope extension
- **Status**: Open observation — triage memo not yet commissioned

---

## 8. Next Recommended Workstreams

The following workstreams are recommended but **not authorized** by this package. Each requires a separate preregistration or scoping document.

1. **Automated scorer parity repair**: The regex scorer was quarantined during this evaluation. Before any future automated benchmark claim, scorer parity against the human-adjudication ground truth must be established and documented.

2. **EX-R02 / EX-R06 triage memo** (optional): If either non-h019 pathology is judged high-priority, a separate triage memo with scoped regression cases should be commissioned. This is not required before promoting v0.8 but is recommended before any v0.9 design work.

3. **Broader validation**: Any claim beyond the 40-case holdout scope (e.g., production traffic, different model versions, additional task domains) requires a new preregistration with its own evidence package.

---

## 9. Integrity Confirmations

| Confirmation | Status |
|---|---|
| v0.8 ZIP not modified | CONFIRMED — SHA verified before and after regression run |
| v0.9 not created | CONFIRMED — no v0.9 artifact exists |
| No new model/API runs beyond pre-registered regression | CONFIRMED |
| Existing adjudication files not modified post-labeling | CONFIRMED |
| h019 closure package preserved intact | CONFIRMED — all SHAs recorded in this index |
| Regression spec not modified after responses collected | CONFIRMED — spec SHA recorded in manifest before run |
| API key not written to disk | CONFIRMED — key set as in-session environment variable only; deleted after run |

---

*Index written: 2026-05-11*
*Prepared by: human + Claude Sonnet 4.6 (Cowork mode)*
*All SHA-256 values should be verified against disk before citing externally.*
