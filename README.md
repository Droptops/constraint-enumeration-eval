# Constraint Enumeration Eval

Constraint Enumeration is a decision-quality layer for LLMs. The thesis is simple: models often fail not because they cannot reason, but because they answer too quickly. They optimize for the most obvious local feature before checking whether the full set of binding constraints can be satisfied.

This repo evaluates that failure mode.

## Core claim being tested

A useful real-world recommendation must satisfy a conjunction:

```text
constraint consideration
AND constraint application
AND correct final answer
AND decision usefulness
AND no hard-constraint violation
```

The judge fills structured fields. The official pass/fail score is computed in code using an AND gate. The judge does **not** directly decide pass/fail.

## Architecture

```text
Cases → Model answer → Structured judge → AND gate → Metrics → Saved run artifact
```

The browser never sends arbitrary `system`, `messages`, or `max_tokens`. The server controls the prompt, model, temperature, case lookup, judge prompt, and token budget.

## Current methodology defaults

The repo defaults are chosen to avoid the most obvious validity traps:

```bash
ANTHROPIC_MODEL=claude-sonnet-4-6
JUDGE_PROVIDER=anthropic
JUDGE_MODEL=claude-opus-4-7
# Optional true cross-family judge:
# JUDGE_PROVIDER=openai
# OPENAI_API_KEY=...
# OPENAI_JUDGE_MODEL=gpt-4o-2024-08-06
ANSWER_TEMPERATURE=0
JUDGE_TEMPERATURE=0
DOUBLE_SWAPPED_PAIRWISE=false
INCLUDE_LENGTH_CONTROL=false
```

The default `ANSWER_TEMPERATURE=0` is deterministic and pairs correctly with `trials=1`. For variance testing, use a nonzero answer temperature such as `0.5` only with enough trials to average sampling noise. The Anthropic wrapper omits `temperature` for Claude Opus 4.7 requests because Anthropic removed sampling parameters for that model; keep this behavior if you use Opus 4.7 as judge.

`claude-opus-4-7` is a higher-capability separate judge model from the answer model. This is **cross-tier within Anthropic**, not true cross-family judging.

True cross-family judging requires a different vendor/model family. The repo supports `JUDGE_PROVIDER=openai` for an optional OpenAI structured-output judge pass. Same-vendor judge results should be treated as directional unless confirmed by another judge family. Same-model judging is supported for cost reasons, but it is **not recommended for publishable claims** because it can reward outputs that look like the same model family's preferred format.

Anthropic structured judging uses the current Claude Messages API JSON-output shape: `output_config.format` with `type: "json_schema"`. Current Anthropic docs state that the previous beta header and `output_format` parameter moved to `output_config.format`, and beta headers are no longer required. For Claude Opus 4.7 specifically, this repo omits sampling parameters such as `temperature` from Anthropic requests.

## Case set

The included case set has 40 cases across four categories:

```text
physical
ambiguity
business
safety
```

The case set intentionally mixes direct-answer, clarification-expected, and either-acceptable cases across categories so category does not become a proxy for the expected behavior.

Each case includes:

```json
{
  "schema_version": "1.0",
  "id": "car_wash_50m",
  "category": "physical",
  "prompt": "I need to get my car washed. The car wash is 50m away. Should I walk or drive?",
  "requires_direct_answer": true,
  "clarification_expected": false,
  "expected_final_answer": "drive",
  "acceptable_final_answers": ["drive", "drive the car", "take the car through the car wash"],
  "binding_constraints": [
    "The goal is to get the car washed, not merely to move the person",
    "The car must physically arrive at the car wash",
    "Walking alone does not move the car"
  ],
  "soft_constraints": ["The car wash is close"],
  "common_failure_modes": [
    "Optimizes for short distance instead of moving the car"
  ]
}
```

Case validation enforces:

```text
schema_version === "1.0"
category must match the source case filename, e.g. physical.json contains category="physical"
requires_direct_answer and clarification_expected cannot both be true
binding_constraints is a non-empty array
expected_final_answer exists
acceptable_final_answers defaults to [expected_final_answer]
```

Behavior semantics:

```text
requires_direct_answer=true, clarification_expected=false
  → a direct answer is required; unnecessary clarification is penalized.

requires_direct_answer=false, clarification_expected=true
  → a clarifying question is expected, or assumptions must be explicitly stated before recommending.

requires_direct_answer=false, clarification_expected=false
  → either a direct answer with clear assumptions or a clarifying question can be acceptable.
```

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

Explicit enumeration is **not** required for pass. This reduces the confound where the skill teaches the exact visible format that the rubric grades. The pass gate uses implicit constraint consideration and application, not list formatting.

Official pass/fail logic:

```js
const pass =
  j.considers_binding_constraints_implicitly === true &&
  j.applies_constraints_correctly === true &&
  j.final_answer_correct === true &&
  j.answer_is_decision_useful === true &&
  j.violates_hard_constraint === false &&
  j.asks_unnecessary_clarification === false &&
  j.over_enumerates_irrelevant_constraints === false;
```

## Primary metric

### Constraint Failure Rate

The percentage of responses that miss, misapply, or violate at least one binding constraint required for the correct decision.

Example report format after a real run:

```text
Baseline constraint failure rate: X%
Constraint Enumeration constraint failure rate: Y%
Reduction: Z percentage points
```

## Pairwise judging

The eval runs two pairwise modes.

### Gold-anchored pairwise

The judge sees:

```text
prompt
expected final answer
acceptable final answers
binding constraints
soft constraints
common failure modes
Answer A
Answer B
```

This is a stricter comparison against the gold case data.

### Gold-blind pairwise

The judge sees only:

```text
prompt
Answer A
Answer B
```

This tests whether the Constraint Enumeration answer is more useful without revealing the gold answer or case rubric. If both pairwise modes agree, the result is much stronger.

Pairwise answer ordering is blinded and deterministic using this seed:

```text
${runId}:${caseId}:${trial}:${mode}:${positionOrder}:pairwise-order
```

By default, each pair gets one seeded shuffle. If `DOUBLE_SWAPPED_PAIRWISE=true`, the runner judges each pair twice per mode:

```text
skill=A, baseline=B
baseline=A, skill=B
```

Double-swapped pairwise costs more but reports:

```text
position_agreement_rate
skill_wins_both_positions_rate
baseline_wins_both_positions_rate
split_decision_rate
```

## Reproducibility notes

- Results are written incrementally as JSONL.
- Malformed partial JSONL lines are skipped on resume and reported in the summary artifact.
- Each result line stores `skill_sha256` and `cases_sha256`.
- Resume refuses to continue if result hashes conflict with the current `SKILL.md` or case set.
- Legacy records without per-result hashes are tolerated so old smoke files do not crash resume. Publishable runs should start with a fresh `RUN_ID`.
- `cases_sha256` excludes `source_file` and tracks semantic case content only. Smoke runs hash the full case corpus even when evaluating a subset; the summary artifact records `evaluated_case_ids` and `total_case_corpus_count`.
- Pairwise win rates are calculated over valid pairwise judgments only, using `validTotal` as the denominator.
- Earlier versions of this repo divided pairwise rates by total. Results from before this change are not directly comparable.
- Invalid pairwise responses are reported separately through `invalid_pairwise_rate`.
- Margin weights for pairwise scoring are:

```text
large = 1.0
medium = 0.66
small = 0.33
tie = 0
```

These weights are a design choice, not a statistical constant. Raw win rates are reported alongside margin-weighted scores so readers can recompute.

## Environment variables

Create `eval/.env.local`:

```bash
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-6
JUDGE_PROVIDER=anthropic
JUDGE_MODEL=claude-opus-4-7
# Optional true cross-family judge pass:
# JUDGE_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_JUDGE_MODEL=gpt-4o-2024-08-06
ANTHROPIC_VERSION=2023-06-01
ANSWER_TEMPERATURE=0
JUDGE_TEMPERATURE=0
DOUBLE_SWAPPED_PAIRWISE=false
EVAL_ADMIN_TOKEN=
```

## Install

```bash
cd eval
npm install
```

## Run the smoke test

```bash
npm run smoke
```

The smoke test selects cases across categories instead of simply taking the first alphabetic files. The default smoke run evaluates 4 cases so each included category gets one representative when the four default categories are present.

Do **not** cite headline lift from smoke cases. The smoke cases only verify that the machinery works.

## Test resumability

Use a fixed `RUN_ID`:

```bash
RUN_ID=smoke-test-resume npm run smoke
# ctrl-c partway through
RUN_ID=smoke-test-resume npm run smoke
```

The second run should skip completed absolute and pairwise tuples.

## Run one case through the API

```bash
curl -X POST http://localhost:3000/api/run-case \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EVAL_ADMIN_TOKEN" \
  -d '{
    "caseId": "car_wash_50m",
    "condition": "skill"
  }'
```

## Run the full eval

```bash
curl -X POST http://localhost:3000/api/run-eval \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EVAL_ADMIN_TOKEN" \
  -d '{
    "trials": 1
  }'
```

For a nonzero-temperature variance run, set `ANSWER_TEMPERATURE=0.5` in the server environment before starting Next, then use enough trials to average sampling noise:

```bash
curl -X POST http://localhost:3000/api/run-eval \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EVAL_ADMIN_TOKEN" \
  -d '{
    "trials": 10
  }'
```

To resume a previous run:

```bash
curl -X POST http://localhost:3000/api/run-eval \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EVAL_ADMIN_TOKEN" \
  -d '{
    "trials": 1,
    "runId": "existing-run-id"
  }'
```


## Optional controls and rejudging

Length-matched control arm:

```bash
INCLUDE_LENGTH_CONTROL=true npm run smoke
```

This adds `careful_control`, a generic carefulness prompt that is longer than the baseline but does not teach the Constraint Enumeration protocol. Use it to separate “any longer system prompt helps” from the specific skill effect.

Rejudge existing answers with another judge family without regenerating model outputs:

```bash
SOURCE_RUN_ID={existingRunId} JUDGE_PROVIDER=openai OPENAI_API_KEY=... npm run rejudge
```

This is the recommended way to compare judge families on identical answer text.

## Result artifacts

Each run writes:

```text
results/{runId}.results.jsonl
results/{runId}.pairwise.gold_anchored.jsonl
results/{runId}.pairwise.gold_blind.jsonl
results/{runId}.summary.json
```

The summary artifact includes:

```json
{
  "run_id": "2026-05-03T20-15-00Z",
  "created_at": "2026-05-03T20:15:00.000Z",
  "model_under_test": "claude-sonnet-4-6",
  "judge_provider": "anthropic",
  "judge_model": "claude-opus-4-7",
  "answer_temperature": 0,
  "judge_temperature": 0,
  "double_swapped_pairwise": false,
  "skill_sha256": "abc123",
  "cases_sha256": "def456",
  "num_cases": 40,
  "num_trials_per_condition": 1,
  "absolute_summary": {},
  "pairwise_gold_anchored_summary": {},
  "pairwise_gold_blind_summary": {}
}
```

## Reporting results

Use this format once you have a real run. The summary includes paired analyses with normal-approximation 95% confidence intervals and McNemar-style discordant-pair diagnostics for baseline-vs-skill pass/fail and constraint-failure reduction:

```text
Run ID: {runId}
Model under test: {model}
Judge provider: {judgeProvider}
Judge model: {judgeModel}
Answer temperature: {answer_temperature}
Judge temperature: {judge_temperature}
Double-swapped pairwise: {double_swapped_pairwise}
Cases: {numCases}
Trials per condition: {trials}
Skill hash: {skill_sha256}
Cases hash: {cases_sha256}

Baseline constraint failure rate: X%
Constraint Enumeration constraint failure rate: Y%
Reduction: Z percentage points

Baseline pass rate: A%
Constraint Enumeration pass rate: B%

Gold-anchored pairwise preferred Constraint Enumeration in C% of valid trials.
Gold-blind pairwise preferred Constraint Enumeration in D% of valid trials.
Large-margin Constraint Enumeration wins: E%
Net margin-weighted skill advantage: F

Paired pass-rate delta CI: [L, U]
Paired constraint-failure reduction CI: [L, U]
McNemar discordant pairs: b/c

Artifact:
results/{runId}.summary.json
```

## Methodology warning

Do not cite headline lift from the default smoke run. The smoke run only verifies the machinery.

Publishable claims should use:

```text
larger case sets
cross-tier or, ideally, cross-family judging
temperature 0 with trials=1 for deterministic runs OR answer_temperature > 0 with enough trials to average sampling noise
gold-anchored and gold-blind pairwise agreement
category-level and behavior-policy rollups
direct-answer and clarification cases mixed across categories
paired confidence intervals and discordant-pair diagnostics
```

Opus-vs-Sonnet judging is cross-tier within Anthropic, not true cross-family judging. Publishable claims should ideally be confirmed with a second judge family.

## Known limitations

This is not a general intelligence benchmark. It measures a specific failure mode:

```text
Premature answer generation before satisfying the full conjunction of binding constraints.
```

Known limitations:

```text
Synthetic test cases
Same-vendor judge bias even with a higher-capability judge
Judge outputs can still be imperfect
Single-shuffle pairwise may have residual position bias unless DOUBLE_SWAPPED_PAIRWISE=true
Results vary by model, temperature, prompt wording, and case design
```

Recommended release gates before public benchmark claims:

```text
Run the same artifact with JUDGE_PROVIDER=openai and compare Anthropic/OpenAI agreement
Use `npm run rejudge` to rejudge existing answer JSONL with a second judge family without regenerating answers
Manually audit a random sample of absolute and pairwise judgments
Use double-swapped pairwise for the headline run if budget allows
```

Future improvements:

```text
Human-audited gold set
Larger case set
Failure-mode clustering
zod-to-json-schema to remove schema drift
OpenAI Chat Completions fallback for non-Responses API models
```

## Security notes

The API routes should not expose a general-purpose model proxy.

The browser should only send:

```json
{
  "caseId": "car_wash_50m",
  "condition": "skill"
}
```

The server controls:

```text
System prompt
Model
Messages
Max tokens
Temperature
Judge prompt
Case lookup
```

In production, `EVAL_ADMIN_TOKEN` is required. If it is missing, the API fails closed.

## License

MIT
