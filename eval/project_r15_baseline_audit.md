# r15 Baseline Audit: v6.3 Canonical Baseline Blocker

## Status

- Document type: documentation-only audit note
- No API/model evals have been run.
- r15 has not been launched.
- No API keys have been added.
- This document records the blocker preventing §2 of `eval/project_r15_launch_readiness.md` from being filled in, and the recommended resolution.

---

## 1. Audit Target

Section §2 of `eval/project_r15_launch_readiness.md` requires the following to be frozen before r15 launch:

| Required field | Status |
|---|---|
| run ID | TBD |
| frozen result path | TBD |
| manifest hash / result hash | TBD |
| HCV(v6.3) | TBD |
| TypeA(v6.3) | TBD |
| LegacyOverEnum(v6.3) | TBD |
| n per condition | TBD |

---

## 2. Candidate Artifacts Found

| Path | Status |
|---|---|
| `eval/results_frozen_v6_3_r10/` | Present (gitignored, main repo working tree) |
| `eval/results_frozen_v6_4_r11/` | Present — byte-identical copies of r10 artifacts; not independently canonical |
| `eval/results_failed_v6_3_r8_no_candidate_incomplete_gemini/` | Present — excluded (failed/incomplete run) |
| `eval/results_frozen_v6_7_r14b/` | **Missing locally — not present on disk** |

---

## 3. r10 Candidate Details

The most complete candidate in `eval/results_frozen_v6_3_r10/` is:

| Field | Value |
|---|---|
| run ID | `frontier-lab-2026-05-05T16-00-32-104Z.anthropic-claude-sonnet-4-6.openai-gpt-5.1` |
| manifest path | `eval/results_frozen_v6_3_r10/frontier-lab-2026-05-05T16-00-32-104Z.manifest.json` |
| summary path | `eval/results_frozen_v6_3_r10/frontier-lab-2026-05-05T16-00-32-104Z.anthropic-claude-sonnet-4-6.openai-gpt-5.1.summary.json` |
| HCV(v6.3) — `production_constraint_prompt`, GPT-5.1, n=60 | 21 rows / 35.0% |
| n per condition | 60 (3 trials × 20 cases) |
| answer model | `anthropic/claude-sonnet-4-6`, temp 0.5 |
| primary judge | `openai/gpt-5.1`, temp 0 |
| rejudge | `anthropic/claude-opus-4-7` |
| `skill_production_v63_sha256` | `b7656d87ccb963b2ad243f8fd534f5964a64b52b727fa3a340edb57cf2820504` |
| `cases_sha256` | `7f43e0518dbedea6ff09c4c7ff18f5b0d309e05704faaad8953a980592743d9f` |
| `run_config_sha256` | `f7b68f3907d5b765021e9c5b7b88044712f98b5caaa729a0c73ca66be133af70` |

A second GPT-5.1 r10 run (`frontier-lab-2026-05-05T11-34-08-930Z…`) has only a partial manifest and shows different values for the same condition: HCV=19 (31.67%), OE=11 (18.33%). The two runs are independent samples of the same configuration (identical input hashes, temp 0.5 answer model). Neither is uniquely canonical without a pre-registration choice.

---

## 4. Blockers

### Gap A — TypeA field absent from r10

The r10 judge schema contains `unnecessary_clarification_rate`, not the project-consistent TypeA field. TypeA for r15 is defined as "failure to identify the hard constraint or blocker that should govern the answer" — this is **not** the same as unnecessary clarification. The r14b memo cites TypeA(v6.3)=26.7% under GPT-5.1, but the artifact that produced that figure (`eval/results_frozen_v6_7_r14b/`) is missing locally. TypeA(v6.3) cannot be read off the r10 artifacts.

### Gap B — LegacyOverEnum not directly extractable from r10

r10 predates the legacy/A/B OverEnum split introduced in PR #4. The r10 schema field `over_enumeration_rate` is not guaranteed to be equivalent to `legacy_overenum` under the r15 judge schema. The §5 continuity check — "r15 judge prompt legacy_overenum definition must be reviewed against the r14b judge prompt" — cannot be completed without the r14b judge prompt, which is part of the missing `eval/results_frozen_v6_7_r14b/` artifact.

### Gap C — Multiple r10 GPT-5.1 runs with different values

Two GPT-5.1 r10 runs exist with identical input hashes but different stochastic outputs. Without an explicit pre-registration choice designating one as canonical, neither can serve as the single frozen baseline required by §2.

### Gap D — r14b frozen artifact missing locally

`eval/results_frozen_v6_7_r14b/` does not exist on disk. The r14b promotion memo's cited v6.3 baseline values (HCV=28.3%, TypeA=26.7%, OverEnum=40.0% under GPT-5.1) cannot be verified from local artifacts. It is not clear whether those values came from a different condition within r10, a different run, or a run that has not been recovered locally.

---

## 5. Decision

The r10 artifacts are useful as historical evidence but are **not approved as the canonical r15 v6.3 baseline**.

`eval/project_r15_launch_readiness.md` §2 remains `TBD`. r15 cannot launch until §2 is resolved.

The canonical baseline should be established via one of the following:

**Option A — Recover the r14b artifact:**
Locate the missing `eval/results_frozen_v6_7_r14b/` artifact (from backup, remote storage, or a previous machine state). Verify its hashes and extract the TypeA and LegacyOverEnum counts. Confirm that the judge schema used is compatible with the r15 judge schema (Gap B continuity check).

**Option B — Run a fresh v6.3 baseline under the r15 schema:**
After all r15 inputs are frozen (case set, judge prompt, model IDs, analysis config) and after explicit user authorization, establish the v6.3 baseline under the r15 judge schema. Two sub-paths exist:

- **Option B1 (preferred — separate baseline run):** Run an explicitly authorized v6.3-only baseline under the final r15 schema. Fill §2 of `eval/project_r15_launch_readiness.md` from that baseline. Only then authorize the candidate comparison run. This preserves the process guarantee that §2 is frozen before the candidate run begins.

- **Option B2 (combined matrix — requires checklist amendment):** Run v6.3 and the candidate in the same authorized matrix. This is statistically clean but requires explicitly amending `eval/project_r15_launch_readiness.md` to record that §2 will be filled from the combined run output rather than from a prior frozen baseline. Do not use B2 unless the user explicitly approves that checklist amendment.

---

## 6. Recommended Resolution

**Prefer Option B1** for current process hygiene. B1:
- eliminates legacy/r15 schema mismatch (Gap B)
- produces TypeA under the r15-consistent rubric (Gap A)
- avoids ambiguity between two r10 stochastic runs (Gap C)
- does not depend on recovering a missing artifact (Gap D)
- preserves the process guarantee that §2 is frozen before the candidate run begins

Prerequisites before Option B1 can be executed (all from §11 of `eval/project_r15_launch_readiness.md`):
- [ ] Case set frozen
- [ ] r15 judge prompt frozen and hashed
- [ ] Answer model and judge model IDs pinned
- [ ] Contradiction-row disposition protocol selected
- [ ] Analysis script / config frozen
- [ ] Explicit user launch authorization in §10

Do not add API keys or run any evals until those prerequisites are met and launch is explicitly authorized.

Option B2 is available but requires the user to explicitly approve an amendment to `eval/project_r15_launch_readiness.md` §2 before that run is executed.

---

## 7. Launch-Readiness Impact

- `eval/project_r15_launch_readiness.md` §2 (Canonical v6.3 Baseline) remains `TBD`.
- `eval/project_r15_launch_readiness.md` §7 (TypeA Baseline Audit) remains `TBD`.
- r15 cannot launch until both are resolved.
- No other sections of the launch-readiness checklist are unblocked by this audit.

---

*Documentation-only audit note. No evals were run. No frozen artifacts were modified. r15 remains blocked.*
