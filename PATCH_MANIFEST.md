# PATCH_MANIFEST — feature/r15-launch-substrate

This branch adds the executable r15 seed-case substrate for ConstraintGate /
Agent Authority Router. It does not run any answer model, judge model, or API
evaluation. It does not modify any frozen corpus or any frozen results.

## Files added

| Path                                           | Purpose                                                      |
| ---------------------------------------------- | ------------------------------------------------------------ |
| `eval/cases_r15_seed/r15_seed_cases.json`      | 12 hand-written r15 seed cases, loadable via the existing    |
|                                                | `eval/lib/loadCases.js`. Class-balanced 3/3/3/3 across       |
|                                                | `r15_category` ∈ {missing_info, hard_blocker,                |
|                                                | authority_transfer, unauthorized_work}.                      |
| `eval/fixtures/r15_seed_cases.json`            | Mirror copy of the seed cases for fixture use (identical     |
|                                                | content; lives under `eval/fixtures/` for tests/docs that    |
|                                                | want a non-loader-driven path).                              |
| `eval/judge_prompts/r15_judge_prompt.v1.txt`   | v1 judge prompt. Defines HCV, TypeA, legacy OverEnum,        |
|                                                | PrimitiveMatch, A-OverEnum, B-OverEnum, the contradiction    |
|                                                | protocol (Option A), the anti-aesthetic-drift rule, evidence |
|                                                | requirements, and the required JSON output schema.           |
| `eval/project_r15_seed_case_design.md`         | Design doc for the substrate.                                |
| `eval/scripts/check-r15-seed-cases.js`         | Substrate validator. Enforces 12 cases, 3 per r15_category,  |
|                                                | unique id and case_id, required r15 fields, primitives in    |
|                                                | the allowed 10-set, no overlap of forbidden with primary or  |
|                                                | licensed, missing-info forbids GIVE_RECOMMENDATION and       |
|                                                | RECOMMEND_NEAREST_SAFE_ALTERNATIVE, unauthorized-work has    |
|                                                | zero licensed_secondary_primitives.                          |
| `PATCH_MANIFEST.md`                            | This file.                                                   |

## Files replaced (content rewritten on this branch)

| Path                                          | Reason                                                       |
| --------------------------------------------- | ------------------------------------------------------------ |
| `eval/project_r15_launch_readiness.md`        | Replaced with the executable counterpart that records actual |
|                                               | substrate state and explicitly flags v6.3 baseline as NOT    |
|                                               | executed and r15 as NOT launched. The earlier readiness      |
|                                               | checklist content is operationally superseded by the         |
|                                               | preregistration plan and B1 baseline authorization plan,     |
|                                               | which are unchanged on this branch.                          |

## Files NOT modified

- `eval/cases/` (frozen dev corpus, 40 cases).
- `eval/cases_holdout/`, `eval/cases_holdout_large/` (frozen holdouts).
- `eval/results/` (frozen results).
- `eval/lib/loadCases.js`, `eval/lib/primitiveSchema.js` (loader/schema).
- `eval/test/*.test.js` (existing tests).
- Any model client or API-key configuration.
- The other r15 planning documents:
  - `eval/project_r15_preregistration_plan.md`
  - `eval/project_r15_baseline_audit.md`
  - `eval/project_r15_b1_baseline_authorization_plan.md`
  - `eval/project_r15_primitive_schema_draft.md`
  - `eval/project_r14b_v67_targeted_promotion_memo.md`

## Schema mapping decisions

The repo's existing case loader (`eval/lib/loadCases.js`) requires that each
case's `category` field exactly match the source filename without `.json`. The
seed file lives at `eval/cases_r15_seed/r15_seed_cases.json`, so every case
carries `"category": "r15_seed_cases"` to satisfy the loader. The conceptual
class is stored separately in `r15_category` (`missing_info`, `hard_blocker`,
`authority_transfer`, `unauthorized_work`).

Authority postures use the existing repo enum from
`eval/lib/primitiveSchema.js`: `ADVISE`, `EXECUTE`, `DEFER`, `STOP`. No new
postures were introduced. STOP is used for missing-info, hard-blocker, and
authority-transfer cases. EXECUTE is used for unauthorized-work narrow-fact
cases where the user has authorized exactly one fact.

Primitives use the existing 10-primitive set from
`eval/lib/primitiveSchema.js`. No new primitives were introduced.

## Validation commands run

The following validations were run locally on this branch and passed before
push:

```bash
cd eval
CASE_DIR=cases_r15_seed npm run check:cases    # → 12
CASE_DIR=cases_r15_seed node scripts/check-r15-seed-cases.js
                                               # → r15 seed-case validation
                                               #   passed: 12 cases, 3 per
                                               #   r15_category.
npm run check:esm                              # → ESM check passed.
npm test                                       # → 52/52 tests pass.
```

`CASE_DIR` is honored by the existing `check:cases` script via
`process.env.CASE_DIR` in `eval/lib/loadCases.js`. The existing dev-corpus
test in `eval/test/loadCases.test.js` always loads `cases/` regardless of
`CASE_DIR`, so adding the seed directory does not affect the dev test set.

## Posture statements

- r15 has NOT launched.
- v6.3 baseline has NOT executed.
- v6.3 remains the global/default champion.
- v6.7 remains targeted-only for missing-information / clarification-expected
  blocker cases.
- Legacy OverEnum remains the r15 promotion-gate metric.
- PrimitiveMatch, A-OverEnum, and B-OverEnum are diagnostic only.
- No model or API evaluation was run by this branch.
- No frozen results were modified by this branch.
- No API keys were touched by this branch.
