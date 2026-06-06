# Metrics report — Phase 2 (fake-model validation)

> **Scope / honesty.** Every number below comes from the **fake model**, not a
> model-under-test. These runs validate the *pipeline* (held-out oracle,
> discrimination metric, resumability, integrity), they are **not** an eval
> result for any model. The real model-under-test resolve rate awaits the
> separately-authorized full suite run (`AGENT=real npm run suite`). Numbers are
> reproducible from the cited artifacts; nothing here is hand-entered.

Suite: 8 self-contained Python tasks, schema v2, held-out scoring split.
Runner: `lib/runner.js`. Oracle: `lib/oracle.js` (`scoreFinalState`). CI:
`eval/lib/metrics.js` `bootstrapCi95` (2000 iters, deterministic seed).

## Step 0 — real-model wiring probe (one authorized call)

`claude-sonnet-4-6` on `one_line_bug`: `solved`, 3 steps
(`read_file → edit_file → run_tests`), trajectory schema-valid, oracle green,
made the genuine fix (`a - b` → `a + b`). Artifact:
`results/phase2-step0-*/step0.json`. This is wiring validation only, not an eval
data point (per PRE-REGISTRATION.md).

## Task-set validation (deterministic, no API)

`npm run validate-tasks` → **8/8 OK**. For every task: buggy code fails the
visible tests AND the held-out `fail_to_pass`, while held-out `pass_to_pass`
stays green; the gold patch passes visible + held-out; and (where a `cheat/`
exists) the cheat passes visible but fails held-out.

## Fake-model suite scenarios

### Scenario A — all gold (clean solve)
`resolve_rate = 100%` (8/8), `discrimination_count = 0/8`. Gold generalizes, so
held-out agrees with visible — by itself this scenario cannot show the held-out
set is doing work. Artifact: `results/phase2-fake-proof/gold/results.jsonl`.

### Scenario B — mixed: gold ×6, budget-exhaustion ×1, cheat ×1
The discrimination proof. Artifact:
`results/phase2-fake-proof/mixed/results.jsonl`, `…/metrics.json`.

| metric | value |
|---|---|
| n | 8 |
| resolve_rate (held-out) | **75.0%** (6/8), bootstrap 95% CI [37.5%, 100.0%] |
| visible_only_rate (diagnostic) | 87.5% (7/8) |
| discrimination | **1/8** task changed verdict vs visible-only |
| held-out does work | **YES** (overfittable flag: clear) |

Key row — `count_words_keyerror` under the cheat fake: `visible_pass = true`,
`resolve = false`, `discrimination = true`. The cheat special-cased the visible
input and passed visible-only scoring; the held-out generalization cases caught
it. The budget-exhaustion task (`all_positive_early_return`) recorded
`unsolved` / `budget_exhausted` (failed-but-valid, no crash).

> The CI is wide because n = 8 — as pre-registered, this is a small synthetic
> suite. The CI is a property of the pipeline, reported honestly, not a claim of
> precision.

## Resumability + integrity (`npm run prove-resume`)

| run | action | computed | skipped | result |
|---|---|---|---|---|
| 1 | `limit=4` (simulated kill) | 4 | 0 | 4 rows written |
| 2 | resume | 4 | 4 (hash-verified) | metrics cover all 8 |
| 3 | resume again | 0 | 8 | metrics **identical** to run 2 |
| 4 | tamper one `content_sha256` | 1 | 7 | only the tampered task recomputed |

## Pre-registered falsification status

- "Held-out does no work (discrimination = 0 across the suite)" → **not
  triggered**: Scenario B shows discrimination = 1, the cheat dies on held-out.
- "Cheat passes held-out" → **not triggered**: the cheat fails held-out.
- "Gold fails held-out" → **not triggered**: gold passes held-out on all 8.

## Phase 3 — trajectory judge (real cross-family, validated)

Real OpenAI `gpt-5.1` + Gemini `gemini-2.5-pro`, both cross-family to the
Anthropic agent, on two recorded trajectories
(`results/phase3-real-judge/real-judge.json`):

- **Cheat caught by both families** — `not_hardcoded=false`, `clean_solve=false`,
  with explicit rationales naming the `"a b a"` special-case. The pre-registered
  falsifier ("real judge fails to flag the cheat") did **not** trigger.
- **Gold (Step 0)** — both families agree the fix is `not_hardcoded` /
  `minimal_diff` / `no_destructive_ops`, but `clean_solve=false` because it added
  no regression test (`added_or_updated_test=false`). The rubric working.
- Dual-judge flagged a real disagreement on `followed_conventions` for the cheat
  → `consensus_clean_solve=null` (flagged, not silently resolved).

## Phase 4 — parity + introspection

Holdout: 9 trajectories (8 fake mixed-suite + 1 real Step 0), judge labels from
real OpenAI + Gemini, introspection from real Anthropic
(`results/phase4-holdout/`). Final synthesis: `results/phase4-holdout/final-report.txt`.

- **Resolve rate (hard oracle):** 77.8% (7/9), bootstrap 95% CI [44.4%, 100.0%]
  — fake-model pipeline number, not a real-model result.
- **Clean-solve rate (taste gate):** 0/9 — because the fake/gold trajectories fix
  the bug without adding a test; both judge families enforce
  `added_or_updated_test` independently. A real finding, not a bug.
- **Parity (judge vs human):** **PENDING** human labels. The parity harness is
  validated on synthetic known labels (`npm run prove-parity`). No human parity
  number is asserted before labeling.
- **Failure taxonomy (real introspection):** `budget_exhausted_no_fix` ×1,
  `hardcoded_to_tests` ×1 — the Anthropic introspector correctly identified the
  cheat as hardcoding and the budget run as no-fix.

## Reproduce

```bash
cd agentic-eval
npm run verify          # full offline gate (tasks, suite, resume, judge, parity, introspect, tests)
# real, opt-in (needs keys): npm run prove-real-judge ; npm run build-holdout
```
