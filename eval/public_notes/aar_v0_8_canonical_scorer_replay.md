# AAR v0.8 — Canonical Scorer Replay (Master Scorer @ 36e0291)

## Purpose

This memo records a canonical scorer replay of the frozen AAR v0.8
40-case blind holdout, using the repaired deterministic scorer merged
to `master` via PR #14 (initial parity repair) and PR #15
(primitiveMatch expressivity-gap repair). It is **scorer replay /
parity validation only**: no model was rerun, no API calls were made,
no fixtures or responses were modified. **This does NOT constitute a
new automated benchmark pass for AAR v0.8.**

## Inputs

All inputs are read-only and were not modified by this replay.

| Input | Path | SHA-256 |
|---|---|---|
| Raw model responses (40 cases) | `<local_windows_evidence_folder>\holdout_responses_claude_sonnet_4_6_windows_native.json` | `49BB45F47B3AB0024C6B6937A5AD72E020F8FBCF916E7D6261C465E0DFF59659` |
| Human labels (second independent adjudication) | `<local_windows_evidence_folder>\AAR_v0_8_second_independent_human_adjudication.csv` | `BE0490E0D4A08DC02B8DB348C43CE4F29AF3599B378CD162A86B07F9976AE9F6` |
| Frozen holdout fixtures (40 cases) | `<local_windows_holdout_cases_folder>\holdout_cases_v1.jsonl` | `6BAF8079BFF1EF9880094C997CB8C794802AA46833912A7FC65D3958714A67CD` |
| Frozen v0.8 skill bundle (integrity check only — not loaded) | `<local_windows_v0_8_frozen_folder>\agent-authority-router-skill_v0_8.zip` | `55233AD67853748F0AD62D228D166F496C03E3955CAC313BE064D554CBFE1B0C` |
| Scorer | `eval/lib/scorerParity.js` at commit `36e0291` | file SHA-256: `015D80958AFF3060ECBA4D1CE30AE8F277756509FEEA57E7B56FC5787CF55FE1` |

All five SHAs match the values recorded in
`eval/public_notes/aar_v0_8_human_holdout_release/AAR_v0_8_final_evidence_index.md`
where applicable. The frozen v0.8 ZIP SHA matches the value in the
evidence index, confirming v0.8 is untouched.

## Run details

- **Driver script**: `<local_windows_evidence_folder>\run_scorer_parity.js`
  (read-only local driver; not part of the repo).
- **Scorer loaded via**: dynamic ESM `import()` of
  `eval/lib/scorerParity.js`
  (master working tree at commit `36e0291`).
- **Date run**: 2026-05-11.
- **h019 treatment**: hard-coded as `INVALID_CASE` per
  `AAR_v0_8_h019_final_closure_memo.md` (fixture-planted body/attachment
  mismatch). h019 is recorded in the output CSV with
  `s_ruling = INVALID_CASE` and **excluded from agreement counts**.
- **Fixture-flag derivation**: only auto-derivable flags
  (`toolsLicensed`, `expectsNoToolCalls`) are passed to `scoreResponse`,
  derived from `fixture.available_tools.length`. No judgmental flags are
  injected.

## Results

Scored denominator = 39 cases (h019 excluded).

| Field | Agreements | Total Scored | Rate |
|---|---|---|---|
| `primitiveMatch`         | 39 | 39 | 100.0% |
| `bOverEnum`              | 39 | 39 | 100.0% |
| `hallucinatedToolIO`     | 39 | 39 | 100.0% |
| `checklistExposed`       | 39 | 39 | 100.0% |
| `ruling` (derived)       | 39 | 39 | 100.0% |
| **Overall**              | **195** | **195** | **100.00%** |

Output artifact (local, not in the repo):
`<local_windows_evidence_folder>\AAR_v0_8_scorer_parity_vs_human_labels.csv`
SHA-256: `3E8F50D12024E269A3969B15DB39BD79AD615B19273EF83557ECA9A66CD735AB`.

## Mismatches

No mismatches. All 195 field comparisons agree.

## Supported claim

The repaired AAR v0.8 deterministic scorer (eval/lib/scorerParity.js, commit 36e0291) achieves 100.00% field-level parity (195/195) with second-independent human adjudication across 39 scored holdout cases. h019 was excluded as INVALID_CASE per pre-registered boundary regression. This validates scorer parity only; it does not constitute an automated benchmark pass for AAR v0.8.

## Constraints confirmed

- v0.8 was not modified (skill ZIP SHA unchanged: `55233ad6…b0c`)
- v0.9 was not created
- No model/API evaluations were run
- Curated evidence, raw responses, frozen artifacts, and quarantined artifacts were untouched
- This is scorer replay/parity validation, not a new model evaluation or benchmark run

## Scope of this claim

- The 100% agreement above is measured against **one** human-adjudication
  pass on **one** 40-case holdout set. It does not generalize to unseen
  prompts, other model versions, or other task domains.
- The non-h019 open observations (EX-R02, EX-R06) from the pre-registered
  regression remain documented in
  `eval/public_notes/aar_v0_8_human_holdout_release/AAR_v0_8_h019_final_closure_memo.md`
  for separate future triage. They are not addressed by this replay.
- Any automated-benchmark claim broader than this scope requires its own
  preregistered evaluation.
