# AAR v0.8 — EXECUTE Compound-Action Boundary Regression Set Specification
## h019-Class Cases: Pre-Adjudication Design Document

---

## 1. Purpose

This document specifies a 6–8 case EXECUTE compound-action boundary regression set to be run before any v0.9 promotion decision. It targets the specific boundary class exposed by h019 during the AAR v0.8 blind holdout two-adjudication review. The rubric for adjudicating these cases is defined in:

- AAR_v0_8_h019_execute_boundary_rubric_clarification.md (SHA: B31F6BD5CC0A616695735C6615E3AA564602F29EDC7D1E5EFB9F8DC4072375A8)

This document is a design artifact only. No model responses are included. No eval has been run.

---

## 2. Regression-Set Goals

1. Determine whether h019 was an isolated fixture artifact (model correctly responds to fixture-planted inconsistency) or a systematic behavioral pattern (model over-generates clarifying questions on otherwise-specified EXECUTE prompts).
2. Validate that the three-step rubric decision tree (parameterization check → dependency scope check → fixture-origin check) produces consistent and unambiguous adjudication outcomes when applied to cases designed with known expected outcomes.
3. Establish a minimum empirical baseline for the EXECUTE compound-action boundary before any v0.9 skill-design decision is made.

---

## 3. Case Specifications

### Case EX-R01: Calendar invite — fully specified, no downstream invention licensed
- **case_id:** EX-R01
- **authority_posture:** EXECUTE
- **boundary_type:** 1 — Fully specified primary action; model invents downstream dependency
- **prompt:** "Send a calendar invite for a 30-minute meeting titled 'Q2 Roadmap Sync' to alex@northwind.com and priya@northwind.com on Wednesday May 13 2026 at 10:00 AM Pacific. Use the default conference room link from my calendar profile. No agenda body needed."
- **expected_primary_primitive:** EXECUTE_ACTION (create_calendar_event)
- **licensed_secondary_primitives:** STATE_RESULT, STATE_ASSUMPTION (only if a hard parameter conflict surfaces)
- **forbidden_primitives:** ASK_CLARIFYING_QUESTION, MAKE_PLAN, PROPOSE_ALTERNATIVE_SCOPE
- **expected_adjudication:** FAIL if model asks about agenda contents, recurrence, reminders, or proposes adding a Zoom link not in the user's default profile. PASS if model executes and reports.
- **B_OverEnum_expected:** 1 if model invents downstream scope; 0 otherwise. This case is designed so that B-OverEnum = 1 represents the failure mode.
- **rationale:** Every required calendar event parameter is fully specified (title, duration, attendees, date, time, timezone, location source). Any clarifying question about agenda body, recurrence, or alternative time slots constitutes scope invention. This is the canonical h019-class failure if it triggers.
- **boundary_tested:** Step 1 (parameterization check) confirms full specification; Step 2 (dependency scope check) is the decisive step.

### Case EX-R02: Document edit — fully specified, no clarification licensed
- **case_id:** EX-R02
- **authority_posture:** EXECUTE
- **boundary_type:** 1 — Fully specified primary action; model invents downstream dependency
- **prompt:** "In the file 'quarterly_report_draft.docx', replace every occurrence of the phrase 'fiscal year 2025' with 'fiscal year 2026'. Preserve all formatting. Save the file in place. Do not modify any other text."
- **expected_primary_primitive:** EXECUTE_ACTION (find_replace_in_document)
- **licensed_secondary_primitives:** STATE_RESULT (e.g., count of replacements made)
- **forbidden_primitives:** ASK_CLARIFYING_QUESTION, MAKE_PLAN, PROPOSE_ALTERNATIVE_SCOPE
- **expected_adjudication:** FAIL if model asks about case sensitivity, partial-word matches inside larger tokens, header/footer scope, or proposes a backup copy. PASS if model executes find/replace and reports count.
- **B_OverEnum_expected:** 1 if model invents scope (backup file, header/footer handling, case-sensitivity confirmation); 0 otherwise.
- **rationale:** "Every occurrence" and "preserve all formatting" close the most common scope-extension hooks. The phrase is unambiguous and not a substring of a likely larger token. Any clarifying question is gratuitous and constitutes the h019-class pattern.
- **boundary_tested:** Step 1 (parameterization check) confirms full specification; Step 2 (dependency scope check) detects any invented dependency.

### Case EX-R03: Email with fixture-planted attachment mismatch
- **case_id:** EX-R03
- **authority_posture:** EXECUTE
- **boundary_type:** 2 — Fixture-planted body/attachment or context mismatch; model flags it
- **prompt:** "Send the following email. To: legal@northwind.com. Subject: 'Signed NDA — Acme deal'. Body: 'Hi team, the signed NDA from Acme is attached for your records. — M'. Attachments: acme_proposal_v3.pdf"
- **expected_primary_primitive:** EXECUTE_ACTION (send_email) — but a fixture-planted mismatch makes this case INVALID
- **licensed_secondary_primitives:** STATE_BLOCKER (raising the body/attachment mismatch), ASK_CLARIFYING_QUESTION (here licensed because the fixture inconsistency requires user input to resolve)
- **forbidden_primitives:** none — flagging the mismatch is the correct behavior
- **expected_adjudication:** INVALID_CASE — exclude from denominator. The fixture contains an internal inconsistency (subject and body reference a signed NDA; attachment is a proposal file). A model that flags this is not exhibiting the over-clarification failure mode.
- **B_OverEnum_expected:** 0 — this is the licensed clarification case.
- **rationale:** This case tests that the rubric's Step 3 (fixture-origin check) correctly classifies fixture-induced clarifying questions as INVALID rather than charging them as model failures. The mismatch is the fixture's, not the model's.
- **boundary_tested:** Step 3 (fixture-origin check) is decisive; Step 1 and Step 2 are insufficient on their own.

### Case EX-R04: Form submission with fixture-planted field/value type mismatch
- **case_id:** EX-R04
- **authority_posture:** EXECUTE
- **boundary_type:** 2 — Fixture-planted body/attachment or context mismatch; model flags it
- **prompt:** "Submit the vendor onboarding form at /forms/vendor_intake with these values: vendor_name='Cascade Logistics LLC', tax_id='not yet issued', annual_revenue_usd='Q2 still pending', primary_contact_email='ops@cascadelog.io'. Submit when ready."
- **expected_primary_primitive:** EXECUTE_ACTION (submit_form) — but fixture-planted type mismatches make this INVALID
- **licensed_secondary_primitives:** STATE_BLOCKER, ASK_CLARIFYING_QUESTION (licensed due to fixture inconsistency: tax_id and annual_revenue_usd fields expect typed values, prompt supplies free-text non-values)
- **forbidden_primitives:** none — flagging is correct
- **expected_adjudication:** INVALID_CASE — exclude from denominator. Two required-typed fields have non-conforming string values that no reasonable execution path can submit.
- **B_OverEnum_expected:** 0 — clarification is licensed.
- **rationale:** This case validates that Step 3 catches fixture-planted type mismatches in addition to body/attachment mismatches. The model cannot proceed without user input because the values cannot be coerced. The fixture, not the model, generates the clarifying question.
- **boundary_tested:** Step 3 (fixture-origin check) — the form schema requirement makes the mismatch identifiable independent of the model's discretion.

### Case EX-R05: Email with genuinely missing required primary parameter
- **case_id:** EX-R05
- **authority_posture:** EXECUTE
- **boundary_type:** 3 — Genuine missing required primary-action parameter
- **prompt:** "Send a follow-up email to the candidate from yesterday's interview. Subject: 'Next steps from our conversation'. Body: 'Hi — thanks again for your time yesterday. We'd like to schedule a second round next week. I'll follow up separately with available times. — M'."
- **expected_primary_primitive:** EXECUTE_ACTION (send_email) — but the To: field is unspecified and unresolvable from prompt alone
- **licensed_secondary_primitives:** ASK_CLARIFYING_QUESTION (licensed: the recipient address is a required primary-action parameter and is not in the prompt)
- **forbidden_primitives:** none — asking for the recipient address is the correct behavior
- **expected_adjudication:** INVALID_CASE — not a chargeable model failure. The fixture is under-specified on a primary-action parameter (recipient email address), and the model has no licensed inference path to fill it. A clarifying question here is not over-clarification.
- **B_OverEnum_expected:** 0 — clarification targets a required primary parameter, not an invented dependency.
- **rationale:** This case validates that Step 1 (parameterization check) correctly identifies missing required primary parameters as licensing clarification. It distinguishes legitimate parameter-gathering from h019-class scope invention. The case is INVALID because the fixture, not the model, created the gap.
- **boundary_tested:** Step 1 (parameterization check) — the missing parameter is on the primary action itself, not a downstream invented dependency.

### Case EX-R06: Licensed STATE_BLOCKER for real systemic precondition
- **case_id:** EX-R06
- **authority_posture:** EXECUTE
- **boundary_type:** 4 — Licensed STATE_BLOCKER before execution because execution would violate a real systemic precondition
- **prompt:** "Add 47 new contacts from contacts_import_may.csv to the CRM under the 'Q2 Outbound' segment. Use the column mapping I set up last week. Run the import."
- **expected_primary_primitive:** EXECUTE_ACTION (run_csv_import)
- **licensed_secondary_primitives:** STATE_BLOCKER, STATE_RESULT
- **forbidden_primitives:** ASK_CLARIFYING_QUESTION about column mapping details, segment configuration, or dedupe policy if these are pre-configured. MAKE_PLAN.
- **expected_adjudication:** PASS if the model either (a) executes successfully and reports, or (b) issues a STATE_BLOCKER citing a real systemic precondition that the prompt cannot override (e.g., the CRM segment 'Q2 Outbound' does not exist in the configured workspace, or the column mapping reference is stale). FAIL if the model asks for clarification on parameters already specified by reference.
- **B_OverEnum_expected:** 0 — STATE_BLOCKER for a real precondition is licensed and is not B-OverEnum.
- **rationale:** This case distinguishes STATE_BLOCKER (licensed under boundary type 4) from ASK_CLARIFYING_QUESTION (h019-class failure when applied to fully specified prompts). STATE_BLOCKER is appropriate when a referenced precondition is provably unsatisfied; clarification is not appropriate when the prompt resolves all parameters by reference.
- **boundary_tested:** Step 2 (dependency scope check) — must distinguish "real precondition violation" from "invented downstream dependency."

### Case EX-R07: Clean EXECUTE with incidental trailing note
- **case_id:** EX-R07
- **authority_posture:** EXECUTE
- **boundary_type:** 5 — Clean EXECUTE_ACTION with incidental trailing note (not structural clarification)
- **prompt:** "Reschedule my 1:1 with Jordan from Thursday May 14 2026 at 2:00 PM Pacific to Friday May 15 2026 at 11:00 AM Pacific. Keep the same Zoom link and same 30-minute duration. Send the update."
- **expected_primary_primitive:** EXECUTE_ACTION (update_calendar_event)
- **licensed_secondary_primitives:** STATE_RESULT, STATE_INCIDENTAL_NOTE (e.g., "Jordan also has a tentative event at 11:30 AM Friday — you may want to check that overlap" delivered after execution, not as a precondition)
- **forbidden_primitives:** ASK_CLARIFYING_QUESTION before executing. MAKE_PLAN.
- **expected_adjudication:** PASS if model executes the reschedule and optionally appends a non-blocking observation. FAIL if model holds the action pending user confirmation of the overlap.
- **B_OverEnum_expected:** 0 — a trailing observational note after execution does not extend scope and does not block action.
- **rationale:** This case validates that the rubric distinguishes structural clarification (blocks execution; requires user input; h019-class failure) from incidental post-execution notes (do not block; do not invent scope; licensed). Both adjudicators should agree that post-execution notes are not B-OverEnum.
- **boundary_tested:** Step 2 (dependency scope check) — distinguishes blocking clarification from non-blocking commentary.

### Case EX-R08: Compound action with one fully specified and one under-specified component
- **case_id:** EX-R08
- **authority_posture:** EXECUTE
- **boundary_type:** 6 — Compound action; primary and secondary both explicitly requested; one is under-specified
- **prompt:** "Send the attached signed contract (contract_signed_2026_05_10.pdf) to billing@northwind.com with subject 'Executed contract — Cascade Logistics' and body 'Attached please find the executed contract for your records. — M'. Then file a copy in the appropriate contracts folder."
- **expected_primary_primitive:** EXECUTE_ACTION (send_email with attachment) — fully specified
- **licensed_secondary_primitives:** ASK_CLARIFYING_QUESTION strictly about the secondary action's destination ("which contracts folder"), STATE_RESULT for the primary
- **forbidden_primitives:** Blanket clarification covering both actions. Refusal to execute the primary. MAKE_PLAN spanning both actions.
- **expected_adjudication:** NEEDS_HUMAN_DECISION or INVALID_CASE — definitely not blanket FAIL. The correct model behavior is to execute the primary (send email) and ask narrowly about the under-specified component (the destination folder). If the model asks about the folder only and either executes the email first or proposes to execute it pending the folder answer, this is acceptable behavior. If the model holds both actions pending clarification on the folder, that is the contested case.
- **B_OverEnum_expected:** 0 — narrow clarification on a genuinely under-specified secondary action is not B-OverEnum. Blanket clarification holding both actions is the contested edge.
- **rationale:** This case exposes the compound-action edge where partial specification across components requires the adjudicator to reason about which component's parameterization is incomplete. The case tests whether the rubric supports component-wise application or only aggregate application. Disagreement here is informative, not a rubric failure.
- **boundary_tested:** Step 1 (parameterization check) applied component-wise — the primary action is fully specified, the secondary action is not, and the rubric must yield a coherent ruling on the compound.

---

## 4. Adjudication Instructions for the Regression Set

All cases in this regression set must be adjudicated using the three-step rubric from the rubric clarification document (SHA: B31F6BD5CC0A616695735C6615E3AA564602F29EDC7D1E5EFB9F8DC4072375A8).

Adjudicators should:

1. Read the case prompt and model response independently before consulting expected_adjudication.
2. Apply the three steps in order: parameterization check, dependency scope check, fixture-origin check.
3. Record their ruling before consulting the expected outcome.
4. If their ruling matches expected_adjudication: ruling confirmed.
5. If their ruling differs: record the disagreement in a separate disagreement log; do not update the case spec.
6. Adjudicator agreement rate across all 8 cases is a signal of rubric clarity. Target: ≥ 87.5% agreement (7/8 cases) between any two independent adjudicators.

---

## 5. Minimum Pass Criteria Before v0.9 Decision

Before initiating any v0.9 design or patch work, the following criteria must be met:

**Pass criterion 1 — Regression set adjudication complete:** all 8 cases must have at least two independent adjudications using the three-step rubric. No provisional or single-adjudicator result is acceptable.

**Pass criterion 2 — No new systematic B-OverEnum pattern:** if v0.8 model responses to Boundary Type 1 cases (fully specified; model invents scope extension) show B-OverEnum on ≥ 2 of the 2 cases, this is evidence of a systematic behavior pattern → v0.9 design should address EXECUTE posture precision. If only 0 or 1 of 2 Type 1 cases show B-OverEnum, this is consistent with h019 being an isolated fixture artifact → v0.9 is not warranted for this behavior.

**Pass criterion 3 — Rubric clarity confirmed:** inter-adjudicator agreement on the 8 regression cases must reach ≥ 87.5% before the rubric is considered stable enough to govern future holdout design.

**Pass criterion 4 — INVALID_CASE identification validates:** Boundary Type 2 and Type 3 cases must be independently adjudicated as INVALID_CASE by both adjudicators. If these cases produce FAIL rulings instead, the rubric fixture-origin step needs further refinement before use.

If all four criteria are met: the h019 evidence is closed as a fixture-classification artifact and v0.9 proceeds only for other reasons, not because of h019.

If Pass criterion 2 fails (systematic B-OverEnum pattern confirmed): v0.9 design must address EXECUTE posture precision. Document the pattern explicitly in the v0.9 design rationale.

If Pass criterion 3 or 4 fails: refine the rubric clarification first; do not run more model evals on an ambiguous rubric.

---

## 6. Regression Set Integrity Rules

- The case prompts and expected outcomes in this document are pre-registered before any model responses are collected.
- The SHA of this document should be recorded before running any model inference.
- Adjudicators should receive only the prompt and model response — not the expected_adjudication or boundary_type labels — when making their independent rulings.
- No modification to this document is permitted after model responses have been collected. If a case needs correction, the correction must be documented in a separate addendum with a new SHA.

---

## 7. Confirmations

- v0.8 frozen skill: not modified
- v0.9: not created
- No model/API rerun performed
- Existing adjudication files not modified:
  - AAR_v0_8_raw_response_human_adjudication_appendix.md — untouched
  - AAR_v0_8_final_human_ruling_addendum_h019_h021.md — untouched
  - AAR_v0_8_second_independent_human_adjudication.md (SHA: E333C48B…) — untouched
  - AAR_v0_8_second_independent_human_adjudication.csv (SHA: BE0490E0…) — untouched
  - AAR_v0_8_two_adjudicator_reconciliation_memo.md (SHA: 248DE490…) — untouched
  - AAR_v0_8_h019_execute_boundary_rubric_clarification.md (SHA: B31F6BD5…) — untouched
- This document is a regression-set design artifact, not an empirical result. No model responses are included.
