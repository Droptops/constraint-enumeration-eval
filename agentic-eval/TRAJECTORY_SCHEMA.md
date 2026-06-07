# Trajectory schema — FROZEN v1.0

This is the contract for what the agentic spine records. It is frozen now, in
Phase 1, because two later phases consume it:

- **Phase 3** (constraint-enumeration trajectory judge) scores the final diff +
  this trajectory.
- **Phase 4** (introspection) re-reads this trajectory on failed runs.

The executable definition lives in [`lib/trajectory.js`](lib/trajectory.js)
(`validateTrajectory` enforces it after every run). This file is the
human-readable spec. If a field changes, the schema version changes and both
consumers are revisited.

## Run record (envelope)

Each run writes one JSON object:

| Field | Type | Meaning |
|---|---|---|
| `run_id` | string | Timestamped id shared by all branches in a run. |
| `branch` / `model_id` | string | Which model-under-test produced this (e.g. `fake:clean_solve`). |
| `task_id` | string | Task identifier. |
| `seed` | string | Seed recorded for reproducibility. |
| `workspace_sha256` | string | Content hash of the workspace snapshot the agent saw. |
| `run_config_sha256` | string | Hash of the run config (model, budget, timeout, pinned pytest). |
| `python_version` | string | Interpreter that ran the oracle (provenance). |
| `pytest_version` / `pinned_pytest` | string | Test-runner version, observed and pinned. |
| `outcome` | `"solved"` \| `"unsolved"` | Whether the loop ended on green tests. |
| `loop_stop_reason` | terminal reason | Why the loop ended (see below). |
| `step_count` | integer | Number of steps recorded. |
| `oracle` | object | Deterministic pass/fail (see `lib/oracle.js`). |
| `trajectory` | array of steps | The ordered steps (below). |

## Step (the frozen unit)

A trajectory is an **ordered array**; `steps[i].step_idx === i` is enforced.
Each step has **exactly** these fields:

| Field | Type | Meaning |
|---|---|---|
| `step_idx` | integer | 0-based; equals the array index. |
| `action_type` | enum | `read_file` \| `edit_file` \| `run_tests` \| `malformed` \| `model_stop`. |
| `action_args` | object | The tool input. For `malformed`, the raw rejected payload. For `model_stop`, the model's final payload (or `null`). |
| `observation` | object | The tool result / harness response for this step. |
| `stop_reason` | terminal reason \| `null` | `null` while the loop continues; set on the step that ended the loop. |
| `tokens` | object \| `null` | Model token usage for the turn if the `callModel` provided it; `null` for the fake model. |

### `action_type` semantics

- `read_file` / `edit_file` / `run_tests` — a tool the model invoked. `observation.ok === false` marks a **valid action with bad tool inputs** (e.g. `edit_file` with a non-unique `old_str`); the loop records it and continues.
- `malformed` — the model emitted an **unrecognized action** (unknown `action_type`, or a non-object action). Recorded with `observation.ok === false`; the loop continues.
- `model_stop` — the model chose to stop (`action_type: "stop"`). Ends the loop.

### `stop_reason` (terminal reasons)

One of: `tests_passed` · `budget_exhausted` · `model_stopped`. `null` on every
non-terminal step. The run-level `loop_stop_reason` repeats the terminal value.

## Invariants enforced by `validateTrajectory`

1. `steps` is an array; each element is an object.
2. Every step has all six fields above.
3. `step_idx` equals the array index (no gaps, no reordering).
4. `action_type` is one of the five allowed values.
5. `stop_reason` is `null` or a valid terminal reason.

A run that violates any invariant throws before it can be recorded — a malformed
trajectory can never silently reach Phase 3 or Phase 4.
