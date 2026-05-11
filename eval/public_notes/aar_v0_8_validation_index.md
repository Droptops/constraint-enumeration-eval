# AAR v0.8 — Validation Index

**Status:** Scorer parity validated | Human-adjudicated holdout complete | Automated benchmark pass not claimed
**Last updated:** 2026-05-11
**Master HEAD at time of writing:** 4288145

---

## 1. Executive Summary

AAR v0.8 (agent-authority-router-skill) has a complete human-adjudicated behavioral holdout evidence trail covering 40 Windows-native raw responses (39 scored, h019 excluded as INVALID_CASE). The holdout was evaluated by two independent human adjudicators under a pre-registered rubric; the exclusion scenario result is 38/39 scored cases passed.

A deterministic automated scorer (`eval/lib/scorerParity.js`) was subsequently built and repaired over two PRs (PR #14, PR #15). The repaired scorer now achieves 195/195 field-level parity with second-independent human adjudication on the frozen 39-case set.

**This index validates the scorer, not a new automated behavioral benchmark pass.** No new model/API evaluation was run at any point in the scorer parity workstream.

---

## 2. Evidence Chain

| Artifact | Type | Location / SHA | Status |
|---|---|---|---|
| `agent-authority-router-skill_v0_8.zip` | Frozen skill release | Local evidence folder · SHA `55233ad6…` | Frozen, unmodified |
| `holdout_responses_claude_sonnet_4_6_windows_native.json` | Raw holdout responses (Windows-native) | Local evidence folder · SHA `49BB45F4…F59659` | Frozen, unmodified |
| `AAR_v0_8_second_independent_human_adjudication.csv` | Human-adjudicated labels (second adjudicator) | Local evidence folder · SHA `BE0490E0…7AE9F6` | Frozen, unmodified |
| `holdout_cases_v1.jsonl` | Frozen holdout fixtures | Local evidence folder · SHA `6BAF8079…14A67CD` | Frozen, unmodified |
| `eval/public_notes/aar_v0_8_human_holdout_release/` | Curated PR #13 evidence package (11 files) | Repo · merged via PR #13 | Frozen, unmodified |
| `aar_v0_8_human_holdout_release/h019_final_closure_memo.md` | h019 INVALID_CASE / boundary-regression closure | Repo · part of PR #13 package | Pre-registered, closed |
| `eval/lib/scorerParity.js` (PR #14) | Initial scorer parity repair (bOverEnum, hallucinatedToolIO, checklistExposed) | Repo · merged via PR #14 | Active |
| `eval/lib/scorerParity.js` (PR #15) | primitiveMatch parity repair (5 expressivity gaps) | Repo · commit 36e0291 | Active |
| `eval/public_notes/aar_v0_8_canonical_scorer_replay.md` | Canonical scorer replay memo (195/195) | Repo · commit 4288145 | Current |

---

## 3. Current Validated Claims

### Allowed
- AAR v0.8 achieved 38/39 in the exclusion scenario under second-independent human adjudication (h019 excluded as INVALID_CASE per pre-registered boundary regression).
- All four pre-registered gates cleared: B-OverEnum=0, hallucinated_tool_io=0, PrimitiveMatch≥85% (human-adjudicated), checklist_exposed≤1.
- The repaired deterministic scorer (`eval/lib/scorerParity.js`, commit `36e0291`) reaches 195/195 (100%) field-level parity against second-independent human adjudication across 39 scored cases.
- h019 is consistently treated as INVALID_CASE across all evidence artifacts.
- The scorer is a validated instrument ready for use in future automated scoring workflows, subject to normal benchmark hygiene.

### Disallowed
The following claims are **not supported** by this evidence trail and must not be made:
- "AAR v0.8 passed a new automated benchmark."
- "v0.8 is production-proven."
- "v0.8 generalizes globally."
- "v0.9 is warranted" (based solely on this packaging work).
- Any claim implying a new model/API run was performed in the scorer parity workstream.

---

## 4. Boundary Conditions

- **No new model/API evaluation was run.** All responses in the holdout set were collected prior to this workstream; no new model calls were made during scorer repair or canonical replay.
- **v0.8 was not modified.** Frozen skill ZIP SHA is unchanged from the evidence index (`55233ad6…`).
- **v0.9 was not created.** The scorer parity repair and validation index do not constitute grounds for a new skill version.
- **Evidence, raw, frozen, and quarantined artifacts were not modified.** All SHAs verified at the start of the canonical replay pass.
- **The canonical replay validates scorer parity only.** It confirms the scorer agrees with human labels on the existing frozen set; it does not constitute a new behavioral pass.

---

## 5. Reviewer Checklist

A reviewer confirming this evidence package should verify:

- [ ] All claims are tied to artifacts listed in Section 2.
- [ ] Scorer parity (Section 3, bullets 3–4) is clearly separated from behavioral benchmark performance (Section 3, bullets 1–2).
- [ ] h019 is treated as INVALID_CASE consistently across all referenced artifacts.
- [ ] None of the disallowed claims (Section 3) appear in any release-facing communication.
- [ ] No raw, frozen, or quarantined artifacts were modified (verify SHAs against evidence index).
- [ ] The canonical replay memo (`aar_v0_8_canonical_scorer_replay.md`) contains the required verbatim caveats.

---

## 6. Recommended Next Steps

In order:
1. Merge this validation index (docs/aar-v08-validation-index → master).
2. Separately evaluate whether to run a future automated behavioral benchmark using the repaired scorer. That decision requires a new model/API eval run and is outside the scope of this packaging memo.
3. Do not patch v0.8 or create v0.9 based solely on this validation index.

Any future automated benchmark run against AAR v0.8 should reference the scorer at commit `36e0291` (or later, if further repaired) and treat h019 as INVALID_CASE per the pre-registered closure.

---

*This document is a packaging and traceability index. It does not substitute for the underlying evidence artifacts listed in Section 2.*
