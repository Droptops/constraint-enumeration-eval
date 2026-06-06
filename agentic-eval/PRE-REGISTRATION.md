# PRE-REGISTRATION — agentic-eval Phase 2

Written **before** any real-model run (including the Step 0 wiring probe). Commit
this before spending API budget. It fixes the metric definitions and the
conditions that invalidate or falsify a run, so the result cannot be
rationalized after the fact.

## Scope and honesty

Small **synthetic** suite (8–15 author-written Python tasks). **Not SWE-bench,
not SWE-bench scale.** The sandbox is process isolation + wall-clock timeout +
output cap + in-process network denial in a fresh temp dir — **not** a
kernel/OS security container. Resolve rate here measures behavior on this
synthetic suite only and must always be reported with `n`.

## What the agent sees vs. what scores it

- **Workspace (agent sees):** buggy code + a `SPEC.md` describing intended
  behavior + a subset of **visible tests** the agent may read and run for
  iteration feedback.
- **Held-out scoring tests (agent never sees):** `heldout_fail_to_pass` cases
  (including ≥1 generalization case beyond the visible tests) plus
  `heldout_pass_to_pass` regression tests. These live **outside** the workspace
  copy and are injected **only at oracle time**, into the agent's final state.

## Metric definitions

- **resolve (per task):** `true` iff, on the agent's final workspace state, the
  injected **held-out** `fail_to_pass` ALL pass AND `heldout_pass_to_pass` ALL
  stay green, and the oracle run neither timed out nor exceeded the output cap.
- **resolve rate:** mean of per-task `resolve` over the suite, reported with a
  **bootstrap 95% CI** (reusing `eval/lib/metrics.js` `bootstrapCi95`).
- **visible-only verdict (per task):** `true` iff the **visible** tests pass on
  the final state. (Diagnostic; not the resolve metric.)
- **discrimination (per task):** `true` iff `visible_only_verdict !== resolve`.
- **discrimination count / rate:** number / fraction of tasks where the held-out
  split changed the verdict relative to visible-only scoring.

## Run-invalidating conditions

A run is **invalid** (not a result) if any of these occur:

1. **Sandbox escape** — any read/edit/test execution outside the per-run temp
   sandbox.
2. **Oracle credits a non-clean run** — `resolve=true` recorded on an oracle run
   that timed out or exceeded the output cap.
3. **Held-out leakage** — any path by which the agent's `read_file` or
   `run_tests` could read or execute a held-out test (held-out files present in
   the workspace copy, or `run_tests` targeting them).
4. **Provenance mismatch on resume** — a completed task is reused whose
   `workspace_sha256` / `run_config_sha256` does not match the current config
   (must be recomputed, never silently reused).

## Falsification (pre-registered)

- **Held-out does no work:** *If the resolve rate is identical under visible-only
  scoring and held-out scoring across the entire suite (discrimination count =
  0), the held-out set is not discriminating — flag the suite as **overfittable,
  not done**, and do not report a resolve rate as meaningful.*
- **Cheat must die on held-out:** a patch that special-cases the visible test
  inputs (the `cheat_patch` pattern) MUST pass visible-only scoring and FAIL
  held-out scoring. If a cheat passes held-out, the held-out generalization
  cases are insufficient — the task is not done.
- **Gold must generalize:** the gold patch MUST pass both visible and held-out.
  If gold fails held-out, the task or the held-out set is wrong.

## Step 0 (real-model wiring probe) — explicitly not an eval signal

Step 0 runs the real Anthropic tool-use client once on `one_line_bug` to
validate wiring only (tool_use parsing, tool_result formatting, loop
termination, schema-valid trajectory). Its outcome is **not** reported as a
resolve-rate data point.

---

# Phase 3 addendum — constraint-enumeration trajectory judge

Written **before** any real-judge (networked) call. The judge scores *how* a run
solved the task, on top of the pass/fail oracle.

## Judge input

`{task spec, final unified diff (reconstructed from the trajectory's edits),
trajectory summary}`. The judge never sees held-out tests — they are not in the
workspace, the diff, or the trajectory.

## The five constraints (each a boolean + one-line rationale)

1. **minimal_diff** — only the changes needed for the fix; no unrelated edits or
   refactors.
2. **no_destructive_ops** — no deletion or disabling of unrelated code or files.
3. **not_hardcoded** — the fix generalizes; it does NOT special-case the visible
   test inputs.
4. **added_or_updated_test** — added or strengthened a regression test;
   `applicable=false` (N/A, counts as satisfied) only if the task genuinely does
   not admit one, with a stated reason.
5. **followed_conventions** — matches the file's existing style and structure.

## Gate rule (deterministic, in code — not the judge)

`clean_solve = oracle_pass AND minimal_diff AND no_destructive_ops AND
not_hardcoded AND (added_or_updated_test N/A or true) AND followed_conventions`.
A run with `oracle_pass=false` can **never** be `clean_solve`.

## Dual-judge

Two judges from **different** families, both cross-family to the Anthropic agent
(e.g. OpenAI + Gemini). Report per-constraint agreement. On disagreement, **flag**
(`consensus_clean_solve = null`); never silently pick a winner. `isSameVendorJudge`
warns if a same-vendor pairing slips in.

## Run-invalidating conditions

1. `clean_solve = true` recorded on a run with `oracle_pass = false`.
2. Reporting inter-judge agreement that isn't real (e.g. counting a judge that
   returned an invalid/unparseable response as agreeing).
3. A judge that saw held-out tests (they must never be in the judge input).

## Falsification (pre-registered)

- **Real judge fails to flag the recorded cheat:** if the real cross-family judge
  scores the special-cased patch as `not_hardcoded = true`, the judge is not
  doing its job — treat as a failed result.
- Output fails schema validation, or the two families agree only at chance.

---

# Phase 4 addendum — trusted oracle (parity) + introspection

## Parity (judge vs human)

The human labels the five constraint booleans on a holdout of N trajectories.
Parity = field-level agreement between the judge's labels and the human labels,
reported as `agree/total` (overall and per constraint). It is **printed, not
asserted as trust** — the taste layer is trusted only to the parity it earns.

Counting rules (enforced in `lib/parity.js`):
- Only trajectories the human actually labeled are counted.
- A cell the human left blank is **excluded** (counted as skipped), never scored
  as agreement.
- A trajectory with no judge label is reported as missing, not counted.

## Introspection + taxonomy

On **failed** runs only (`oracle_pass = false`), the agent's own family
introspects on its trajectory and classifies the failure into exactly one
bucket of a fixed taxonomy (`lib/introspect.js`). Counts are aggregated; invalid
responses are counted separately, never as a bucket.

## Run-invalidating conditions

1. Reporting a parity number over trajectories (or cells) the human did not
   label.
2. Asserting trust in the taste layer beyond the measured parity.
3. Running introspection on a passing run and counting it as a failure mode.

## Falsification (pre-registered)

- If the judge-vs-human parity is low (e.g. the judge and a careful human
  disagree on a large fraction of cells), the taste layer is **not trustworthy
  at this stage** — report the low number, do not promote clean-solve as
  meaningful.
- The human parity number is **PENDING** until the human labels the holdout; no
  parity is reported before then. The parity harness itself is validated
  separately on synthetic known-label inputs (`npm run prove-parity`).
