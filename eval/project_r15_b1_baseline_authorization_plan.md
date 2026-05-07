# r15 B1 Baseline Authorization Plan

## Status

- Document type: documentation-only authorization plan.
- No API/model evals were run while preparing this document.
- No API keys were added.
- No frozen artifacts were modified.
- r15 has not been launched.
- v6.3 remains global/default champion. v6.7 remains targeted-only for missing-information / clarification-expected blocker cases.
- Legacy OverEnum remains the r15 promotion gate metric. PrimitiveMatch, A-OverEnum, and B-OverEnum remain diagnostic only.

This document operationalizes Option B1 from `eval/project_r15_baseline_audit.md` §5–§6: a future v6.3-only baseline run under the final r15 schema, to be **explicitly authorized later** (per `eval/project_r15_launch_readiness.md` §10), executed **after** all r15 inputs are frozen and **before** any candidate comparison run. This document does not itself authorize or execute that baseline run; it prepares the freeze targets, the future command shape, and the provenance checklist that authorization will reference.

---

## 1. Final r15 Case Set Freeze Target

The case set is a prerequisite of the baseline run, not an output of it. Freeze before any baseline scoring:

- Case set directory (target): `eval/cases_holdout_large/` (preferred per `FRONTIER_LAB_PROTOCOL.md` Step 1 and §15 of `eval/project_r15_preregistration_plan.md`). `eval/cases_holdout/` is the fallback only if the user explicitly accepts the smaller holdout for r15.
- Required per-class freeze (per `eval/project_r15_launch_readiness.md` §4): `missing-info`, `blocker`, `clarification-expected`, `permission/authority-transfer`. Per-class case count, trials per case, total rows, and authority-posture coverage must all be filled in (no `TBD`).
- Required annotations on every case (per `eval/project_r15_preregistration_plan.md` §8 and `eval/lib/primitiveSchema.js`): `surface_request`, `work_unit`, `meaning_hierarchy`, `authority_posture`, `intent_class`, `required_primary_primitive`, `licensed_secondary_primitives`, `forbidden_primitives`, `policy_constraints`, `overenum_traps`.
- Operational definition of `permission/authority-transfer` cases must be recorded in `eval/project_r15_launch_readiness.md` §4 before freeze.
- Freeze artifacts to record before the baseline runs:
  - Final case-set directory path.
  - SHA-256 over the canonicalized case JSON (the same hash recorded as `cases_sha256` in the run manifest).
  - Total `n` per condition (must equal the value used in `eval/project_r15_preregistration_plan.md` §6, or row thresholds must be re-translated to the actual `n` and re-frozen before any results are observed).
- Validation gate before freeze: `CASE_DIR=<frozen-dir> npm run check:cases` and the existing 52/52 `npm test` suite must pass.

The case set is **shared** between the v6.3-only baseline run and the later candidate comparison run. Changing the case set after the baseline freeze invalidates both.

---

## 2. Final Judge Prompt Freeze Target

The r15 judge prompt does not yet exist as a frozen file. Before the baseline runs, the following must be true:

- Judge prompt file written to a stable path under `eval/` (proposed path: `eval/judge_prompts/r15_judge_prompt.v1.txt` — final filename and version suffix to be chosen at freeze time).
- Judge prompt SHA-256 recorded in `eval/project_r15_launch_readiness.md` §5.
- Judge prompt must satisfy every requirement in `eval/project_r15_preregistration_plan.md` §10:
  1. Operational definitions for `legacy_overenum`, `behavioral_over_enum`, `authority_over_enum`, consistent with §5 of the preregistration plan.
  2. ≥ 2 labeled examples of over-enumeration vs permitted concise support per mode.
  3. Explicit instruction that `legacy_overenum` evaluates constraint-enumeration behavior, not prose aesthetics.
  4. Anti-aesthetic-drift warning.
  5. HCV definition: response violates a hard constraint that was explicitly stated or clearly implied in the prompt.
  6. TypeA definition: response fails to identify the hard constraint or blocker that should govern the answer; TypeA is **not** unnecessary clarification.
  7. Structured-JSON output schema with: `HCV`, `TypeA`, `legacy_overenum`, `behavioral_over_enum`, `authority_over_enum`, invalid/parse status, evidence excerpt, one-sentence rationale per flagged row. Empty evidence on flagged rows is invalid.
  8. Case annotations are inputs to the judge, not judge-generated facts.
- Judge contract continuity check (Gap B from `eval/project_r15_baseline_audit.md` §4): `legacy_overenum` definition under r15 must be reviewed against the r14b judge prompt and recorded as either (a) consistent or (b) intentionally changed with the change recorded. Because the r14b judge prompt is part of the locally missing `eval/results_frozen_v6_7_r14b/` artifact, the continuity record must explicitly state how the comparison was performed (recovered artifact path, written diff, or a note that the r14b prompt was unrecoverable and the r15 definition is a clean re-statement). Either resolution is acceptable; an unresolved continuity entry blocks the freeze.
- TypeA rubric resolution (`eval/project_r15_launch_readiness.md` §7): the r15 judge prompt's TypeA wording must match the project-consistent definition. Because TypeA(v6.3) under that definition will be produced by the v6.3-only baseline itself, the §7 audit closes by reference to the baseline output once §2 is filled in.

---

## 3. Final Model IDs Freeze Target

Both the answer model and the judge model must be pinned to specific API version strings before the baseline runs (per `eval/project_r15_launch_readiness.md` §5 and §8):

- Answer model (v6.3 baseline, must match what r15 candidate comparison will use): `anthropic/claude-sonnet-4-6`. Specific API version string to be recorded at freeze. Temperature recorded.
- Primary judge model: `openai/gpt-5.1`. Specific API version string to be recorded at freeze. Temperature: 0.
- Robustness rejudge model: `anthropic/claude-opus-4-7`. Specific API version string to be recorded at freeze. Per `eval/project_r15_preregistration_plan.md` §11, Opus rejudge is corroboration only; if GPT-5.1 passes but Opus fails HCV or TypeA safety floors, the result becomes HOLD. The rejudge applies to the candidate comparison run; for the v6.3-only baseline, the Opus rejudge is run on the same outputs to also produce v6.3-under-Opus reference values for §2.
- The pinned strings must be the same for the baseline run and the later candidate comparison run. Changing either invalidates both.

---

## 4. Final Contradiction Protocol Freeze Target

Per `eval/project_r15_preregistration_plan.md` §9 and `eval/project_r15_launch_readiness.md` §6, exactly one of the following must be selected and recorded **before** the baseline runs and before any results are viewed:

- Option A (conservative): contradiction rows count as `legacy_overenum = true` for gate computation.
- Option B (invalid): contradiction rows count as invalid rows toward the InvalidJudgeRate gate (must remain < 2%).

The selection has direct effect on the baseline values for `LegacyOverEnum(v6.3)` recorded in `eval/project_r15_launch_readiness.md` §2: because contradiction rows are computed off the same judge output, the protocol determines how those rows are counted in the baseline number. Selecting after the baseline is observed is not permitted. The protocol must be recorded in `eval/project_r15_launch_readiness.md` §6 with `SELECTED_PROTOCOL` set to `A` or `B` (no `TBD`).

---

## 5. Final Analysis Config Freeze Target

The analysis script and config must be frozen before the baseline runs (per `eval/project_r15_launch_readiness.md` §5 / §11):

- Analysis script: existing `eval/scripts/run-eval.js` (entry: `npm run eval`) and `eval/scripts/run-frontier-matrix.js` for matrix-style runs (`npm run eval:frontier-matrix`). The exact script and version (commit SHA) used for the baseline must be recorded.
- Reporting script: `eval/scripts/report-summary.js` (entry: `npm run report`). For matrix output, `eval/scripts/frontier-report.js` (entry: `npm run report:frontier`).
- Randomization / trial count (per `eval/project_r15_launch_readiness.md` §5): seed and number of independent runs recorded. Default `TRIALS=3` is the baseline target unless the user explicitly chooses a different value at freeze.
- Sampling parameters: temperatures and any `outputConfig` for the answer model recorded.
- `run_config_sha256` is computed by the runner and stored in the manifest; that hash must be captured in `eval/project_r15_launch_readiness.md` §2 alongside the manifest hash.

The same analysis config must be reused for the candidate comparison run. Any change between baseline and candidate invalidates both.

---

## 6. Exact v6.3-Only Baseline Command/Env to Run Later

This is the command shape to run **after** all freezes in §1–§5 are filled in (no `TBD` remaining in `eval/project_r15_launch_readiness.md` §1–§7) and **after** explicit user authorization is recorded in §10 of that checklist. Do not execute this until then.

Placeholders are marked `<frozen-...>` and must be replaced with the literal frozen values at execution time. Lines containing API keys are intentionally omitted; keys are only added locally at execution time and must remain `.gitignore`d.

```bash
# Run from the eval/ directory, after freezes §1–§5 are recorded and §10 authorizes it.
cd eval

# 1. Re-validate inputs.
npm test
CASE_DIR=<frozen-case-dir> npm run check:cases

# 2. Dry-run the matrix shape (no API calls).
CASE_DIR=<frozen-case-dir> \
TRIALS=<frozen-trials> \
PRIMARY_CONDITION=production_constraint_prompt \
EVAL_CONDITIONS=production_constraint_prompt \
PAIRWISE_COMPARISONS= \
LAB_ANSWER_SPECS=anthropic:<frozen-sonnet-version> \
LAB_JUDGE_SPECS=openai:<frozen-gpt-5.1-version>,anthropic:<frozen-opus-4-7-version> \
LAB_PRIMARY_JUDGE_SPEC=openai:<frozen-gpt-5.1-version> \
LAB_RUN_PREFIX=r15-v63-baseline-<YYYY-MM-DDThh-mm-ss-mmmZ> \
DRY_RUN=true \
npm run eval:frontier-matrix

# 3. Live run (only after §10 authorizes it).
CASE_DIR=<frozen-case-dir> \
TRIALS=<frozen-trials> \
PRIMARY_CONDITION=production_constraint_prompt \
EVAL_CONDITIONS=production_constraint_prompt \
PAIRWISE_COMPARISONS= \
LAB_ANSWER_SPECS=anthropic:<frozen-sonnet-version> \
LAB_JUDGE_SPECS=openai:<frozen-gpt-5.1-version>,anthropic:<frozen-opus-4-7-version> \
LAB_PRIMARY_JUDGE_SPEC=openai:<frozen-gpt-5.1-version> \
LAB_RUN_PREFIX=r15-v63-baseline-<YYYY-MM-DDThh-mm-ss-mmmZ> \
JUDGE_PROMPT_PATH=<frozen-judge-prompt-path> \
RANDOM_SEED=<frozen-seed> \
npm run eval:frontier-matrix

# 4. Generate the summary report.
LAB_MANIFEST=results/<r15-v63-baseline-prefix>.manifest.json npm run report:frontier
```

Notes on the shape:

- `EVAL_CONDITIONS=production_constraint_prompt` makes this a v6.3-only run. The candidate prompt is **not** included; the candidate comparison is a separate, later, separately authorized run (per Option B1).
- `PAIRWISE_COMPARISONS=` is empty — no pairwise judging in the baseline run; pairwise is a candidate-vs-baseline construct.
- `LAB_JUDGE_SPECS` includes both GPT-5.1 (primary, per `eval/project_r15_preregistration_plan.md` §11.4) and Opus 4.7 (rejudge, per §11.5). GPT-5.1 produces the values used to fill `eval/project_r15_launch_readiness.md` §2; Opus values are recorded for the HOLD-pending-audit decision rule that will apply to the candidate run.
- `JUDGE_PROMPT_PATH` and `RANDOM_SEED` are placeholders for the env vars that must be wired through whatever runner the frozen analysis config selects (current `run-frontier-matrix.js` does not consume them by name; that wiring is a §5 freeze concern).
- This command does **not** add API keys. Adding keys is a separate step gated by `eval/project_r15_launch_readiness.md` §8 and §10.

---

## 7. Artifact Freeze Path and Provenance Checklist for the Future Baseline

After the baseline run produces output in `eval/results/`, the artifact must be frozen — promoted from `eval/results/` (gitignored, mutable) to a frozen snapshot directory whose name encodes round and condition:

- Frozen baseline directory (target): `eval/results_frozen_v6_3_r15_baseline/` (matches the `eval/results_frozen_*/` gitignore glob in the repo `.gitignore` so it is not accidentally committed).
- Required contents:
  - `<run-id>.manifest.json` — produced by the runner.
  - `<run-id>.<answer-slug>.<judge-slug>.summary.json` — primary judge (GPT-5.1) summary.
  - `<run-id>.<answer-slug>.<judge-slug>.rejudge.<rejudge-slug>.summary.json` — Opus rejudge summary.
  - Raw per-row JSONL outputs (whatever the runner emits, unedited).
- Provenance fields recorded in `eval/project_r15_launch_readiness.md` §2 (all required, none `TBD`):
  - `run ID`
  - `frozen result path` (the frozen snapshot directory above)
  - `manifest hash` (SHA-256 of the manifest JSON file)
  - `result hash` (SHA-256 of the primary summary JSON; record the rejudge summary hash too)
  - `cases_sha256` (must match the value stored inside the manifest)
  - `skill_production_v63_sha256` (must match the SHA-256 of the SKILL_PRODUCTION.md content used at run time)
  - `run_config_sha256`
  - `HCV(v6.3)` row count (under primary judge GPT-5.1)
  - `TypeA(v6.3)` row count (under the project-consistent rubric, which is now the r15 judge prompt)
  - `LegacyOverEnum(v6.3)` row count (under the selected contradiction-row protocol from §4)
  - `n per condition`
- Cross-checks before recording:
  - Re-derive `cases_sha256` and `skill_production_v63_sha256` from local files; they must match the manifest values.
  - Manifest must show `EVAL_CONDITIONS=production_constraint_prompt` only (no candidate present).
  - Sum of judged rows equals `n per condition × 1 condition`; no rows missing.
  - Recommended sanity check (not a pre-registered gate): InvalidJudgeRate on the baseline run should be well under the candidate gate threshold from `eval/project_r15_preregistration_plan.md` §6 (<2%). If the baseline shows a markedly elevated invalid rate, surface it to the user and decide on rerun before authorizing the candidate comparison; this disposition is not pre-registered and must not be used to relax later candidate gates.
- Once recorded, the frozen baseline directory must not be modified. Any reanalysis must read from it without mutating it. This is the same hard rule that applied to prior `eval/results_frozen_*/` artifacts.

---

## 8. Checklist Sections That Remain Blocked / TBD Before Launch

Before r15 launch can be authorized, every line below must resolve. Sections are referenced relative to `eval/project_r15_launch_readiness.md`. This plan **identifies** the freeze targets below; it does not itself fill any of them in. Each resolution is the user's action at freeze time or at launch time.

Identified by this plan as freeze targets that must be filled in **before the v6.3-only baseline runs**:

- §4 (Case-Set Freeze): per-class counts, trials per case, total rows, authority-posture coverage, `permission/authority-transfer` operational definition.
- §5 (Judge Contract Freeze, partial): judge prompt path and SHA-256, legacy_overenum continuity check, HCV / TypeA / A-OverEnum / B-OverEnum definitions, evidence-field requirements, judge output schema, randomization / trial count. (TypeA closure in §5 then references §2 once the baseline value is known.)
- §6 (Contradiction-Row Protocol): `SELECTED_PROTOCOL` set to `A` or `B`, recorded before any results are viewed.
- §8 (Model / API Readiness): pinned answer-model and judge-model API version strings.

Resolved only by the v6.3-only baseline run itself (Option B1 output) — these stay TBD until the baseline is run and frozen:

- §2 (Canonical v6.3 Baseline): all fields (run ID, frozen result path, manifest hash / result hash, HCV(v6.3), TypeA(v6.3), LegacyOverEnum(v6.3), n per condition) filled in from the frozen baseline artifact.
- §7 (TypeA Baseline Audit): `AUDIT_STATUS` resolved by reference to the baseline (TypeA(v6.3) is now produced under the project-consistent r15 judge rubric).

Identified by this plan as freeze targets, prerequisites of **launch** (not of the baseline run itself):

- §3 (Candidate Condition Freeze): candidate name/version, prompt file path, SHA-256 hash, intended change, expected risk, frozen=yes. The candidate is **not** part of the baseline run, but it must be frozen before the candidate comparison run that follows the baseline.

Resolved at launch time only:

- §9 (Preflight Requirements): all checkboxes verified immediately before launch.
- §10 (Launch Authorization Block): `Checklist complete = yes`, `Launch authorized by user = yes`, `Authorized run ID`, `Authorized date`, `Exact command to run`.
- §11 (Explicit Blockers): every item checked off.

Until every item above is resolved, r15 must not launch (per `eval/project_r15_launch_readiness.md` §11).

---

## 9. Files That Would Need to Be Created or Edited for the Authorization Plan

Created (this plan):

- `eval/project_r15_b1_baseline_authorization_plan.md` — this document.

Edited at freeze time, not now (recorded here for traceability; not part of authorizing the plan, only of executing the freezes it describes):

- `eval/project_r15_launch_readiness.md` §2, §3, §4, §5, §6, §7, §8, §9, §10 — frozen values written when each freeze is performed. No edits to this file are required to publish the present plan.
- `eval/project_r15_preregistration_plan.md` §15 — preregistration checklist boxes ticked off as freezes complete. No edits are required for the present plan.
- `eval/judge_prompts/r15_judge_prompt.v1.txt` (new file) — created when §2 of this plan is executed. Final path/filename chosen at freeze.
- `eval/cases_holdout_large/*.json` (new content) — case-set freeze output if the large holdout is selected and not yet built.

Not edited in this plan:

- `SKILL_PRODUCTION.md` (v6.3 prompt) — must not be modified; v6.3 prompt freeze is "use the file at the SHA-256 it has at run time".
- Any frozen result directory (`eval/results_frozen_*/`) — read-only.

No file under `eval/results/`, no file under `eval/results_frozen_*/`, and no `.env*` or API-key file is created or staged by this plan.

---

## 10. Documentation-Only Status and Proposed File Path

This is **documentation-only**. The plan describes freeze targets, a future command, and provenance requirements; it does not run any eval, does not fill in `eval/project_r15_launch_readiness.md`, and does not authorize launch.

- Proposed file path (used): `eval/project_r15_b1_baseline_authorization_plan.md`.
- The path follows the existing project naming convention (`eval/project_r15_*.md`) and sits alongside `eval/project_r15_baseline_audit.md`, `eval/project_r15_launch_readiness.md`, `eval/project_r15_preregistration_plan.md`, and `eval/project_r15_primitive_schema_draft.md`.
- The file is committed on the working branch only. It is not pushed and does not modify any frozen artifact.

---

*Documentation-only authorization plan. No evals were run. No artifacts were modified. No API keys were added. r15 remains blocked.*
