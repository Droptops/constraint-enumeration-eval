# Constraint Enumeration Eval

Constraint Enumeration is a decision-quality eval for real-world prompts where a model can answer too quickly, optimize for the most salient local feature, and miss the full conjunction of constraints required for a useful recommendation.

This repo evaluates whether a constraint-first system prompt reduces those failures relative to plain, careful, constraint-axis, style-matched, and no-enumeration controls.

## Current release: v5.1

v5.1 is the breakthrough-matrix release. It includes the v4.0 publishability hardening, the v5.0 production-prompt breakthrough harness, and v5.1 fixes for primary-condition reporting, rejudge command reproducibility, gate sensitivity, report output, and OpenAI extractor cleanup.

New in v5.1:

- `paired_analysis` / `paired_delta_summary` now follow `PRIMARY_CONDITION` versus `baseline` instead of hardcoding `skill - baseline`.
- Gate sensitivity now includes `primary_minus_*` rows, so `production_constraint_prompt` runs show alternate-gate robustness directly.
- Cross-vendor rejudge documentation now includes `CASE_DIR`, `PRIMARY_CONDITION`, and matching `PAIRWISE_COMPARISONS` to avoid cases-hash mismatches.
- `npm run report` now prints length-quartile pass-rate breakdowns and primary-condition gate sensitivity.
- OpenAI text extraction now uses extracted output blocks only and skips reasoning/refusal blocks explicitly.

New in v5.0:

- Added `production_constraint_prompt` and `SKILL_PRODUCTION.md`.
- Added arbitrary pairwise comparisons through `PAIRWISE_COMPARISONS`.
- Added `PRIMARY_CONDITION` so the harness can test a production prompt as the headline condition.
- Added `npm run eval:breakthrough`, `npm run make:large-holdout-prompt`, `npm run export:human-review`, and `npm run report`.
- Added `BREAKTHROUGH_PROTOCOL.md` for 100+ case runs, cross-vendor rejudges, and human blind review.

Included from v4.0:

- Added `constraint_axis_prompting` control: primes broad constraint categories without the protocol or enumeration order.
- Added `style_matched_baseline` control: rewrites the baseline answer into enumerated style without changing the baseline decision.
- Default pass gate no longer depends on `considers_binding_constraints_implicitly`; that field is now diagnostic only.
- Added gate-sensitivity tables for alternate pass gates.
- Added case-level bootstrap confidence intervals for paired binary deltas; normal CIs are retained as diagnostics only.
- Added length-quartile pass-rate breakdowns, plus p50/p90 answer-length stats.
- Added answer truncation tracking from the answer-generation stop reason.
- Added Gemini/Google as a third judge-provider path in addition to Anthropic and OpenAI.
- Updated the default OpenAI judge model to `gpt-5.1`; verify account access with `npm run check:models`.
- Added explicit `not_acceptable_final_answers` to case schema normalization and judge prompts.
- Hardened judge prompts against answer-delimiter injection by serializing candidate answers as JSON strings instead of XML-like tags.
- Added explicit OpenAI refusal/reasoning-block handling.
- Replaced object-backed grouping with null-prototype grouping.
- Added Node 20+ engine requirement, package lock, unit tests, and GitHub Actions CI.
- Added `CASE_DIR` support for independently authored held-out case folders.

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

## Recommended publishable run

For a real write-up, do not headline `skill - baseline`. Headline `skill - careful_control` and report the full ablation matrix.

```bash
cd eval
EVAL_CONDITIONS=baseline,careful_control,constraint_axis_prompting,constraint_check_no_enumeration,style_matched_baseline,skill,skill_concise \
DOUBLE_SWAPPED_PAIRWISE=true \
SMOKE_TRIALS=3 \
RUN_ID=main-v5-anthropic \
npm run smoke
```

Then rejudge the same saved answers with OpenAI. Use the same `CASE_DIR`, `PRIMARY_CONDITION`, and `PAIRWISE_COMPARISONS` as the source run, otherwise resume/case hashing can correctly abort:

```bash
SOURCE_RUN_ID=main-v5-anthropic \
RUN_ID=main-v5-openai-rejudge \
CASE_DIR=cases_holdout \
JUDGE_PROVIDER=openai \
OPENAI_JUDGE_MODEL=gpt-5.1 \
PRIMARY_CONDITION=production_constraint_prompt \
PAIRWISE_COMPARISONS=production_constraint_prompt:baseline,production_constraint_prompt:careful_control,production_constraint_prompt:constraint_axis_prompting,production_constraint_prompt:style_matched_baseline,production_constraint_prompt:skill \
DOUBLE_SWAPPED_PAIRWISE=true \
npm run rejudge
```

And optionally with Gemini/Google as a third judge family:

```bash
SOURCE_RUN_ID=main-v5-anthropic \
RUN_ID=main-v5-gemini-rejudge \
CASE_DIR=cases_holdout \
JUDGE_PROVIDER=google \
GEMINI_JUDGE_MODEL=gemini-2.5-pro \
PRIMARY_CONDITION=production_constraint_prompt \
PAIRWISE_COMPARISONS=production_constraint_prompt:baseline,production_constraint_prompt:careful_control,production_constraint_prompt:constraint_axis_prompting,production_constraint_prompt:style_matched_baseline,production_constraint_prompt:skill \
DOUBLE_SWAPPED_PAIRWISE=true \
npm run rejudge
```

The rejudge path keeps the original answer model and answer temperature in the summary artifact. It also uses `SOURCE_RUN_ID` for pairwise A/B order seeding so the rejudge sees the same answer ordering as the source run unless double-swapping is explicitly used.

## Held-out cases

The included `eval/cases` corpus is an in-sample development set. Do not make a strong public claim from it alone.

For a defensible public claim:

```bash
CASE_DIR=cases_holdout \
EVAL_CONDITIONS=baseline,careful_control,constraint_axis_prompting,constraint_check_no_enumeration,style_matched_baseline,skill,skill_concise \
DOUBLE_SWAPPED_PAIRWISE=true \
SMOKE_TRIALS=3 \
RUN_ID=heldout-v4-anthropic \
npm run smoke
```

Author 15-20 held-out cases without looking at `SKILL.md`, or use external decision-trap sources filtered into the schema. Report the held-out delta as the headline and the in-sample delta as a sanity check.

## Environment variables

Create `eval/.env.local`:

```bash
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-6
JUDGE_PROVIDER=anthropic
JUDGE_MODEL=claude-opus-4-7
ANTHROPIC_VERSION=2023-06-01
ANSWER_TEMPERATURE=0
JUDGE_TEMPERATURE=0
EVAL_ADMIN_TOKEN=
DOUBLE_SWAPPED_PAIRWISE=false

OPENAI_API_KEY=
OPENAI_JUDGE_MODEL=gpt-5.1

GEMINI_API_KEY=
GEMINI_JUDGE_MODEL=gemini-2.5-pro

STYLE_REWRITE_MODEL=claude-sonnet-4-6

# Optional. Must include baseline and skill.
# Allowed: baseline,careful_control,step_by_step_control,constraint_axis_prompting,constraint_check_no_enumeration,style_matched_baseline,skill,skill_concise
# EVAL_CONDITIONS=baseline,careful_control,constraint_axis_prompting,constraint_check_no_enumeration,style_matched_baseline,skill,skill_concise

# Optional alternate case folder.
# CASE_DIR=cases_holdout

# Legacy shorthand for baseline,careful_control,skill when EVAL_CONDITIONS is unset.
INCLUDE_LENGTH_CONTROL=false
```

Temperature handling is provider/model-aware. Anthropic answer-model temperatures are validated in `[0, 1]`; OpenAI judge temperatures are validated in `[0, 2]`. Sampling parameters are omitted for Claude Opus 4.7 and conservative OpenAI reasoning-family judge models such as `o1`, `o3`, `o4`, and `gpt-5*` to avoid model-family 400s.

Development servers are unauthenticated when `EVAL_ADMIN_TOKEN` is unset outside production. Do not expose `next dev` publicly without setting a token.

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

- `skill` beats `baseline` but not `careful_control`.
- `skill` beats `baseline` but not `constraint_axis_prompting`.
- `style_matched_baseline` reaches skill-like pass rates without changing the baseline decision.
- The lift disappears under OpenAI or Gemini rejudging.
- The lift exists only in the longest answer-length quartile.
- Held-out cases show materially smaller or reversed lift relative to the in-sample corpus.

## Publication checklist

Before making a public claim:

```text
1. Freeze SKILL.md and case corpus.
2. Add an independently authored held-out set via CASE_DIR.
3. Run at least 3 trials per condition.
4. Include careful_control, constraint_axis_prompting, constraint_check_no_enumeration, style_matched_baseline, skill, and skill_concise.
5. Use double-swapped pairwise judging.
6. Rejudge with at least one non-Anthropic judge; preferably OpenAI and Gemini.
7. Report bootstrap CIs over case-level paired deltas.
8. Report gate sensitivity and length-quartile metrics.
9. Human-audit judge disagreements, baseline wins, style-matched wins, and truncations.
10. Treat same-vendor-only results as directional.
```

## License

MIT

## v5: Breakthrough matrix

v5 adds a production-oriented constraint prompt and a stronger matrix for testing whether the effect is real rather than just style or generic carefulness.

New condition:

```text
production_constraint_prompt
```

Recommended breakthrough run:

```bash
cd eval
CASE_DIR=cases_holdout \
TRIALS=3 \
PRIMARY_CONDITION=production_constraint_prompt \
EVAL_CONDITIONS=baseline,careful_control,constraint_axis_prompting,style_matched_baseline,skill,production_constraint_prompt \
PAIRWISE_COMPARISONS=production_constraint_prompt:baseline,production_constraint_prompt:careful_control,production_constraint_prompt:constraint_axis_prompting,production_constraint_prompt:style_matched_baseline,production_constraint_prompt:skill \
npm run eval
```

For larger claims, create `eval/cases_holdout_large/` with 100-200 independently authored cases and run the same matrix with `CASE_DIR=cases_holdout_large`.

Use `BREAKTHROUGH_PROTOCOL.md` for the full protocol, cross-vendor rejudge commands, and human-review workflow.
