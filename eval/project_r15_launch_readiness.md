# r15 Launch Readiness

This document is the executable counterpart to the existing r15 readiness
artifacts (`project_r15_preregistration_plan.md`,
`project_r15_baseline_audit.md`, `project_r15_b1_baseline_authorization_plan.md`).
It records the actual state of the launch substrate after the r15 seed-case
substrate landed. It does not pretend any baseline metric exists where none
has been computed.

## Status snapshot

| Item                          | Status                                  |
| ----------------------------- | --------------------------------------- |
| Seed substrate                | Ready after validation (this branch)    |
| v6.3 baseline                 | NOT yet executed                        |
| r15 launch                    | NOT launched                            |
| Model / API evaluation runs   | NOT run                                 |
| Frozen results modifications  | NONE on this branch                     |
| API keys                      | NOT touched                             |

The seed substrate is locally validated. Nothing on this branch runs an answer
model or a judge model; nothing on this branch promotes a candidate.

## What "ready after validation" means here

The r15 seed-case substrate added by this branch is "ready" in the following
specific sense:

- `eval/cases_r15_seed/r15_seed_cases.json` is a 12-case file that loads
  cleanly through `eval/lib/loadCases.js` (verified locally with
  `CASE_DIR=cases_r15_seed npm run check:cases`).
- Every case carries the r15 diagnostic fields and is class-balanced
  (3 missing_info, 3 hard_blocker, 3 authority_transfer, 3 unauthorized_work),
  verified by `eval/scripts/check-r15-seed-cases.js`.
- A v1 judge prompt exists at `eval/judge_prompts/r15_judge_prompt.v1.txt`
  with explicit definitions of HCV, TypeA, legacy OverEnum, PrimitiveMatch,
  A-OverEnum, B-OverEnum, the contradiction protocol (Option A), the
  anti-aesthetic-drift rule, evidence requirements, and the required JSON
  output schema.
- `npm run check:esm` and `npm test` both pass with the substrate in place.

"Ready after validation" does NOT mean:

- Any model has been run against the substrate.
- Any judge has been run against the substrate.
- Any baseline number exists.
- r15 is launched.
- v6.3 is unfrozen.
- v6.7 is promoted beyond its current targeted scope.

## v6.3 baseline: not yet executed

The B1 baseline authorization plan in `project_r15_b1_baseline_authorization_plan.md`
remains the source of truth for what executing the v6.3 baseline requires. As
of this branch, no baseline run has been performed. No baseline number is
recorded. No `eval/results/` artifacts have been added or modified by this
branch.

## r15 launch: not launched

r15 has not launched. The seed substrate is a precondition for an honest r15
gate, not a launch artifact. Promotion still gates on legacy OverEnum on the
designated holdout corpus. v6.3 remains the global/default champion. v6.7
remains targeted-only for missing-information / clarification-expected blocker
cases.

## Model / API evaluation runs: not run

This branch does not invoke `scripts/run-eval.js`,
`scripts/run-frontier-matrix.js`, `scripts/rejudge-existing.js`, or
`scripts/check-model-access.js`. No tokens are consumed by validating this
branch.

## What this branch does change

- Adds `eval/cases_r15_seed/r15_seed_cases.json` (12 hand-written cases).
- Adds `eval/fixtures/r15_seed_cases.json` (mirror copy for fixture use).
- Adds `eval/judge_prompts/r15_judge_prompt.v1.txt` (v1 judge prompt).
- Adds `eval/project_r15_seed_case_design.md` (design doc for the substrate).
- Replaces this `eval/project_r15_launch_readiness.md` with the executable
  counterpart that reflects substrate state honestly.
- Adds `eval/scripts/check-r15-seed-cases.js` (substrate validator).
- Adds top-level `PATCH_MANIFEST.md` (per-file change manifest).

## What this branch does not change

- `eval/cases/` (frozen dev corpus, 40 cases).
- `eval/cases_holdout/`, `eval/cases_holdout_large/` (frozen holdouts).
- `eval/results/` (frozen results).
- Any model client or API-key configuration.
- Any existing test (`eval/test/*.test.js`).
- The other r15 planning documents
  (`project_r15_preregistration_plan.md`,
  `project_r15_baseline_audit.md`,
  `project_r15_b1_baseline_authorization_plan.md`,
  `project_r15_primitive_schema_draft.md`,
  `project_r14b_v67_targeted_promotion_memo.md`).

## Promotion-gate posture

PrimitiveMatch, A-OverEnum, and B-OverEnum remain diagnostic only. Legacy
OverEnum remains the r15 promotion-gate metric. The v1 judge prompt's
contradiction protocol is Option A: rows with apparent diagnostic
disagreement count as `legacy_overenum = true` and are not marked invalid
unless the judge output is unparsable.
