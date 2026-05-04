# Breakthrough Protocol

This repo can now test whether a short production constraint prompt is a real decision-reliability improvement or just a nicer style.

## What would count as a strong result

A strong result is not just beating `baseline`. The production prompt should:

- beat `careful_control` and `constraint_axis_prompting` by at least 5 percentage points on held-out cases,
- beat `style_matched_baseline`, showing the effect is not format/verbosity alone,
- reduce hard-constraint violations materially,
- avoid increasing unnecessary clarification or over-enumeration,
- hold under at least two judge families,
- preferably win blind human pairwise review.

## Recommended matrix

Conditions:

```text
baseline
careful_control
constraint_axis_prompting
style_matched_baseline
skill
production_constraint_prompt
```

Pairwise comparisons:

```text
production_constraint_prompt:baseline
production_constraint_prompt:careful_control
production_constraint_prompt:constraint_axis_prompting
production_constraint_prompt:style_matched_baseline
production_constraint_prompt:skill
```

Case set:

```text
100-200 held-out cases, independently authored without reading SKILL.md
3-5 trials
```

Judges:

```text
Claude Opus
GPT-5.1 or current OpenAI frontier judge
Gemini 2.5 Pro or current Gemini frontier judge
Optional: blind human review
```

## Run the production breakthrough eval

```bash
cd eval
npm ci
npm run ci

CASE_DIR=cases_holdout_large \
TRIALS=3 \
PRIMARY_CONDITION=production_constraint_prompt \
EVAL_CONDITIONS=baseline,careful_control,constraint_axis_prompting,style_matched_baseline,skill,production_constraint_prompt \
PAIRWISE_COMPARISONS=production_constraint_prompt:baseline,production_constraint_prompt:careful_control,production_constraint_prompt:constraint_axis_prompting,production_constraint_prompt:style_matched_baseline,production_constraint_prompt:skill \
npm run eval
```

For the existing 20-case holdout pilot, use `CASE_DIR=cases_holdout`.

## Cross-vendor rejudge

Use the same `PAIRWISE_COMPARISONS` used for the source run.

```bash
SOURCE_RUN_ID=<source_run_id> \
CASE_DIR=cases_holdout_large \
JUDGE_PROVIDER=openai \
OPENAI_JUDGE_MODEL=gpt-5.1 \
PRIMARY_CONDITION=production_constraint_prompt \
PAIRWISE_COMPARISONS=production_constraint_prompt:baseline,production_constraint_prompt:careful_control,production_constraint_prompt:constraint_axis_prompting,production_constraint_prompt:style_matched_baseline,production_constraint_prompt:skill \
npm run rejudge
```

```bash
SOURCE_RUN_ID=<source_run_id> \
CASE_DIR=cases_holdout_large \
JUDGE_PROVIDER=google \
GEMINI_JUDGE_MODEL=gemini-2.5-pro \
PRIMARY_CONDITION=production_constraint_prompt \
PAIRWISE_COMPARISONS=production_constraint_prompt:baseline,production_constraint_prompt:careful_control,production_constraint_prompt:constraint_axis_prompting,production_constraint_prompt:style_matched_baseline,production_constraint_prompt:skill \
npm run rejudge
```

## Generate a report

```bash
SUMMARY=results/<run_id>.summary.json npm run report
```

## Human review export

```bash
RUN_ID=<run_id> \
LEFT_CONDITION=production_constraint_prompt \
RIGHT_CONDITION=careful_control \
HUMAN_REVIEW_N=30 \
npm run export:human-review
```

This writes a blinded review file and a private answer key into `eval/results/`.

## Larger held-out case prompt

```bash
NUM_CASES=100 npm run make:large-holdout-prompt
```

Give the printed prompt to a separate person or model that has not read `SKILL.md` or `SKILL_PRODUCTION.md`.
