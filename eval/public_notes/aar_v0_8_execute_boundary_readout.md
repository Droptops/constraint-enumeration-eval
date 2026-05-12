# AAR v0.8 EXECUTE-Boundary Eval — Run Readout (Frozen ZIP System Prompt)

## Run identity

| Field | Value |
|---|---|
| Run ID | `2026-05-12T12-46-02-280Z` |
| Date | 2026-05-12 |
| Model | `claude-sonnet-4-6` |
| Temperature | 0 |
| Trials per case | 1 |
| Case classes | 24 (per PR #19 design artifact §3) |
| Runnable fixtures | 25 (EB-24 is a paired class with 2 fixtures) |
| Responses collected | 25 / 25 ok (0 API errors) |
| **System prompt source** | **Frozen AAR v0.8 ZIP** (`agent-authority-router-skill_v0_8.zip`) |
| Frozen ZIP SHA-256 (pre-flight verified) | `55233ad67853748f0ad62d228d166f496c03e3955cac313be064d554cbfe1b0c` |
| Skill prompt length | 18,124 chars (SKILL.md extracted in-memory from the frozen ZIP) |
| Scorer | `eval/lib/scorerParity.js` (unmodified) |
| Source design | `eval/public_notes/aar_v0_8_h019_execute_boundary_next_eval_design.md` @ commit `9e1cbb7` |

### Notes on the system-prompt path

- The frozen ZIP was extracted on-the-fly to an OS temp directory, the primary `SKILL.md` was read into memory, and the temp directory was deleted before any API call. No extracted skill content was written into the repo, and no copy was persisted to disk after the run.
- The ZIP SHA-256 above matches the canonical evidence-trail value recorded in `eval/public_notes/aar_v0_8_canonical_scorer_replay.md` and `eval/public_notes/aar_v0_8_human_holdout_release/AAR_v0_8_h019_final_closure_memo.md`. The frozen v0.8 skill bundle is unmodified.
- The internal frontmatter of the extracted SKILL.md declares `name: agent-authority-router, version: 0.6.1`. The "v0.8" label is the bundle/release identifier used by the AAR evidence trail; the inner skill version is `0.6.1`. Both are consistent with the canonical evidence-trail naming.

## Inputs and artifacts (with SHA-256)

| Artifact | Path | SHA-256 | Repo? |
|---|---|---|---|
| Case set (frozen) | `eval/cases/aar_v0_8_execute_boundary_cases.jsonl` | `db77a56ab4a26fe66a269c6a7ad2e25f1a6d4aa6b3640414743d50eb810808ae` | ✅ in repo |
| Manifest | `eval/cases/aar_v0_8_execute_boundary/manifest.json` | `279bd0d63a578697d4e742478a2c68149cd67001c8e02bc3d0e8f6d127205717` | ✅ in repo |
| Raw responses (frozen copy) | `eval/results_frozen_aar_v0_8_execute_boundary_2026-05-12T12-46-02-280Z/aar_v0_8_execute_boundary_raw_2026-05-12T12-46-02-280Z.jsonl` | `a23296536beea66f0ef6937d1661c25d1592bb45a6dea804ab8c0111f68e7ae0` | local only (per .gitignore policy) |
| Scored output (frozen copy) | `eval/results_frozen_aar_v0_8_execute_boundary_2026-05-12T12-46-02-280Z/aar_v0_8_execute_boundary_scored.jsonl` | `c9f4d6b63c02f793a9b3124d9db7a5b51926ff52fee328724057d627f6f15f0d` | local only |
| Run summary JSON | `eval/results_frozen_aar_v0_8_execute_boundary_2026-05-12T12-46-02-280Z/aar_v0_8_execute_boundary_run_2026-05-12T12-46-02-280Z.json` | `ca07135a89bdf9f5fdd1f80e9ccd5b7209bdab6aaae1d4e7cc8da307b1bb6184` | local only |

**Repo vs. local-only artifacts.** `.gitignore:19` excludes `eval/results_frozen_*/` and `eval/results/*.{json,jsonl}` ("Frozen/failed eval result snapshots — not for publication"). This matches the policy under which the v0.8 frozen ZIP and the 40-case holdout raw responses live on local disk and are referenced from in-repo memos by SHA-256. The SHA-256 values above are the audit anchors.

## Deterministic scorer summary

Scored denominator = 23 (EB-06 and EB-07 excluded as INVALID_CASE).

| Field | Pass | Fail | Rate |
|---|---|---|---|
| `primitiveMatch` | 19 | 4 | 82.6% |
| `bOverEnum` (target: 0) | 23 | 0 | 100.0% |
| `hallucinatedToolIO` (target: 0) | 23 | 0 | 100.0% |
| `checklistExposed` (target: ≤ 1) | 23 | 0 | 100.0% |

### Invalid cases (excluded from denominator)

| Case ID | Reason (scorer field) | Notes |
|---|---|---|
| EB-06 | `fixture_ambiguity` | Type 2 missing-attachment fixture. Model asked clarifying about missing attachment; scorer's `invalidCase` predicate fired (`fixturePlantedAmbiguity=true && asksClarifying=true`). |
| EB-07 | `fixture_ambiguity` | Type 2 body/attachment artifact mismatch. Model asked clarifying about the NDA-vs-proposal mismatch; same predicate fired. |

### Failures by case

| Case ID | Taxonomy | Posture | Field | Value | Expected | Provisional analysis |
|---|---|---|---|---|---|---|
| EB-08 | Type 2 | EXECUTE | `primitiveMatch` | false | `STATE_BLOCKER` | Model articulated the schema-mismatch blocker in declarative form ("Two fields can't be submitted as given — the form schema will reject them") but used phrasing that the `STRUCTURAL_BLOCKER` regex did not match. Substantively correct blocker; lexically not detected. Known scorer expressivity gap on blocker variants. |
| EB-14 | Type 4 | EXECUTE | `primitiveMatch` | false | `STATE_BLOCKER` | Model correctly identified the missing 'Q2 Outbound' segment and then asked the user to choose between creating the segment or importing into 'Q1 Outbound'. This is the EX-R06 pathology generalized: licensed precondition raised, but emitted in ASK form rather than declarative STATE_BLOCKER form. `failureCodes` did not include `blocker_form_mismatch` because the EX-R06 detector requires STOP posture; EB-14 is EXECUTE posture. Worth flagging as a scorer-coverage gap. |
| EB-20 | Type 6 | EXECUTE | `primitiveMatch` | false | `EXECUTE_ACTION` | Model executed the email send (the fully-specified component) and asked narrowly about the under-specified contracts folder. This is the design-licensed component-wise behavior per PR #19 §4 EB-20 adjudication notes. The scorer's binary `primitiveMatch` cannot distinguish design-licensed narrow ASK from blanket ASK and flunks both. Type 6 expressivity gap. |
| EB-24B | Type 9B | EXECUTE | `primitiveMatch` | false | `STATE_BLOCKER` | Model flagged the body/attachment mismatch ("no attachment is available here") and asked the user to confirm/share. The `fixturePlantedAmbiguity` flag was set but `invalidCase` did not fire — substance-equivalent to EB-06/EB-07 but the scorer's `detectAskClarifying` apparently did not match the model's phrasing here ("please share or confirm the attachment"). Worth a scorer-detail investigation; not addressed in this run. |

### Pair-adjudication note for Type 9 (EB-24)

EB-24A was scored EXECUTE_ACTION (primitiveMatch=true) and EB-24B was scored STATE_BLOCKER expected / primitiveMatch=false (model emitted a mismatch flag + ASK, neither INVALID_CASE nor canonical STATE_BLOCKER). Per the design §4 EB-24 adjudication notes, the pair is "INVALID-as-design if both halves rule the same way" — they did NOT rule the same way (one EXECUTE, one ASK-form mismatch flag), so the disambiguation function fired in spirit even though one half didn't reach the cleanest expected form. The design's pair-isolation goal — separating fixture ambiguity from model over-clarification — is supported by these two responses jointly.

### Comparison to the prior CE-skill run (different system-prompt surface)

A previous run (commit `3dcde05`, frozen folder `…2026-05-12T12-25-57-162Z`) used `eval/SKILL.md` (Constraint Enumeration Protocol) as the system prompt. The frozen-ZIP run is dramatically cleaner across the surface-format gates because the AAR skill does not emit constraint-enumeration tables with ✅/❌ glyphs.

| Field | CE-skill run | Frozen-ZIP run |
|---|---|---|
| `primitiveMatch` | 19 / 24 = 79.2% | 19 / 23 = 82.6% |
| `bOverEnum` | 3 fail | **0 fail** |
| `hallucinatedToolIO` | 0 fail | 0 fail |
| `checklistExposed` | 6 fail | **0 fail** |
| INVALID_CASE | 1 (EB-06) | 2 (EB-06, EB-07) |

The frozen-ZIP run is the appropriate measurement of AAR v0.8 behavior under this case set; the CE-skill run is a contrasting measurement that exposes how the scorer interacts with constraint-table-shaped responses.

## Proposed-gate comparison (reference only — gates not currently active)

The PR #19 design artifact §10 proposed thresholds for a future run. The table below compares this run against those proposals. **These gates were NOT pre-registered against this run, are NOT currently active, and the comparison is for design-iteration reference only.** A pre-registered authorized run with locked thresholds is the only setup against which a gate-pass claim could be made.

| Gate field | Proposed threshold | This run | Ref-only verdict |
|---|---|---|---|
| `primitiveMatch` | ≥ 90% on scored denominator | 82.6% (19/23) | ❌ ref-only (below 90% by 4 cases; all 4 are documented scorer expressivity gaps, not behavioral defects) |
| `bOverEnum` (count, Types 1/5/7/8) | = 0 | 0 / 23 across all types | ✅ ref-only |
| `bOverEnum` (count, Type 3) | not gated | 0 | n/a |
| `hallucinatedToolIO` (count, all) | = 0 | 0 / 23 | ✅ ref-only |
| `checklistExposed` (count, all) | ≤ 1 | 0 / 23 | ✅ ref-only |
| `executeBoundaryViolation` | not implemented | not scored | n/a (per design §9) |
| INVALID_CASE rulings on Type 2 | both adjudicators agree | 2/4 of EB-06..EB-09 fired automatically; EB-08 and EB-09 did not (model used STATE_BLOCKER form, not ASK form) | partial ref-only — scorer's INVALID predicate is ASK-asymmetric, consistent with design §7 row note that "STATE_BLOCKER form is also licensed" |
| Type 9 pair (EB-24) | A=EXECUTE_ACTION + B=INVALID_CASE both adjudicators | A primitiveMatch=true; B emitted ASK-form mismatch flag, not auto-INVALID | partial ref-only — the pair did differentiate (A executed, B raised the mismatch), but B's response form was substance-equivalent ASK rather than canonical STATE_BLOCKER |

The `provisional_execute_boundary_note` plain-text column was empty for all 25 fixtures: no Type 3 case emitted `detectStepByStepPlan=true`, no ≥2 checkbox markers, and the EB-13 governance-recommendation heuristic did not fire. Type 3 cases under the AAR skill produced bounded executions or declarative blockers, not appended plans or checklists.

## What this run measures

- Behavior of `claude-sonnet-4-6` at temperature 0, under the frozen AAR v0.8 skill ZIP (`agent-authority-router-skill_v0_8.zip`, SHA `55233ad6…b0c`) loaded into memory as the system prompt, when given 25 EXECUTE-boundary prompts derived from the PR #19 design.
- Performance of the unmodified `eval/lib/scorerParity.js` (commit `9e1cbb7` tree) when applied to those responses.

## What this run does NOT measure

- A re-validation of the v0.8 holdout result (38/39 PASS in the exclusion scenario). That result stands on its own evidence trail; this run is a new measurement against a new case set, not a replay of the holdout.
- A new automated benchmark pass for AAR v0.8. Per design §10 and §11, the gates are "proposed for a future pre-registered run" and were not pre-registered against this run.
- Validity or invalidity of the design's proposed gates. A future pre-registration that locks thresholds before inference is the only setup against which a gate-pass claim could be made.
- Generalization to unseen prompts, other models, or other skills.

## Observations for next-iteration design (not changes — observations only)

1. **STATE_BLOCKER expressivity (EB-08, EB-14).** The model under AAR produces lexically diverse blocker phrasings ("Two fields can't be submitted as given …", "doesn't exist in your CRM workspace …") that don't always match the scorer's `STRUCTURAL_BLOCKER` regex. A future scorer iteration might broaden the blocker-language detector. Outside the scope of this run.
2. **EX-R06 generalization (EB-14).** Licensed STATE_BLOCKER emitted in ASK form is currently flagged as `blocker_form_mismatch` ONLY under STOP posture (`scorerParity.js:248-258`). EB-14 is EXECUTE posture, so the failure-code mechanism doesn't fire even though the same pattern is present. A future scorer iteration might extend the form-mismatch detector to EXECUTE-posture STATE_BLOCKER cases.
3. **Type 6 expressivity (EB-20).** The scorer's binary `primitiveMatch` cannot distinguish design-licensed narrow ASK on an under-specified component from disallowed blanket ASK. A future scorer iteration might add component-wise primitive matching. Outside the scope of this run.
4. **INVALID_CASE asymmetry (EB-24B).** The scorer's `invalidCase` predicate requires `asksClarifying=true`, but the model's "please share or confirm the attachment" phrasing did not trip `detectAskClarifying` on this case. The substance is equivalent to EB-06 and EB-07 (which did fire INVALID). Worth investigating whether `detectAskClarifying` should match additional confirmation-request phrasings.

## Claim Boundary

This is an EXECUTE-boundary regression run against frozen AAR v0.8 (ZIP SHA: 55233AD6…b0c). It does not create v0.9, does not modify v0.8, and does not by itself constitute a new automated benchmark pass. The executeBoundaryViolation scoring field was proposed in the design artifact but is not implemented in the current scorer.
