# v6.3 Run Notes

## Rationale

The v6.1 GPT-5.1 preview found that production_constraint_prompt did not reduce hard constraint violations. HCV autopsy showed Type B failures were the plurality: the model often identified a hard constraint but recommended past it. v6.3 tests a blocker-first policy intended to reduce Type B failures without increasing Type A discovery failures or over-enumeration.

## Prompt candidate

SKILL_PRODUCTION.md — sha256: fb1bb527a4a07ce9f2dc9878271671d1948d4994e1ff830db3e75121ed840250

## Conditions

- baseline
- careful_control
- constraint_axis_prompting
- production_constraint_prompt_v6.1
- production_blocker_first_v6.3_candidate

## Primary metric

HCV rate (valid judge responses only)

## Promotion rule

Promote v6.3 only if blocker-first beats baseline, careful_control, and v6.1 production on HCV rate, without increasing Type A discovery failures or over-enumeration.

## Case set notes

5 cases (4 × ambiguity_2_user_intent, 1 × business_1_pricing_decision) had rubrics rewritten before this run. Rubrics were tightened — no cases removed. See eval/results/e_case_review.md for resolution details.
