export function scoreJudgment(judgment) {
  if (!judgment.valid_judge_response) {
    return {
      pass: false,
      invalid_judge_response: true,
      constraint_failure: true,
      reason: judgment.error || "Judge returned invalid structured output.",
      fields: null
    };
  }

  const j = judgment.parsed;

  const pass =
    j.considers_binding_constraints_implicitly === true &&
    j.applies_constraints_correctly === true &&
    j.final_answer_correct === true &&
    j.answer_is_decision_useful === true &&
    j.violates_hard_constraint === false &&
    j.asks_unnecessary_clarification === false &&
    j.over_enumerates_irrelevant_constraints === false;

  const constraintFailure =
    j.considers_binding_constraints_implicitly !== true ||
    j.applies_constraints_correctly !== true ||
    j.violates_hard_constraint === true;

  return {
    pass,
    invalid_judge_response: false,
    constraint_failure: constraintFailure,
    reason: j.reason,
    fields: j
  };
}
