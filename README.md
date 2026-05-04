# Constraint Enumeration Eval

Constraint Enumeration is a decision-quality eval for real-world prompts where a model can answer too quickly, optimize for the most salient local feature, and miss the full conjunction of constraints required for a useful recommendation.

This repo evaluates whether a constraint-first system prompt reduces those failures relative to plain, careful, constraint-axis, style-matched, and no-enumeration controls.

## Current release: v6.1

v6.1 is the frontier-lab threshold release. It keeps the v5.1 production-prompt harness and adds the pieces needed to test whether the effect is large enough to matter to a frontier lab or production AI team.

New in v6.1:

Critical v6.1 fixes:

- Same-vendor judge warnings now compare the configured answer provider and judge provider across Anthropic, OpenAI, and Google/Gemini.
- Frontier reports now require `LAB_MANIFEST`; they no longer scan every historical summary in `results/`.
- Default `PRIMARY_CONDITION` is now `production_constraint_prompt`, matching the frontier matrix runner.
- The matrix runner skips compatible completed summaries on restart and writes a partial manifest after each completed run. Use `FORCE_RERUN=true` to override.


- Added `ANSWER_PROVIDER` support for Anthropic, OpenAI, and Gemini/Google answer models, not just Anthropic answer generation.
- Added `eval/lib/answerModel.js` with shared answer-model dispatch, retries, OpenAI reasoning/refusal handling, and Gemini extraction.
- Added `npm run eval:frontier-matrix` to run multiple answer-model specs and automatically rejudge each run across multiple judge families.
- Added `npm run eval:frontier-dry-run` to print the exact matrix commands before spending API budget.
- Added `npm run report:frontier` to summarize whether the primary prompt beats the strongest serious control, not just baseline.
- Added `FRONTIER_LAB_PROTOCOL.md` with the 100-300 case benchmark plan, cross-vendor judging, cheaper-model comparison, and human-review workflow.
- Added `cases_holdout_large/README.md` as the landing zone for independently authored 100+ case corpora.
- Updated model-access checks to validate answer, judge, and optional style-rewrite models across Anthropic/OpenAI/Gemini.

Included from v5.1:

- `paired_analysis` / `paired_delta_summary` follow `PRIMARY_CONDITION` versus `baseline` instead of hardcoding `skill - baseline`.
- Gate sensitivity includes `primary_minus_*` rows, so `production_constraint_prompt` runs show alternate-gate robustness directly.
- Cross-vendor rejudge documentation includes `CASE_DIR`, `PRIMARY_CONDITION`, and matching `PAIRWISE_COMPARISONS` to avoid cases-hash mismatches.
- `npm run report` prints length-quartile pass-rate breakdowns and primary-condition gate sensitivity.
- OpenAI text extraction uses extracted output blocks only and skips reasoning/refusal blocks explicitly.

Included from v5.0:

- Added `production_constraint_prompt` and `SKILL_PRODUCTION.md`.
- Added arbitrary pairwise comparisons through `PAIRWISE_COMPARISONS`.
- Added `PRIMARY_CONDITION` so the harness can test a production prompt as the headline condition.
- Added `npm run eval:breakthrough`, `npm run make:large-holdout-prompt`, `npm run export:human-review`, and `npm run report`.
- Added `BREAKTHROUGH_PROTOCOL.md` for 100+ case runs, cross-vendor rejudges, and human blind review.

Included from v4.0:

- Added `constraint_axis_prompting` and `style_matched_baseline` controls.
- Default pass gate no longer depends on `considers_binding_constraints_implicitly`; that field is diagnostic only.
- Added gate-sensitivity tables, case-level bootstrap CIs, length-quartile pass-rate breakdowns, p50/p90 answer-length stats, answer truncation tracking, Gemini judge support, `not_acceptable_final_answers`, delimiter-injection hardening, OpenAI refusal/reasoning handling, null-prototype grouping, Node 20+, package lock, unit tests, GitHub Actions CI, and `CASE_DIR` support.

## Core claim being tested

A useful real-world recommendation must satisfy a conjunction:

```text
constraint application
AND correct final answer
AND decision usefulness
AND no hard-constraint violation
AND no unnecessary clarification
AND no harmful over-enumeration
```

The judge fills structured fields. The official pass/fail score is computed in code using an AND gate. The judge does not directly decide pass/fail.

`considers_binding_constraints_implicitly` and `enumerates_binding_constraints_explicitly` are still recorded, but they are diagnostics rather than default gate requirements.

## Architecture

```text
Cases -> model answer -> structured judge -> code gate -> metrics -> JSONL artifacts
```

The browser never sends arbitrary `system`, `messages`, or `max_tokens`. The server controls the prompt, model, temperature, case lookup, judge prompt, and token budget.

For full runs, prefer the CLI. The browser UI is useful for spot checks and small local runs, but long evals can exceed serverless request time limits.

## Quick start

```bash
cd eval
cp .env.example .env.local
npm install
npm run ci
npm run check:models
npm run smoke
```

`npm run check:models` requires valid API keys. It verifies that the configured answer and judge model IDs are actually available to your account.

## Recommended frontier-lab run

For a lab-relevant result, do not headline `primary - baseline`. Headline `primary - strongest serious control`, where the serious controls are usually `careful_control`, `constraint_axis_prompting`, and the full `skill`.

First generate and review the exact command matrix without spending API budget:

```bash
cd eval
CASE_DIR=cases_holdout_large \
TRIALS=3 \
LAB_ANSWER_SPECS=anthropic:claude-sonnet-4-6 \
LAB_JUDGE_SPECS=anthropic:claude-opus-4-7,openai:gpt-5.1,google:gemini-2.5-pro \
npm run eval:frontier-dry-run
```

Then run it:

```bash
CASE_DIR=cases_holdout_large \
TRIALS=3 \
PRIMARY_CONDITION=production_constraint_prompt \
EVAL_CONDITIONS=baseline,careful_control,constraint_axis_prompting,style_matched_baseline,skill,production_constraint_prompt \
PAIRWISE_COMPARISONS=production_constraint_prompt:baseline,production_constraint_prompt:careful_control,production_constraint_prompt:constraint_axis_prompting,production_constraint_prompt:style_matched_baseline,production_constraint_prompt:skill \
LAB_ANSWER_SPECS=anthropic:claude-sonnet-4-6 \
LAB_JUDGE_SPECS=anthropic:claude-opus-4-7,openai:gpt-5.1,google:gemini-2.5-pro \
npm run eval:frontier-matrix
```

Generate the lab threshold report from the manifest printed by the matrix runner:

```bash
LAB_MANIFEST=results/<frontier-lab-run>.manifest.json npm run report:frontier
```

For a cheaper-model comparison, add a second answer model to `LAB_ANSWER_SPECS`, for example:

```bash
LAB_ANSWER_SPECS=anthropic:claude-sonnet-4-6,openai:gpt-5.1,google:gemini-2.5-pro \
npm run eval:frontier-matrix
```

The frontier-lab threshold is roughly: 100+ independently authored cases, primary prompt beats the strongest serious control by 5-10pp, bootstrap CI is directionally positive or excludes zero, hard-constraint violations fall materially, answer length does not rise, and the direction holds under multiple judge families.

## Held-out cases

The included `eval/cases` corpus is an in-sample development set. The included `eval/cases_holdout` folder is a 20-case pilot. Use `eval/cases_holdout_large` for 100-300 independently authored cases.

Create a larger held-out case-generation prompt with:

```bash
cd eval
NUM_CASES=100 npm run make:large-holdout-prompt
```

Give the printed prompt to a separate person or model that has not read `SKILL.md` or `SKILL_PRODUCTION.md`. Then save four JSON arrays into:

```text
eval/cases_holdout_large/physical.json
eval/cases_holdout_large/ambiguity.json
eval/cases_holdout_large/business.json
eval/cases_holdout_large/safety.json
```

Validate with:

```bash
CASE_DIR=cases_holdout_large npm run check:cases
```

## Environment variables

Create `eval/.env.local`. The complete template is in `eval/.env.example`; the minimal frontier matrix configuration is:

```bash
ANSWER_PROVIDER=anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-6
ANTHROPIC_VERSION=2023-06-01

OPENAI_API_KEY=
OPENAI_ANSWER_MODEL=gpt-5.1

GEMINI_API_KEY=
GEMINI_ANSWER_MODEL=gemini-2.5-pro

JUDGE_PROVIDER=anthropic
JUDGE_MODEL=claude-opus-4-7
OPENAI_JUDGE_MODEL=gpt-5.1
GEMINI_JUDGE_MODEL=gemini-2.5-pro

ANSWER_TEMPERATURE=0
JUDGE_TEMPERATURE=0

PRIMARY_CONDITION=production_constraint_prompt
EVAL_CONDITIONS=baseline,careful_control,constraint_axis_prompting,style_matched_baseline,skill,production_constraint_prompt
PAIRWISE_COMPARISONS=production_constraint_prompt:baseline,production_constraint_prompt:careful_control,production_constraint_prompt:constraint_axis_prompting,production_constraint_prompt:style_matched_baseline,production_constraint_prompt:skill

CASE_DIR=cases_holdout_large
TRIALS=3
```

Temperature handling is provider/model-aware. Some OpenAI reasoning models reject sampling parameters, so the request builder omits temperature when required.

## Case set

The included case set has 40 cases across four categories:

```text
physical
ambiguity
business
safety
```

The case set intentionally mixes direct-answer, clarification-expected, and either-acceptable cases across categories so category does not become a proxy for expected behavior.

Schema v1.1 separates facts, constraints, conclusions, and unacceptable answers:

```json
{
  "schema_version": "1.1",
  "id": "car_wash_50m",
  "category": "physical",
  "prompt": "I need to get my car washed. The car wash is 50m away. Should I walk or drive?",
  "expected_behavior": "direct_answer",
  "requires_direct_answer": true,
  "clarification_expected": false,
  "expected_final_answer": "drive",
  "acceptable_final_answers": [
    "drive",
    "drive the car",
    "take the car through the car wash"
  ],
  "not_acceptable_final_answers": [
    "A recommendation that optimizes for short distance instead of moving the car."
  ],
  "observed_facts": [
    "The goal is to get the car washed, not merely to move the person"
  ],
  "hard_constraints": [
    "The car must physically arrive at the car wash",
    "Walking alone does not move the car"
  ],
  "soft_preferences": [
    "The car wash is close"
  ],
  "required_inference": [
    "drive"
  ],
  "prohibited_failure_modes": [
    "Optimizes for short distance instead of moving the car"
  ]
}
```

Validation enforces:

```text
schema_version is "1.0" or "1.1"
category matches the source case filename
requires_direct_answer and clarification_expected cannot both be true
v1.1 hard_constraints is non-empty
expected_final_answer exists
acceptable_final_answers defaults to [expected_final_answer]
not_acceptable_final_answers defaults to []
```

`binding_constraints`, `soft_constraints`, and `common_failure_modes` are still emitted as compatibility aliases after loading cases, but new cases should use v1.1 fields.

## Conditions and ablations

Default conditions:

```text
baseline
skill
```

Optional conditions:

```text
careful_control
step_by_step_control
constraint_axis_prompting
constraint_check_no_enumeration
style_matched_baseline
skill_concise
```

Interpretation:

- `careful_control`: realistic deployment floor; use `skill - careful_control` as the headline lift.
- `constraint_axis_prompting`: tests whether generic constraint-category priming is enough.
- `constraint_check_no_enumeration`: tests whether invisible constraint checking is enough.
- `style_matched_baseline`: tests whether the judge is rewarding enumerated style rather than decision quality.
- `skill_concise`: tests whether the protocol survives a verbosity constraint.

## Scoring

The structured judge returns fields including:

```json
{
  "considers_binding_constraints_implicitly": true,
  "enumerates_binding_constraints_explicitly": true,
  "applies_constraints_correctly": true,
  "final_answer_correct": true,
  "answer_is_decision_useful": true,
  "ignored_relevant_soft_constraints": false,
  "violates_hard_constraint": false,
  "asks_unnecessary_clarification": false,
  "over_enumerates_irrelevant_constraints": false,
  "missed_constraints": [],
  "failure_modes": [],
  "reason": "The answer recognized that the car itself must get to the car wash."
}
```

Default pass/fail logic:

```js
const pass =
  j.applies_constraints_correctly === true &&
  j.final_answer_correct === true &&
  j.answer_is_decision_useful === true &&
  j.violates_hard_constraint === false &&
  j.asks_unnecessary_clarification === false &&
  j.over_enumerates_irrelevant_constraints === false;
```

Alternate gates are reported under `absolute_summary.*.gate_sensitivity`, including the older v3 strict gate that also required `considers_binding_constraints_implicitly`.

## Metrics

Primary metrics:

```text
constraint_failure_rate
pass_rate
paired skill-minus-control delta with bootstrap CI
pairwise skill/baseline win/loss/tie rates
```

Diagnostics:

```text
gate_sensitivity
answer_length p50/p90/mean
pass_rate_by_answer_length_quartile
answer_truncation_rate
invalid_judge_response_rate
same-vendor warning
margin-weighted pairwise score, explicitly diagnostic only
```

Pass rate is intentionally strict. `constraint_failure_rate` is the cleaner headline failure metric; pass rate is a supporting diagnostic.

## Reproducibility and provenance

Each result row records:

```text
skill_sha256
cases_sha256
run_config_sha256
answer_stats
answer_stop_reason
answer_truncated
judge fields
code-computed score
```

Resume behavior refuses to mix results with different skill, case, or run-config hashes. `EVAL_CONDITIONS` is canonicalized before hashing, so `baseline,skill` and `skill,baseline` hash identically and execute in the canonical order required by `style_matched_baseline`.

## Pairwise judging

Pairwise modes:

```text
gold_anchored
gold_blind
```

`gold_anchored` receives the expected answer and case constraints. `gold_blind` only receives the user prompt and the two candidate answers. Both serialize candidate answers as JSON strings to reduce delimiter-injection risk.

Use `DOUBLE_SWAPPED_PAIRWISE=true` for publishable runs so each pair is judged with both A/B orders.

Margin-weighted pairwise scores are retained for exploration only. Headline pairwise claims should use win/loss/tie rates.

## Tests and CI

Local:

```bash
cd eval
npm run ci
```

CI runs:

```text
npm install
npm run check:cases
npm run check:esm
npm test
```

Unit tests cover:

```text
score gate behavior
McNemar approximation on a known input
bootstrap CI shape
prototype-safe grouping
seeded randomness
case loading and normalization
```

## What would falsify the result?

Any of the following should be treated as a serious negative result:

- The primary prompt beats `baseline` but not `careful_control`.
- The primary prompt beats `baseline` but not `constraint_axis_prompting`.
- `style_matched_baseline` reaches primary-prompt-like pass rates without changing the baseline decision.
- The lift disappears under OpenAI or Gemini rejudging.
- The lift exists only in the longest answer-length quartile.
- Held-out cases show materially smaller or reversed lift relative to the in-sample corpus.

## Publication checklist

Before making a public claim:

```text
1. Freeze SKILL.md and case corpus.
2. Add an independently authored held-out set via CASE_DIR.
3. Run at least 3 trials per condition.
4. Include baseline, careful_control, constraint_axis_prompting, style_matched_baseline, skill, and production_constraint_prompt.
5. Use double-swapped pairwise judging.
6. Rejudge with at least one non-Anthropic judge; preferably OpenAI and Gemini.
7. Report bootstrap CIs over case-level paired deltas.
8. Report gate sensitivity and length-quartile metrics.
9. Human-audit judge disagreements, baseline wins, style-matched wins, and truncations.
10. Treat same-vendor-only results as directional.
```

## License

MIT

## v6: Frontier-lab matrix

v6 adds cross-provider answer generation and an orchestration layer for lab-relevant runs. Use `FRONTIER_LAB_PROTOCOL.md` when you want to test the threshold that would make a frontier lab care: 100-300 independently authored cases, multiple answer models, multiple judge families, strongest-control reporting, and optional human blind review.

Common commands:

```bash
cd eval
NUM_CASES=100 npm run make:large-holdout-prompt
DRY_RUN=true CASE_DIR=cases_holdout_large npm run eval:frontier-matrix
CASE_DIR=cases_holdout_large npm run eval:frontier-matrix
LAB_MANIFEST=results/<manifest>.json npm run report:frontier
```
