# agentic-eval

A small, SWE-bench-**style** agentic coding eval. A model-under-test acts in a
sandboxed workspace over multiple steps (read, edit, run tests) and is scored on
the **environment outcome** (do the tests pass) — with a constraint-enumeration
**trajectory-quality** layer (ported from the sibling `eval/` project) scoring
*how* it solved the task.

> **Scope honesty.** This is a small **synthetic** suite, not SWE-bench and not
> SWE-bench scale. The "sandbox" is **process isolation + a wall-clock timeout +
> an output cap + in-process network denial in a fresh temp dir** — not a
> kernel/OS security container. Tasks are author-trusted; the only
> model-controlled code is the bounded edit. Claims will not exceed what an
> artifact supports.

## Headline result (real run) — see [RESULTS.md](RESULTS.md)

`claude-sonnet-4-6` on 11 held-out tasks: **resolves 100%, clean-solves 0%.** The
entire gap is one measurable behavior — it never adds a regression test — while
`minimal_diff / no_destructive_ops / not_hardcoded / followed_conventions` are all
100%, two cross-family judges (OpenAI + Gemini) agree on 100% of cells, and Claude
declines every reward-hacking honeypot. And it's **causal**: adding one line to the
prompt ("also add a test") moves clean-solve **0% → 100%** with resolve unchanged.
`claude-haiku-4-5` also resolves 100%, so resolve can't rank the models — clean-solve
can. The thing a resolve-rate benchmark can't see. Figure:
[RESULTS-figure.svg](RESULTS-figure.svg).

> The headline real numbers are from the original **11-task** subset. The suite
> has since grown to **23 tasks** (harder: stateful, multi-file, algorithmic);
> re-running the real agent on the full set is a pending real-spend step.

## Status: Phases 1–4 built

All four phases are built. The real Anthropic tool-use client
([`lib/anthropicAgent.js`](lib/anthropicAgent.js)) was wiring-validated with one
authorized call (Step 0); the real cross-family judges (OpenAI + Gemini) and the
real introspector (Anthropic) were validated on recorded trajectories. The
deterministic pipeline runs offline and free with fake model / fake judge.

**One-command offline verification (no API keys):**
```bash
npm run verify   # validate-tasks + suite + resume + judge + parity + introspect + unit tests
```

- **Phase 3 — trajectory judge:** a cross-family LLM fills five behavioral
  booleans over `{spec, reconstructed diff, trajectory summary}`
  ([`lib/trajectoryJudge.js`](lib/trajectoryJudge.js)); a deterministic in-code
  AND-gate ([`lib/trajectoryGate.js`](lib/trajectoryGate.js), mirroring
  `eval/lib/score.js`) computes `clean_solve = oracle_pass AND all five`. Dual
  judges report agreement and flag disagreement. `npm run prove-judge` (offline);
  `npm run prove-real-judge` (real, opt-in).
- **Phase 4 — parity + introspection:** judge-vs-human field parity
  ([`lib/parity.js`](lib/parity.js)), printed not asserted; failure taxonomy via
  agent self-introspection ([`lib/introspect.js`](lib/introspect.js)).
  `npm run prove-parity` / `npm run prove-introspect` (offline). The
  human-parity number is **PENDING your labels**:
  ```bash
  npm run build-holdout   # real judge labels + real introspection (needs keys)
  npm run labels:init     # copy label-template.json -> human-labels.json
  # ...fill human_labels (true/false) in human-labels.json...
  npm run report-final    # resolve rate | clean-solve rate | parity | taxonomy
  ```

Phase 2 adds:

- **Task schema v2 with a held-out scoring split** — the agent's workspace has
  buggy code + a spec (module docstring) + visible tests; the scoring
  `fail_to_pass`/`pass_to_pass` tests live in `heldout/`, outside the workspace,
  injected only at oracle time. **Resolve = passed tests the agent could not
  read** (the SWE-bench anti-overfit pattern). See
  [`PRE-REGISTRATION.md`](PRE-REGISTRATION.md) and
  [`METRICS-REPORT.md`](METRICS-REPORT.md).
- **23 self-contained Python tasks** under [`tasks/`](tasks) (varied real bug
  patterns — stateful, algorithmic, multi-file, incl. 7 reward-hacking
  honeypots), each validated: buggy fails held-out, gold passes held-out, planted
  cheat dies on held-out.
- **Resumable runner** ([`lib/runner.js`](lib/runner.js)) with per-task hash
  integrity (skip on match, recompute on mismatch), resolve rate + bootstrap CI,
  and a visible-vs-held-out discrimination metric.

```bash
npm run validate-tasks   # deterministic task invariants (23/23)
npm run prove-suite      # fake-model proof incl. cheat dying on held-out
npm run prove-resume     # kill/resume + hash-integrity proof
npm run suite            # one-command run (AGENT=fake-gold default; AGENT=real opt-in)
```

What the Phase 1 spine provides:

- **Sandbox** ([`lib/sandbox.js`](lib/sandbox.js)) — per-run temp copy of the
  workspace; path-guarded reads/edits (blocks `..`, absolute paths, symlink
  escapes); pytest in an isolated subprocess with a wall-clock timeout, an
  output-size cap, and in-process network denial (via a `sitecustomize` on
  `PYTHONPATH`, see [`lib/netblock/`](lib/netblock/sitecustomize.py)).
- **Tool loop** ([`lib/agent.js`](lib/agent.js)) — `read_file`, `edit_file`
  (string replace), `run_tests`; iterates until tests pass or a step budget
  (default 15) is hit; `callModel` is injected.
- **Frozen trajectory schema** ([`TRAJECTORY_SCHEMA.md`](TRAJECTORY_SCHEMA.md),
  [`lib/trajectory.js`](lib/trajectory.js)).
- **Hard oracle** ([`lib/oracle.js`](lib/oracle.js)) — deterministic pass/fail,
  no judge: after the final edit, do `fail_to_pass` pass and `pass_to_pass` stay
  green?
- **One trivial task** ([`tasks/one_line_bug/`](tasks/one_line_bug)) — a
  one-character arithmetic bug, a failing pytest, and a gold patch.

## Reuse, not duplication

The cross-vendor judge client, retry/backoff, hashing, seeded RNG, and stats in
the sibling `../eval/lib` are reused **by import** (read-only; no edits to
`eval/`). The Anthropic tool-use client is **new** code, because
`eval/lib/anthropic.js`'s `callClaude` does not support tools.

## Run it

Requires Node ≥ 20 and a base Python on `PATH`. First run bootstraps a local
`.venv` with a pinned pytest (network needed once for that install only).

```bash
cd agentic-eval
npm run smoke   # runs the four fake-model branches, writes results/<run_id>/
npm test        # deterministic unit tests (sandbox guards, loop, schema, oracle)
```

Pinned: `pytest==8.4.2`. The Python version is recorded per run in provenance
(it is whatever created the venv).
