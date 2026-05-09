# r14c Publishability Checkpoint — v6.7 Targeted Reproduction

## Current State

r14c is the current preserved evidence package for the v6.7 targeted missing-information / clarification-expected result.

- Branch: `r14c/v67-targeted-reproduction`
- Frozen artifact: `eval/results_frozen_v6_7_r14c.tar.gz`
- SHA-256: `eval/results_frozen_v6_7_r14c.tar.gz.sha256`
- Decision checkpoint: `eval/project_r14c_decision_checkpoint.md`
- TypeA autopsy: `eval/project_r14c_typea_autopsy.md`

r15 has not launched.

v6.8 has not run.

No global v6.7 promotion is claimed.

v6.3 remains the global/default champion.

v6.7 remains targeted-only for missing-information / clarification-expected blocker cases.

## r14c Metrics

| Judge | Condition | HCV | TypeA | OverEnum | Invalid |
|---|---|---:|---:|---:|---:|
| GPT-5.1 | v6.3 | 30.0% | 3.3% | 45.0% | 0.0% |
| GPT-5.1 | v6.7 | 10.0% | 6.7% | 16.7% | 0.0% |
| Opus 4.7 | v6.3 | 18.3% | 0.0% | 11.7% | 0.0% |
| Opus 4.7 | v6.7 | 3.3% | 1.7% | 0.0% | 0.0% |

## Gate Readout

- HCV <= 30%: PASS under both judges.
- TypeA <= 30%: PASS under both judges.
- OverEnum <= 35%: PASS under both judges.
- Invalid <= 10%: PASS under both judges.

## TypeA Autopsy Summary

The apparent TypeA regression is mixed, small nonsystematic noise, not a systematic v6.7 failure.

The 4 GPT-5.1 v6.7 TypeA rows break down as:

- 1 rubric artifact.
- 2 `ask_plus_append_if_then_tree` rows on the same case, `physical_2`, across two trials. v6.3 shows the same tail-question habit, so this is a shared limitation rather than a v6.7-specific regression.
- 1 real `hard_blocker_missed` row dual-tagged with HCV on `physical_4`; Opus agrees on this row.

## Publishable Claim

In a preserved r14c reproduction, v6.7 materially reduced hard constraint violations and legacy OverEnum on targeted missing-information / clarification-expected cases versus v6.3 under both GPT-5.1 and Opus 4.7 judges.

TypeA remained below the pre-registered threshold. Row-level autopsy found the small TypeA delta to be mixed nonsystematic noise rather than a systematic v6.7 failure.

## Scope

This supports a targeted v6.7 result on missing-information / clarification-expected blocker cases.

It does not support global v6.7 promotion.

It does not mean r15 has launched.

It does not mean v6.8 has run.

## Recommended Next Step

Do not run v6.8 yet.

Do not launch r15 yet.

The next useful artifact is a short public/technical memo around the Agent Authority Router thesis:

> The failure mode is not just verbosity. It is unauthorized work.

Suggested framing:
- models recommend when they should ask;
- plan when they should block;
- compare when they should answer narrowly;
- execute or draft when they lack authority;
- ask for missing information, then append unauthorized if/then decision logic.

## Unsafe Claims

Do not claim:

- v6.7 globally beats v6.3;
- r15 launched;
- v6.8 ran;
- strict TypeA non-regression was perfectly reproduced;
- r14b raw artifacts were recovered;
- this is a general agent benchmark.
