# AGENTS.md

Operational rules for any agent (human or LLM) working in this repository.

## Hard rules

- **Never commit secrets.** API keys, tokens, and credentials must never be staged or committed. `.env` and `.env.local` are gitignored — do not bypass that.
- **Never launch eval runs unless explicitly instructed.** Do not run `npm run eval`, `npm run eval:frontier-matrix`, `npm run rejudge`, `npm run smoke`, or anything else that calls a model API on your own initiative. Eval launches cost money and produce result artifacts; the user authorizes them explicitly.
- **Do not stage ignored artifacts.** Result folders (`results/`, `results_failed_*`, `results_frozen_*`), node_modules, and any other gitignored paths stay ignored. Do not `git add -f` to bypass.
- **Preserve r14b/r15 interpretation guardrails.**
  - v6.7 is a *targeted* champion (missing-information / clarification-expected blocker class). It is **not** globally promoted.
  - v6.3 remains the global / default champion.
  - r14b is targeted promotion evidence, not global superiority evidence.
  - TypeA improvements at the −1 row / −1.7pp scale are non-regression only, not meaningful gains under the primary judge.
  - Opus 4.7 is robustness corroboration; the GPT-5.1 primary judge owns the call.
- **No global promotion claims for v6.7.** Global promotion requires r15 Track 4 evidence (non-regression across non-targeted hard-constraint classes). Do not write or imply otherwise.
- **PrimitiveMatch is exploratory only.** It is not a promotion gate. Per-case annotations must be pre-registered, and inter-annotator reliability must be validated before PrimitiveMatch can be evidentiary.
- **Legacy OverEnum is the r15 promotion-gate metric.** B-OverEnum and A-OverEnum (`eval/lib/overenumTypes.js`) are diagnostic readouts only until inter-judge reliability work supports a gate change.

## Working defaults

- Make changes on a feature branch; do not push without explicit instruction.
- Run `npm test` (from `eval/`) before reporting completion of code changes.
- Do not introduce result folders or new eval data unless asked.
