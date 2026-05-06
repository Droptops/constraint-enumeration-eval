# r14b Targeted Promotion Memo: v6.7

## Executive Summary

We evaluate v6.7 on the specific class it was designed for: missing-information and clarification-expected blocker cases. Under the GPT-5.1 primary judge, v6.7 passed the targeted promotion gate versus the v6.3 global champion: HCV improved by 3 rows, TypeA was non-regressive with a 1-row improvement, and OverEnum improved by 7 rows at n=60. Opus 4.7 corroborated the direction.

This is an in-class targeted promotion, not evidence of global superiority. v6.7 was designed for missing-information / clarification-expected blockers and evaluated on that class. v6.3 remains the global/default champion pending non-regression across non-targeted hard-constraint classes.

The main methodological finding is not only the prompt promotion. The large GPT/Opus disagreement on OverEnum suggests the metric is undertyped: GPT appears to score behavioral enumeration, while Opus appears closer to authority-boundary enumeration. This motivates r15's Work Unit / Authority / Primitive schema.

-----

## 1. Decision

**Decision: TARGETED PROMOTE v6.7.**

v6.7 becomes the targeted champion for missing-information / clarification-expected blocker cases. The decision is justified by the pre-registered gate: GPT-5.1 primary HCV improved by 3 rows, TypeA did not regress, OverEnum improved by 7 rows, and invalid rate remained 0%. Opus 4.7 corroborated the direction. However, TypeA should be interpreted as non-regression, not meaningful improvement, under the primary judge. v6.3 remains the global/default champion. The run also reveals that OverEnum is undertyped, motivating r15's Work Unit / Authority / Primitive schema.

## 2. Scope

- v6.7 = targeted champion for the missing-information / clarification-expected blocker class only.
- v6.3 = global/default champion.
- v6.7 is **not** globally promoted.
- This is an in-class targeted result. The prompt was designed for missing-information / clarification-expected blockers and evaluated on that class. Global promotion requires a separate non-regression run across non-targeted hard-constraint classes (jurisdictional, expertise-required, scope-violation, blocker-present, physical-safety inference).

## 3. Artifact confirmation

Frozen folder: `eval/results_frozen_v6_7_r14b/`

Source-of-truth files:

- Manifest: `results_frozen_v6_7_r14b/v6_7_missing_info_stop_rule_cases_holdout_openai_gpt51_r14b.manifest.json`
- GPT-5.1 summary JSON: `...anthropic-claude-sonnet-4-6.openai-gpt-5.1.summary.json`
- Opus rejudge summary JSON: `...openai-gpt-5.1.rejudge.anthropic-claude-opus-4-7.summary.json`
- GPT-5.1 raw results JSONL: `...anthropic-claude-sonnet-4-6.openai-gpt-5.1.results.jsonl`
- Opus raw results JSONL: `...openai-gpt-5.1.rejudge.anthropic-claude-opus-4-7.results.jsonl`

**Note**: the frontier report primary column is **not authoritative** because `PRIMARY_CONDITION` defaulted to `production_constraint_prompt`. Use the summary JSON / JSONL files as source of truth.

## 4. GPT-5.1 primary metric table

n = 60 per condition.

|Condition                               |Invalid%|HCV%     |TypeA%   |OverEnum%|
|----------------------------------------|--------|---------|---------|---------|
|baseline                                |0.0%    |30.0%    |35.0%    |40.0%    |
|careful_control                         |0.0%    |26.7%    |26.7%    |21.7%    |
|constraint_axis_prompting               |0.0%    |30.0%    |31.7%    |20.0%    |
|production_constraint_prompt            |0.0%    |36.7%    |38.3%    |23.3%    |
|production_blocker_first_v6.3           |0.0%    |28.3%    |26.7%    |40.0%    |
|production_blocker_first_v6.6           |0.0%    |26.7%    |26.7%    |25.0%    |
|**production_blocker_first_v6.7 [cand]**|**0.0%**|**23.3%**|**25.0%**|**28.3%**|

## 5. Opus 4.7 rejudge metric table

n = 60 per condition.

|Condition                               |Invalid%|HCV%    |TypeA%  |OverEnum%|
|----------------------------------------|--------|--------|--------|---------|
|baseline                                |0.0%    |18.3%   |21.7%   |15.0%    |
|careful_control                         |0.0%    |18.3%   |20.0%   |1.7%     |
|constraint_axis_prompting               |0.0%    |21.7%   |23.3%   |8.3%     |
|production_constraint_prompt            |0.0%    |23.3%   |25.0%   |5.0%     |
|production_blocker_first_v6.3           |0.0%    |16.7%   |26.7%   |15.0%    |
|production_blocker_first_v6.6           |0.0%    |6.7%    |10.0%   |0.0%     |
|**production_blocker_first_v6.7 [cand]**|**0.0%**|**3.3%**|**8.3%**|**0.0%** |

## 6. v6.7 vs v6.3 gate table

GPT-5.1 (primary):

|Metric   |v6.3 |v6.7 |Δ pp |Δ rows|Gate    |Result                                                                                                       |
|---------|-----|-----|-----|------|--------|-------------------------------------------------------------------------------------------------------------|
|HCV%     |28.3%|23.3%|−5.0 |−3    |strict <|PASS                                                                                                         |
|TypeA%   |26.7%|25.0%|−1.7 |−1    |≤       |**PASS — non-regression only; primary-judge delta is 1 row and below evidentiary threshold for improvement.**|
|OverEnum%|40.0%|28.3%|−11.7|−7    |≤       |PASS                                                                                                         |
|Invalid% |0.0% |0.0% |0.0  |0     |< 2%    |PASS                                                                                                         |

All 4 GPT-5.1 gates PASS. The TypeA gate passes because TypeA is a non-regression floor, not because v6.7 materially improved TypeA under the primary judge.

Opus 4.7 (robustness):

|Metric   |v6.3 |v6.7|Δ pp |Δ rows|Gate    |Result|
|---------|-----|----|-----|------|--------|------|
|HCV%     |16.7%|3.3%|−13.3|−8    |strict <|PASS  |
|TypeA%   |26.7%|8.3%|−18.3|−11   |≤       |PASS  |
|OverEnum%|15.0%|0.0%|−15.0|−9    |≤       |PASS  |
|Invalid% |0.0% |0.0%|0.0  |0     |< 2%    |PASS  |

All 4 Opus gates PASS. Opus corroborates the direction on every metric. The promotion decision remains anchored to the GPT-5.1 primary gate.

## 7. v6.7 vs v6.6 repair note

Hypothesis under test: v6.6 failed the r13 TypeA gate because the clause "give only a conditional nearest-feasible answer if useful" introduced forbidden fallback recommendations. v6.7 replaced that clause with a stop rule plus a direct-answer override.

GPT-5.1:

|Metric   |v6.6 |v6.7 |Δ pp|Δ rows|Direction        |
|---------|-----|-----|----|------|-----------------|
|HCV%     |26.7%|23.3%|−3.3|−2    |improved         |
|TypeA%   |26.7%|25.0%|−1.7|−1    |improved (small) |
|OverEnum%|25.0%|28.3%|+3.3|+2    |slight regression|
|Invalid% |0.0% |0.0% |0.0 |0     |tied             |

Opus 4.7:

|Metric   |v6.6 |v6.7|Δ pp|Δ rows|Direction       |
|---------|-----|----|----|------|----------------|
|HCV%     |6.7% |3.3%|−3.3|−2    |improved        |
|TypeA%   |10.0%|8.3%|−1.7|−1    |improved (small)|
|OverEnum%|0.0% |0.0%|0.0 |0     |tied (floor)    |
|Invalid% |0.0% |0.0%|0.0 |0     |tied            |

**Repair verdict: partially landed.** TypeA direction is correct under both judges, but magnitude is small (1 row). v6.6 looked worse in r13 than r14b, so run-level judging variance likely explains part of the repair-magnitude shrinkage. The GPT OverEnum +2 row regression vs v6.6 is at noise floor and absent under Opus. Repair status does not affect the v6.3 gate.

**Tradeoff statement.** Under GPT-5.1, v6.6 may be the local OverEnum optimum. v6.7 improved HCV by 2 rows and TypeA by 1 row versus v6.6, but regressed OverEnum by 2 rows. This is below the noise floor, but it means v6.7 does not dominate v6.6 on every axis.

**Recommendation.** Before any global promotion discussion, run a preregistered fresh v6.6 vs v6.7 head-to-head at n = 60 or higher.

## 8. Noise-floor interpretation

n = 60 per condition. 1 row = 1.7pp; 3 rows = 5.0pp; 5 rows = 8.3pp.

|Metric (v6.7 vs v6.3)|GPT Δ rows|Opus Δ rows|GPT strength     |Opus strength  |
|---------------------|----------|-----------|-----------------|---------------|
|HCV                  |−3        |−8         |weak (3 = 5.0pp) |meaningful (≥8)|
|TypeA                |−1        |−11        |very weak (1.7pp)|meaningful     |
|OverEnum             |−7        |−9         |directional (7)  |meaningful     |

GPT-5.1: HCV weak, TypeA very weak, OverEnum directional.
Opus 4.7: all three meaningful.

Promotion holds because the GPT-5.1 primary gate passes and direction-of-effect is unanimous across both judges on all four gate metrics. Opus strengthens confidence but is not the primary promotion basis. The INCONCLUSIVE branch fires only when HCV passes by ≤ 2 rows AND Opus direction is unclear — neither condition holds.

## 9. Finding: OverEnum Is Undertyped

v6.7 OverEnum was **28.3% under GPT-5.1 and 0.0% under Opus 4.7**. This is not merely calibration drift. The pattern is consistent across conditions: Opus floors near 0% on every prompt-engineered condition (careful_control, v6.6, v6.7) while GPT-5.1 continues to score 20–28% on the same outputs. The gap *widens* on the careful prompts, not narrows.

The pattern suggests two different constructs are being judged:

1. **Behavioral OverEnum**: extra constraint listing, extra branches, excess structure, or verbose scaffolding.
2. **Authority OverEnum**: output outside the licensed work primitive or beyond the agent's authority.

GPT-5.1 appears more sensitive to behavioral enumeration. Opus 4.7 appears closer to authority-boundary enumeration. r15 should split the metric rather than force both judges into a single undifferentiated OverEnum label.

This finding is the central methodological contribution of r14b. The targeted promotion is the engineering outcome; the undertyping discovery is the measurement-design outcome.

## 10. Caveats

- HCV primary-judge margin is weak (3 rows / 5.0pp).
- TypeA primary-judge margin is very weak (1 row / 1.7pp). Non-regressive but **not** meaningful improvement under GPT-5.1. The gate passes because TypeA is a non-regression floor, not because v6.7 materially improved TypeA.
- OverEnum primary-judge improvement is directional (7 rows) and corroborated by Opus (9 rows).
- v6.6 vs v6.7 head-to-head on a fresh sample has not been run. Under GPT-5.1, v6.6 may be the local OverEnum optimum; v6.7 trades 2 OverEnum rows for 1 TypeA row vs v6.6.
- Holdout is restricted to the missing-information / clarification-expected blocker class. v6.7 was designed for this class. Targeted-promotion scope reflects this constraint.
- Cross-judge OverEnum absolute-level gap (GPT 28.3% vs Opus 0.0% on v6.7) is treated as a primary finding, not a caveat. See Section 9.
- If a future run shows further shrinkage on HCV or TypeA primary-judge margins, revisit.

## 11. r15 implications

Three preregistered tracks for r15:

**Track 1 — OverEnum typing.**

- Split OverEnum into two metrics:
  - Behavioral OverEnum: extra constraint listing, branches, verbosity, scaffolding.
  - Authority OverEnum: output outside the licensed work primitive / authority boundary.
- Tighten the rubric so the GPT/Opus definitional gap closes by typing rather than by judge alignment.

**Track 2 — PrimitiveMatch exploratory readout.**

- Pre-register case annotations on the Work Unit / Authority / Primitive schema:
  - Work unit
  - Authority posture
  - Required primary primitive
  - Licensed secondary primitives
  - Forbidden primitives
- PrimitiveMatch is **exploratory readout, not a gate metric** in r15. Read out alongside HCV / TypeA / OverEnum for diagnostic purposes; promote to gate only after typing stabilizes across judges.

**Track 3 — v6.6 vs v6.7 head-to-head.**

- Fresh n = 60 minimum.
- Determine whether v6.6 is the local OverEnum optimum under the primary judge.
- Determine whether v6.7's TypeA repair is worth any OverEnum cost.
- Required before any global promotion discussion.

**Floors preserved.** HCV remains the safety floor. TypeA remains the constraint-awareness floor. r15 must not regress either.

**Also required for global promotion of v6.7** (separate from r15 tracks above): non-regression run across non-targeted hard-constraint classes (jurisdictional, expertise-required, scope-violation, blocker-present, physical-safety inference). Rebalance the holdout to reduce ambiguity / clarification weight.

## 12. Final archive language

> r14b promotes v6.7 only as the targeted missing-information / clarification-expected blocker champion. v6.7 passed the pre-registered targeted gate against v6.3 under GPT-5.1 and was corroborated directionally by Opus 4.7. TypeA should be interpreted as primary-judge non-regression, not meaningful improvement. v6.3 remains the global/default champion. The main methodological finding is that OverEnum is undertyped across judges, motivating r15's Work Unit / Authority / Primitive schema. Global promotion remains open and requires separate non-regression evidence across non-targeted hard-constraint classes.
