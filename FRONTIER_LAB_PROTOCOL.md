# Frontier-Lab Protocol

This protocol tests whether the production constraint prompt is strong enough to be interesting to a frontier lab or production AI team.

The claim is not `prompt beats weak baseline`. The claim must be:

```text
primary prompt beats the strongest serious control
AND reduces hard failures
AND survives cross-vendor judging
AND does not buy the gain with longer answers or extra clarification
```

## Frontier-lab care thresholds

Minimum interesting threshold:

```text
100+ independently authored held-out cases
3 trials minimum
primary prompt beats strongest serious control by >=5pp
hard-constraint violations fall materially
answer length does not increase materially
cross-vendor judge direction is not contradictory
```

Strong threshold:

```text
150-300 held-out cases
3-5 trials
3 answer-model families or tiers
3 judge families
primary prompt beats strongest control by >=8-12pp
bootstrap CI excludes zero or is strongly directionally positive
pairwise win rate >60% against strongest control
hard-constraint violations fall 35-50%
human blind review agrees directionally
```

Holy-grail commercial threshold:

```text
cheaper model + production prompt >= frontier model + baseline
with equal/lower hard-constraint violations
and materially lower cost/latency
```

## Step 1: create the large holdout

```bash
cd eval
NUM_CASES=100 npm run make:large-holdout-prompt
```

Give the generated prompt to a person or model that has not read `SKILL.md`, `SKILL_PRODUCTION.md`, or prior cases.

Save the four arrays here:

```text
eval/cases_holdout_large/physical.json
eval/cases_holdout_large/ambiguity.json
eval/cases_holdout_large/business.json
eval/cases_holdout_large/safety.json
```

Validate:

```bash
CASE_DIR=cases_holdout_large npm run check:cases
```

## Step 2: dry-run the matrix

```bash
CASE_DIR=cases_holdout_large \
TRIALS=3 \
PRIMARY_CONDITION=production_constraint_prompt \
EVAL_CONDITIONS=baseline,careful_control,constraint_axis_prompting,style_matched_baseline,skill,production_constraint_prompt \
PAIRWISE_COMPARISONS=production_constraint_prompt:baseline,production_constraint_prompt:careful_control,production_constraint_prompt:constraint_axis_prompting,production_constraint_prompt:style_matched_baseline,production_constraint_prompt:skill \
LAB_ANSWER_SPECS=anthropic:claude-sonnet-4-6 \
LAB_JUDGE_SPECS=anthropic:claude-opus-4-7,openai:gpt-5.1,google:gemini-2.5-pro \
DRY_RUN=true \
npm run eval:frontier-matrix
```

## Step 3: run the matrix

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

The matrix runner writes a manifest in `eval/results/`.

## Step 4: report the threshold result

```bash
LAB_MANIFEST=results/<frontier-lab-run>.manifest.json npm run report:frontier

`LAB_MANIFEST` is required. The frontier report intentionally does not scan `results/` for every historical summary, because mixed smoke/development artifacts can make threshold reporting invalid.
```

The report highlights:

- primary pass rate,
- strongest serious control,
- primary minus strongest-control delta,
- bootstrap CI for paired pass-rate delta,
- hard-constraint violation delta versus baseline,
- p50 answer length,
- pairwise win rate versus strongest control when that pair was run,
- verdict: `strong`, `promising`, `thin edge`, `loses strongest control`, or `fails baseline`.

## Step 5: cheaper-model comparison

Run multiple answer models in one matrix:

```bash
CASE_DIR=cases_holdout_large \
TRIALS=3 \
LAB_ANSWER_SPECS=anthropic:claude-sonnet-4-6,openai:gpt-5.1,google:gemini-2.5-pro \
LAB_JUDGE_SPECS=anthropic:claude-opus-4-7,openai:gpt-5.1,google:gemini-2.5-pro \
npm run eval:frontier-matrix
```

A commercially important result is:

```text
cheaper model + production_constraint_prompt >= stronger model + baseline
```

Use this as a follow-on analysis after the prompt beats serious controls for at least one answer model.

## Step 6: human blind review

Export a blind sample comparing the production prompt against the strongest control:

```bash
RUN_ID=<source_run_id> \
LEFT_CONDITION=production_constraint_prompt \
RIGHT_CONDITION=careful_control \
HUMAN_REVIEW_N=30 \
npm run export:human-review
```

Repeat against `constraint_axis_prompting` if that is the strongest control.

## Claim ladder

Cautious claim:

```text
The production prompt beats baseline and is competitive with careful/constraint-axis controls on a held-out decision set.
```

Strong claim:

```text
The production prompt beats the strongest serious control on 100+ held-out cases, reduces hard failures, and survives cross-vendor judging.
```

Frontier-lab claim:

```text
A short constraint-aware prompt reliably improves decision quality beyond strong controls across case sets, answer-model families, and judge families, with lower hard-failure rates and no verbosity tax.
```


## Resume and restart behavior

The matrix runner is restartable if you reuse the same `LAB_RUN_PREFIX`. Completed compatible summaries are skipped, and incomplete child eval/rejudge JSONL files resume through their normal resume logic. A partial manifest is written after each completed child run. Set `FORCE_RERUN=true` only when you intentionally want to rerun completed summaries.
