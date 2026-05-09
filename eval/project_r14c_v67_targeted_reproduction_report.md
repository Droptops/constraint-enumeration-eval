# r14c v6.7 Targeted Reproduction Report

## Executive Summary

r14c is a clean reproduction of the r14b targeted-promotion test (v6.3 global/default champion vs v6.7 targeted candidate) on the holdout (`cases_holdout`, n = 60 per condition: 20 cases × 3 trials). Primary judge GPT-5.1, robustness judge Opus 4.7. Same-vendor answer/judge mixing was avoided (answer = anthropic/claude-sonnet-4-6, primary judge = openai/gpt-5.1).

Headline: under both judges, v6.7 reduces HCV and OverEnum substantially relative to v6.3, but TypeA (asks_unnecessary_clarification_rate) regresses by 1–2 rows. The HCV and OverEnum gates pass strictly; the TypeA non-regression gate fails by 1–2 rows under both judges, which differs from the r14b memo result (where TypeA was non-regressive under GPT-5.1 by 1 row and improved under Opus by 11 rows). The reproduction therefore corroborates the HCV / OverEnum direction but does **not** corroborate the TypeA non-regression result. Promotion verdict is read accordingly.

This is a reproduction run on the original holdout. It is **not** a global non-regression test on non-targeted hard-constraint classes, and the report does **not** claim global v6.7 promotion.

-----

## 1. Decision

**Decision: TARGETED PROMOTION GATE NOT FULLY MET in r14c.**

Under the pre-registered v6.7 targeted gate (HCV strict <, TypeA ≤, OverEnum ≤, Invalid < 2%), v6.7 vs v6.3 passes 3 of 4 gates under both judges. TypeA fails by 1 row (Opus) and 2 rows (GPT-5.1). HCV and OverEnum improvements are large under both judges and corroborated.

Recommended interpretation: HCV/OverEnum gains are real and reproducible across judges; the TypeA non-regression result from r14b did **not** reproduce on this resampled run. v6.3 remains the global/default champion. v6.7 should not be promoted as a targeted champion on the basis of r14c alone — a tie-breaker re-run, or rebalancing the holdout to weight clarification-expected cases more, is the appropriate next step.

## 2. Scope

- v6.3 = global/default champion under test.
- v6.7 = targeted candidate under test.
- Holdout: `eval/cases_holdout` (20 cases, ambiguity + business + physical + safety, the same subset r14b used).
- 20 cases × 3 trials = 60 rows per condition.
- This is **not** a global non-regression run across non-targeted hard-constraint classes. r15 still owns that work.

## 3. Configuration

- Branch: `r14c/v67-targeted-reproduction` from `claude/serene-archimedes-7cf7ca @ c88772e`.
- Answer: anthropic/claude-sonnet-4-6, T=0.
- Primary judge: openai/gpt-5.1, T=0.
- Robustness rejudge: anthropic/claude-opus-4-7, T=0.
- Conditions: baseline, production_blocker_first_v6.3_candidate, production_blocker_first_v6.7_candidate.
- Primary condition: production_blocker_first_v6.7_candidate.
- Pairwise: production_blocker_first_v6.7_candidate vs production_blocker_first_v6.3_candidate, single position order.
- v6.3 prompt: SKILL_PRODUCTION_V63.md @ 0deb9c4.
- v6.7 prompt: SKILL_PRODUCTION_V67.md @ 65edc8d.
- Wiring: eval/lib/runCase.js (`production_blocker_first_v6.3_candidate` → loadSkillProductionV63Prompt, `production_blocker_first_v6.7_candidate` → loadSkillProductionV67Prompt) and eval/lib/config.js.

## 4. Artifact confirmation

Frozen folder: `eval/results_frozen_v6_7_r14c/`.
Tarball: `eval/results_frozen_v6_7_r14c.tar.gz` (sha256 in `eval/results_frozen_v6_7_r14c.tar.gz.sha256`, per-file hashes in `eval/results_frozen_v6_7_r14c.sha256`).

Source-of-truth files (under `eval/results_frozen_v6_7_r14c/`):

- Manifest: `MANIFEST.md`
- GPT-5.1 absolute results: `r14c-v67-targeted-20260509T093414.results.jsonl`
- GPT-5.1 absolute summary: `r14c-v67-targeted-20260509T093414.summary.json`
- GPT-5.1 pairwise gold_anchored: `r14c-v67-targeted-20260509T093414.pairwise.gold_anchored.jsonl`
- GPT-5.1 pairwise gold_blind: `r14c-v67-targeted-20260509T093414.pairwise.gold_blind.jsonl`
- Opus 4.7 rejudge absolute results: `r14c-v67-targeted-20260509T093414.rejudge.opus47-20260509T101059.results.jsonl`
- Opus 4.7 rejudge absolute summary: `r14c-v67-targeted-20260509T093414.rejudge.opus47-20260509T101059.summary.json`
- Opus 4.7 rejudge pairwise gold_anchored: `r14c-v67-targeted-20260509T093414.rejudge.opus47-20260509T101059.pairwise.gold_anchored.jsonl`
- Opus 4.7 rejudge pairwise gold_blind: `r14c-v67-targeted-20260509T093414.rejudge.opus47-20260509T101059.pairwise.gold_blind.jsonl`

Hashes are frozen prior to analysis; the analysis below was computed by reading the frozen `*.summary.json` files, not the live `eval/results/` files.

## 5. GPT-5.1 primary metric table

n = 60 per condition.

| Condition                            | Invalid% | HCV%  | TypeA% | OverEnum% | Pass% |
| ------------------------------------ | -------- | ----- | ------ | --------- | ----- |
| baseline                             | 0.0%     | 30.0% | 6.7%   | 36.7%     | 50.0% |
| production_blocker_first_v6.3        | 0.0%     | 30.0% | 3.3%   | 45.0%     | 45.0% |
| **production_blocker_first_v6.7 [cand]** | **0.0%** | **10.0%** | **6.7%** | **16.7%** | **66.7%** |

(TypeA% = `unnecessary_clarification_rate`; HCV% = `hard_constraint_violation_rate`; OverEnum% = `over_enumeration_rate`; Invalid% = `invalid_judge_response_rate`.)

## 6. Opus 4.7 rejudge metric table

n = 60 per condition.

| Condition                            | Invalid% | HCV%  | TypeA% | OverEnum% | Pass% |
| ------------------------------------ | -------- | ----- | ------ | --------- | ----- |
| baseline                             | 0.0%     | 15.0% | 6.7%   | 16.7%     | 78.3% |
| production_blocker_first_v6.3        | 0.0%     | 18.3% | 0.0%   | 11.7%     | 81.7% |
| **production_blocker_first_v6.7 [cand]** | **0.0%** | **3.3%** | **1.7%** | **0.0%** | **96.7%** |

## 7. v6.7 vs v6.3 gate table

GPT-5.1 (primary), n_pairs = 60:

| Metric    | v6.3  | v6.7  | Δ pp  | Δ rows | Gate     | Result |
| --------- | ----- | ----- | ----- | ------ | -------- | ------ |
| HCV%      | 30.0% | 10.0% | −20.0 | −12    | strict < | PASS   |
| TypeA%    | 3.3%  | 6.7%  | +3.4  | +2     | ≤        | **FAIL — small regression by 2 rows** |
| OverEnum% | 45.0% | 16.7% | −28.3 | −17    | ≤        | PASS   |
| Invalid%  | 0.0%  | 0.0%  | 0.0   | 0      | < 2%     | PASS   |

3 of 4 GPT-5.1 gates PASS. TypeA gate fails by 2 rows under the primary judge (it improved by 1 row in r14b). HCV and OverEnum are large, directional, and substantially exceed any reasonable noise floor (1 row = 1.7pp).

Opus 4.7 (robustness), n_pairs = 60:

| Metric    | v6.3  | v6.7 | Δ pp  | Δ rows | Gate     | Result |
| --------- | ----- | ---- | ----- | ------ | -------- | ------ |
| HCV%      | 18.3% | 3.3% | −15.0 | −9     | strict < | PASS   |
| TypeA%    | 0.0%  | 1.7% | +1.7  | +1     | ≤        | **FAIL — small regression by 1 row** |
| OverEnum% | 11.7% | 0.0% | −11.7 | −7     | ≤        | PASS   |
| Invalid%  | 0.0%  | 0.0% | 0.0   | 0      | < 2%     | PASS   |

3 of 4 Opus gates PASS. Opus corroborates the HCV and OverEnum direction with comparable row magnitudes. TypeA also fails the non-regression gate under Opus, but only by 1 row (vs 11-row improvement reported in r14b memo).

## 8. v6.7 vs v6.3 paired delta (mean of pair-level differences)

| Metric (right minus left, where right = v6.7) | GPT-5.1 mean Δ | Opus 4.7 mean Δ |
| --------------------------------------------- | -------------- | --------------- |
| pass                                          | +0.217 (+13)   | +0.150 (+9)     |
| HCV reduction (left minus right)              | +0.200 (+12)   | +0.150 (+9)     |
| Unnecessary clarification reduction (left minus right) | −0.033 (−2) | −0.017 (−1) |

Pair counts: 60. Bootstrap CIs are stored under `paired_condition_deltas` in the summary JSON for downstream readers.

## 9. Pairwise judging (v6.7 left, v6.3 right)

GPT-5.1 (n_valid = 60 per mode):

| Mode          | v6.7 wins | v6.3 wins | Tie  | Notes |
| ------------- | --------- | --------- | ---- | ----- |
| gold_anchored | 65.0%     | 31.7%     | 3.3% | v6.7 favored when the case's gold answer anchors the rubric |
| gold_blind    | 31.7%     | 65.0%     | 3.3% | win pattern flips without the gold anchor |

Opus 4.7 rejudge (n_valid = 60 per mode):

| Mode          | v6.7 wins | v6.3 wins | Tie  | Notes |
| ------------- | --------- | --------- | ---- | ----- |
| gold_anchored | 56.7%     | 40.0%     | 3.3% | v6.7 favored, smaller margin than GPT |
| gold_blind    | 15.0%     | 83.3%     | 1.7% | v6.7 strongly disfavored without anchor |

Both judges flip direction between gold_anchored and gold_blind. This is a known property of single-position pairwise judging when the modes apply different rubrics. Treat absolute gates (Sections 5–7) as primary and pairwise as diagnostic only. The flip is itself a signal that the two pairwise rubrics are scoring different constructs and merits a follow-up double-swap pairwise run.

## 10. r14c vs r14b comparison

The two runs use the same prompts, holdout, and judges, but were sampled on different dates with independent stochasticity in the answer model and the judges (T=0 lowers but does not eliminate sampling variance with current API behavior). The r14c numbers are not expected to match r14b exactly.

Direction of effect:

| Metric (v6.7 vs v6.3) | r14b GPT Δ rows | r14c GPT Δ rows | r14b Opus Δ rows | r14c Opus Δ rows |
| --------------------- | ---------------:| ---------------:| ----------------:| ----------------:|
| HCV                   | −3              | **−12**         | −8               | **−9**           |
| TypeA                 | −1              | **+2**          | −11              | **+1**           |
| OverEnum              | −7              | **−17**         | −9               | **−7**           |
| Invalid               | 0               | 0               | 0                | 0                |

HCV and OverEnum directions corroborate r14b and exceed r14b's row magnitudes under both judges in r14c. TypeA does **not** corroborate: r14b reported a 1-row GPT improvement and an 11-row Opus improvement; r14c shows a 2-row GPT regression and a 1-row Opus regression. The Opus TypeA delta is at noise floor (≤ 1 row), but the GPT delta is small and pointed the wrong way.

This is the central reproducibility finding of r14c: the HCV/OverEnum result is robust; the TypeA non-regression result was noisy or run-specific.

## 11. Caveats and noise floor

n = 60 per condition. 1 row = 1.7pp; 3 rows = 5.0pp; 5 rows = 8.3pp.

- HCV deltas (GPT −12, Opus −9) are well above the 5-row meaningful threshold under both judges.
- OverEnum deltas (GPT −17, Opus −7) are above threshold under GPT and at threshold under Opus.
- TypeA deltas (GPT +2, Opus +1) are below the noise floor in absolute terms but are the wrong direction.
- Pairwise modes flip direction (gold_anchored → v6.7, gold_blind → v6.3 under both judges). This indicates the two pairwise rubrics are scoring different constructs and is consistent with the r14b OverEnum-typing finding.
- The Opus run is same-vendor with the answer model (anthropic↔anthropic). It is treated as robustness only; the primary verdict is anchored to GPT-5.1.
- This run does not rebalance the holdout. The original 20-case holdout contains 10 cases marked `clarification_expected: true` (ambiguity + business) and 10 marked `requires_direct_answer: true` (physical + safety). The TypeA metric is dominated by the clarify-expected half.

## 12. Implications and follow-ups

1. r14c does **not** authorize a global v6.7 promotion. v6.3 remains the global/default champion.
2. r14c does not cleanly reproduce the r14b targeted-promotion verdict because TypeA failed the non-regression gate in this run. Before any targeted promotion claim is made on the basis of these prompts, run a third independent reproduction or a tie-breaker with double-swapped pairwise enabled.
3. The HCV / OverEnum gains are robust across two runs and two judges. They are the core signal worth carrying into r15. The OverEnum cross-judge gap (GPT 16.7% vs Opus 0.0% on v6.7) reproduces r14b's "OverEnum is undertyped" finding and strengthens the case for the r15 Work Unit / Authority / Primitive schema.
4. The r14b memo noted a TypeA repair from v6.6 to v6.7. r14c did not include v6.6 and cannot speak to that delta. A v6.6 vs v6.7 head-to-head remains the right next experiment for the TypeA story.
5. Pairwise direction-flip between gold_anchored and gold_blind under both judges suggests the pairwise rubric variants are not measuring the same construct. This is a measurement-design issue for r15, not a v6.3/v6.7 issue.

## 13. Final archive language

> r14c reproduces the v6.7 vs v6.3 targeted comparison on `cases_holdout` (n = 60 per condition) with GPT-5.1 primary and Opus 4.7 rejudge. v6.7 strongly improves HCV and OverEnum under both judges, corroborating r14b on those two metrics. TypeA failed the non-regression gate by 1 row (Opus) and 2 rows (GPT-5.1) and therefore did not reproduce r14b's TypeA result. v6.3 remains the global/default champion. r15 not launched. v6.8 not run. No global v6.7 promotion is claimed on the basis of r14c.
