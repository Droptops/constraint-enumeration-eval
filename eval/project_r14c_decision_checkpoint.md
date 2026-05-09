# r14c Decision Checkpoint — v6.7 Targeted Reproduction

## Run Identity

- Branch: `r14c/v67-targeted-reproduction`
- Commit: `602556e`
- Frozen artifact: `eval/results_frozen_v6_7_r14c.tar.gz`
- SHA-256: `eval/results_frozen_v6_7_r14c.tar.gz.sha256`
- Report: `eval/project_r14c_v67_targeted_reproduction_report.md`
- Case set: `cases_holdout`
- Scope: v6.3 vs v6.7 targeted reproduction
- n: 60 rows per condition

## Metrics

| Judge | Condition | HCV | TypeA | OverEnum | Invalid |
|---|---|---:|---:|---:|---:|
| GPT-5.1 | v6.3 | 30.0% | 3.3% | 45.0% | 0.0% |
| GPT-5.1 | v6.7 | 10.0% | 6.7% | 16.7% | 0.0% |
| Opus 4.7 | v6.3 | 18.3% | 0.0% | 11.7% | 0.0% |
| Opus 4.7 | v6.7 | 3.3% | 1.7% | 0.0% | 0.0% |

## Gate Readout

- HCV ≤30%: PASS under both judges.
- TypeA ≤30%: PASS under both judges.
- OverEnum ≤35%: PASS under both judges.
- Invalid ≤10%: PASS under both judges.

## Interpretation

r14c partially reproduces the r14b targeted v6.7 story.

The main reproduced signal is strong: v6.7 improves HCV and OverEnum versus v6.3 under both GPT-5.1 and Opus 4.7.

The TypeA story is weaker than r14b. v6.7 remains well below the absolute TypeA threshold, but it regresses slightly versus v6.3: +2 rows under GPT-5.1 and +1 row under Opus.

## Decision

v6.7 remains supported as a targeted missing-information / clarification-expected candidate on HCV and OverEnum.

Do not claim strict TypeA non-regression.

Do not claim global v6.7 promotion.

v6.3 remains the global/default champion.

r15 has not launched.

v6.8 has not run.

## Safe Claim

r14c provides frozen evidence that v6.7 materially improves HCV and OverEnum on the targeted cases_holdout comparison while keeping absolute TypeA and Invalid below threshold.

## Unsafe Claims

- Do not claim v6.7 globally beats v6.3.
- Do not claim r14b raw artifacts were recovered.
- Do not claim strict TypeA non-regression.
- Do not claim r15 launched.
- Do not claim v6.8 ran.
