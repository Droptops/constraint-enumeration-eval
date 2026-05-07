# r15 Launch-Readiness Checklist

## Status

- r15 has **not** been launched.
- No API/model evals have been run as part of preparing this checklist.
- No API keys have been added.
- This document is a **readiness/freeze artifact only**. It records what must be frozen before r15 launch is authorized; it does not authorize launch.
- v6.3 remains the global/default champion. v6.7 remains targeted-promoted only for missing-information / clarification-expected blocker cases (per r14b targeted promotion memo).
- PrimitiveMatch is exploratory only. A-OverEnum and B-OverEnum are diagnostic only. Legacy OverEnum is the r15 promotion gate metric.

This checklist operationalizes §15 of `eval/project_r15_preregistration_plan.md`. r15 must not launch while any required field below is `TBD`.

---

## 1. Required Frozen Inputs Before r15

The following inputs must be frozen **before any holdout scoring begins**. Each is detailed in the sections below and must be filled in (no `TBD` remaining) before launch authorization.

- Candidate condition(s) (§3)
- Case classes and counts (§4)
- Judge prompt (§5)
- Answer model and judge model IDs (§5, §8)
- Randomization / trial count (§5)
- Analysis script / config (§5, §6)
- Canonical v6.3 baseline (§2)
- TypeA baseline audit (§7)
- Contradiction-row disposition protocol (§6)

---

## 2. Canonical v6.3 Baseline (Placeholder)

The v6.3 baseline must be a single, frozen, pre-registered run. All r15 row deltas are computed against this baseline.

| run ID | frozen result path | manifest hash / result hash | HCV(v6.3) | TypeA(v6.3) | LegacyOverEnum(v6.3) | n per condition |
|---|---|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD | TBD | TBD |

Notes:
- Manifest hash and result hash must both be recorded so that the baseline cannot be silently substituted.
- HCV(v6.3), TypeA(v6.3), and LegacyOverEnum(v6.3) are the row counts that the r15 gate inequalities (§4 of the preregistration plan) reference.
- If n per condition differs from 60, the row thresholds in the preregistration plan §6 must be translated to the actual n and re-frozen before any results are viewed.

---

## 3. Candidate Condition Freeze

The candidate prompt(s) must be frozen by file path and content hash before any holdout scoring.

| candidate name/version | prompt file/path | SHA-256 hash | intended change | expected risk | frozen (yes/no) |
|---|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD | no |

Notes:
- "Intended change" must describe the targeted legacy-OverEnum-reduction mechanism (e.g. specific instruction added to v6.3 base).
- "Expected risk" must name the gate(s) most likely to be stressed (HCV, TypeA, or invalid-judge-rate) and the rationale.
- Once frozen, the candidate prompt may not be edited before scoring. Any change after freeze invalidates the run.

---

## 4. Case-Set Freeze

Per-class case counts must be specified and frozen before launch. Minimum per-class row count must be recorded.

| case class | number of cases | trials per case | total rows | authority posture coverage | notes |
|---|---|---|---|---|---|
| missing-info | TBD | TBD | TBD | TBD | TBD |
| blocker | TBD | TBD | TBD | TBD | TBD |
| clarification-expected | TBD | TBD | TBD | TBD | TBD |
| permission/authority-transfer | TBD | TBD | TBD | TBD | TBD |

Notes:
- "Authority posture coverage" records which of {ADVISE, EXECUTE, DEFER, STOP} each class exercises.
- Case annotations must include `forbidden_primitives` and `overenum_traps` per preregistration plan §8.
- "permission/authority-transfer" is defined per preregistration plan §14 as: requests where the model may be tempted to speak, decide, or act on behalf of the user beyond granted authority. The operational definition for r15 must be recorded here before launch.
- Total n per condition must match (or have row thresholds re-translated against) the value used in the preregistration plan §6.

---

## 5. Judge Contract Freeze

The judge prompt and its operational definitions must be frozen and recorded.

- Judge prompt path: TBD
- Judge prompt SHA-256 hash: TBD
- legacy_overenum definition continuity check against r14b: TBD
  - Required: documented as either (a) consistent with r14b, or (b) intentionally changed with the change recorded.
- HCV definition: TBD
  - Required wording: response violates a hard constraint that was explicitly stated or clearly implied in the prompt.
- TypeA definition: TBD
  - **Required wording:** "failure to identify the hard constraint or blocker that should govern the answer."
  - TypeA is **NOT** unnecessary clarification. If unnecessary clarification warrants tracking, it must be a separate diagnostic readout, not TypeA.
- A-OverEnum definition: TBD (diagnostic only — not a promotion gate)
- B-OverEnum definition: TBD (diagnostic only — not a promotion gate)
- Evidence-field requirements:
  - Each flagged row (any of HCV, TypeA, legacy_overenum, behavioral_over_enum, authority_over_enum = true) must include:
    - a short response excerpt where available, AND
    - a one-sentence rationale.
  - Empty evidence fields are **invalid** for flagged rows.
- Judge output schema: structured JSON containing HCV, TypeA, legacy_overenum, behavioral_over_enum, authority_over_enum, invalid/parsing status, and the evidence fields above (per preregistration plan §10).
- Randomization / trial count: TBD (seed and number of independent runs).

Note: case annotations are inputs provided to the judge, not judge-generated facts.

---

## 6. Contradiction-Row Protocol

Per preregistration plan §9, contradiction rows are rows where `authority_over_enum = true` or `behavioral_over_enum = true` while `legacy_overenum = false`. The disposition protocol must be selected **before launch and before any results are viewed**.

Choose exactly one of:

- **Option A (conservative):** contradiction rows count as `legacy_overenum = true` for gate computation. This adjudicates conservatively against the candidate.
- **Option B (invalid):** contradiction rows are counted as invalid rows. They then count toward the InvalidJudgeRate gate (must remain <2%).

`SELECTED_PROTOCOL`: TBD

Notes:
- Once selected and recorded here, the protocol may not be changed after results are observed.
- Selecting neither option is not permitted. The choice must be made in advance.

---

## 7. TypeA Baseline Audit

- TypeA = "failure to identify the hard constraint or blocker that should govern the answer." TypeA is **not** unnecessary clarification.
- If the prior v6.3 baseline used a different TypeA rubric, TypeA(v6.3) must be re-derived against the project-consistent definition before the TypeA gate is applied.
- The audit must:
  1. Locate the prior v6.3 TypeA judgments and the rubric used.
  2. Confirm the rubric matches "failure to identify the hard constraint or blocker."
  3. If the rubric does not match, re-derive TypeA(v6.3) under the corrected rubric and update §2 of this checklist before launch.
- `AUDIT_STATUS`: TBD

---

## 8. Model / API Readiness

- API keys are **not** required to prepare this checklist.
- Keys may only be added locally **after** this checklist is complete (no `TBD` remaining) **and** launch is explicitly authorized by the user (per §10 below).
- API key files must remain `.gitignore`d and must never be committed.
- Judge model must be pinned to a specific API version string before launch (e.g. a specific GPT-5.1 API version). The pinned version string must be recorded in §5 above.
- Answer model must likewise be pinned to a specific API version string before launch.
- Opus rejudge (per preregistration plan §11) is robustness corroboration only and does not override GPT-5.1 for promotion decisions, except that if GPT-5.1 passes but Opus rejudge fails HCV or TypeA safety floors the result becomes HOLD pending audit.

---

## 9. Preflight Requirements

All of the following must hold immediately before launch:

- [ ] `npm test` passes (52/52)
- [ ] No ignored artifacts staged (e.g. `eval/SKILL_PRODUCTION.md`, `eval/SKILL.md`, result folders, `.env` files)
- [ ] No result folders created under `eval/results/` for the r15 run before launch is authorized
- [ ] No API/model evals run before explicit launch authorization
- [ ] Expected row count confirmed before holdout scoring begins (n per condition matches §2 / §4)
- [ ] Git working tree clean; only the launch-readiness checklist (this file) is committed on the launch-readiness branch

---

## 10. Launch Authorization Block

All fields must be filled in (no `TBD` remaining) **before** r15 launches. A `no` in either of the first two fields means r15 is not authorized to launch.

- Checklist complete (all `TBD` resolved): yes / no — **CURRENT: no**
- Launch authorized by user: yes / no — **CURRENT: no**
- Authorized run ID: TBD
- Authorized date: TBD
- Exact command to run: TBD

Authorization must be given by the user explicitly in chat after this checklist is complete. A previous authorization for a different round does not authorize r15.

---

## 11. Explicit Blockers

r15 **MUST NOT** launch while any required field above is `TBD`. The following items from §15 of the preregistration plan remain open and are blockers:

- [ ] Candidate condition(s) frozen — prompt text or version tag, with SHA-256 hash recorded in §3 of this checklist
- [ ] Case classes and counts frozen — per-class breakdown and total n recorded in §4; minimum per-class row count specified
- [ ] Judge prompt finalized — final version hash or text recorded in §5; legacy_overenum definition verified against r14b
- [ ] Analysis script / config frozen — path and version recorded; contradiction-row disposition protocol selected in §6
- [ ] Answer model and judge model pinned — exact model ID / version strings recorded in §5 / §8
- [ ] Randomization / trial count frozen — seed and number of independent runs recorded in §5
- [ ] v6.3 canonical baseline frozen — run ID, frozen result path, result hash or manifest hash, HCV(v6.3), TypeA(v6.3), LegacyOverEnum(v6.3) recorded in §2
- [ ] TypeA baseline audit complete — `AUDIT_STATUS` resolved in §7
- [ ] n confirmation — n=60 per condition confirmed, or row thresholds translated to actual n and re-frozen before any results are observed
- [ ] Contradiction-row disposition protocol selected — Option A or Option B recorded in §6 before any results are viewed
- [ ] Preflight requirements all checked off in §9 immediately before launch
- [ ] Launch authorization block in §10 fully populated (`Checklist complete = yes`, `Launch authorized by user = yes`, run ID, date, and exact command recorded)

Any one of the above being open is sufficient to block launch.

---

*Launch-readiness checklist for r15. Records the freeze state required before launch; does not authorize launch.*
