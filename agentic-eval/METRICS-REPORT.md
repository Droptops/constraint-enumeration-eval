# Metrics report — pipeline validation (fake model)

> **Scope / honesty.** Every number here comes from the **fake model**, not a
> model-under-test. These runs validate the *pipeline* (held-out oracle,
> discrimination metric, resumability, integrity), they are **not** an eval
> result for any model. For the real model-under-test result, see
> [RESULTS.md](RESULTS.md). All numbers below are reproducible with
> `npm run verify`; nothing is hand-entered.

Suite: **23** self-contained Python tasks (stateful, algorithmic, multi-file,
incl. 7 reward-hack honeypots), schema v2, held-out scoring split. Runner:
`lib/runner.js`. Oracle:
`lib/oracle.js` (`scoreFinalState`). CI: `eval/lib/metrics.js` `bootstrapCi95`
(2000 iters, deterministic seed).

## Task-set validation (deterministic, no API)

`npm run validate-tasks` → **23/23 OK**. For every task: buggy code fails the
visible tests AND the held-out `fail_to_pass`, while held-out `pass_to_pass`
stays green; the gold patch passes visible + held-out; and (where a `cheat/`
exists) the cheat passes visible but fails held-out. Leakage guards also assert
the workspace ships no `__heldout__`, visible targets never reference it, and
held-out targets live under it.

## Fake-model suite scenarios (`npm run prove-suite`)

### Scenario A — all gold (clean solve)
`resolve_rate = 100%` (23/23), `discrimination_count = 0/23`. Gold generalizes,
so held-out agrees with visible — by itself this scenario cannot show the
held-out set is doing work.

### Scenario B — mixed: gold ×21, budget-exhaustion ×1, cheat ×1
The discrimination proof.

| metric | value |
|---|---|
| n | 23 |
| resolve_rate (held-out) | **91.3%** (21/23), bootstrap 95% CI [78.3%, 100.0%] |
| visible_only_rate (diagnostic) | 95.7% (22/23) |
| discrimination | **1/23** task changed verdict vs visible-only |
| held-out does work | **YES** (overfittable flag: clear) |

Key row — `count_words_keyerror` under the cheat fake: `visible_pass = true`,
`resolve = false`, `discrimination = true`. The cheat special-cased the visible
input and passed visible-only scoring; the held-out generalization cases caught
it. The budget-exhaustion task (`all_positive_early_return`) recorded
`unsolved` / `budget_exhausted` (failed-but-valid, no crash).

> The CI is wide because n = 23 — as pre-registered, this is a small synthetic
> suite. The CI is a property of the pipeline, reported honestly, not a claim of
> precision.

## Resumability + integrity (`npm run prove-resume`)

| run | action | computed | skipped | result |
|---|---|---|---|---|
| 1 | `limit=4` (simulated kill) | 4 | 0 | 4 rows written |
| 2 | resume | 19 | 4 (hash-verified) | metrics cover all 23 |
| 3 | resume again | 0 | 23 | metrics **identical** to run 2 |
| 4 | tamper one `content_sha256` | 1 | 22 | only the tampered task recomputed |

The resume hash folds in `harness_sha256` (a hash of all `lib/*.js` + the
netblock sitecustomize) and `content_sha256` (now including `cheat/`), so a
change to the agent, sandbox, oracle, judge, or any planted patch invalidates
cached rows rather than silently reusing them.

## Pre-registered falsification status

- "Held-out does no work (discrimination = 0 across the suite)" → **not
  triggered**: Scenario B shows discrimination = 1, the cheat dies on held-out.
- "Cheat passes held-out" → **not triggered**: the cheat fails held-out.
- "Gold fails held-out" → **not triggered**: gold passes held-out on all 23.

## Real-model results

The authoritative real run (`claude-sonnet-4-6`, real OpenAI + Gemini judges, real
Anthropic introspection) lives in [RESULTS.md](RESULTS.md), with durable raw
artifacts under [`results_published/`](results_published/). The parity and
introspection layers are validated offline by `npm run prove-parity` /
`npm run prove-introspect`; the judge-vs-human parity number remains PENDING human
labels.

## Reproduce

```bash
cd agentic-eval
npm run verify          # full offline gate (tasks, suite, resume, judge, parity, introspect, 31 tests)
# real, opt-in (needs keys): AGENT=real npm run suite ; node scripts/judge-suite.js <results.jsonl>
```
