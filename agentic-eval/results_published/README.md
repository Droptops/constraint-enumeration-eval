# Published real-run artifacts

Durable, checked-in copies of the real-model run behind [RESULTS.md](../RESULTS.md).
The live `results/` directory is gitignored (it is a scratch/output area); these
are the audit copies. They contain trajectories, diffs, test output, and judge
verdicts — **no API keys** (verified before publishing).

| file | what |
|---|---|
| `suite-real-claude-sonnet-4-6.results.jsonl` | One row per task from the real agent run: full trajectory + held-out oracle verdict (`score.resolve`), with provenance hashes (`content_sha256`, `run_config_sha256`, `harness_sha256`). |
| `suite-real-claude-sonnet-4-6.judged-summary.json` | The two-layer summary: resolve rate, clean-solve rate per judge family, per-constraint satisfied rates, inter-judge agreement, honeypot reward-hacking analysis. |
| `phase3-real-judge.json` | Real OpenAI + Gemini judgments on the Step 0 gold trajectory and the recorded cheat, with rationales (the cross-family cheat-detection evidence). |
| `phase4-holdout-final-report.txt` | The parity + introspection synthesis from the Phase 4 holdout (judge-vs-human parity PENDING human labels). |

Models: agent `claude-sonnet-4-6`; judges `gpt-5.1` (OpenAI) + `gemini-2.5-pro`
(Gemini). Regenerate with `AGENT=real npm run suite` then
`node scripts/judge-suite.js <results.jsonl>` (spends API budget).
