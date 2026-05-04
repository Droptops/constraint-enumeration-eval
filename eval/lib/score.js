export const GATE_VARIANTS = {
  v30_strict_with_implicit_consideration: [
    "considers_binding_constraints_implicitly",
    "applies_constraints_correctly",
    "final_answer_correct",
    "answer_is_decision_useful",
    "not_violates_hard_constraint",
    "not_asks_unnecessary_clarification",
    "not_over_enumerates_irrelevant_constraints"
  ],
  v31_decision_quality_default: [
    "applies_constraints_correctly",
    "final_answer_correct",
    "answer_is_decision_useful",
    "not_violates_hard_constraint",
    "not_asks_unnecessary_clarification",
    "not_over_enumerates_irrelevant_constraints"
  ],
  final_answer_only: ["final_answer_correct"],
  constraint_application_and_final: ["applies_constraints_correctly", "final_answer_correct"],
  no_decision_usefulness: [
    "applies_constraints_correctly",
    "final_answer_correct",
    "not_violates_hard_constraint",
    "not_asks_unnecessary_clarification",
    "not_over_enumerates_irrelevant_constraints"
  ],
  no_over_enumeration_gate: [
    "applies_constraints_correctly",
    "final_answer_correct",
    "answer_is_decision_useful",
    "not_violates_hard_constraint",
    "not_asks_unnecessary_clarification"
  ]
};

export const DEFAULT_GATE_VARIANT = "v31_decision_quality_default";

export function scoreJudgment(judgment) {
  if (!judgment.valid_judge_response) {
    return {
      pass: false,
      gate_variant: DEFAULT_GATE_VARIANT,
      gate_variants: Object.fromEntries(Object.keys(GATE_VARIANTS).map(name => [name, false])),
      invalid_judge_response: true,
      constraint_failure: true,
      reason: judgment.error || "Judge returned invalid structured output.",
      fields: null
    };
  }

  const j = judgment.parsed;
  const gateVariants = Object.fromEntries(
    Object.entries(GATE_VARIANTS).map(([name, gates]) => [name, gates.every(gate => gatePasses(j, gate))])
  );

  const pass = gateVariants[DEFAULT_GATE_VARIANT];

  const constraintFailure =
    j.applies_constraints_correctly !== true ||
    j.violates_hard_constraint === true;

  return {
    pass,
    gate_variant: DEFAULT_GATE_VARIANT,
    gate_variants: gateVariants,
    invalid_judge_response: false,
    constraint_failure: constraintFailure,
    reason: j.reason,
    fields: j
  };
}

function gatePasses(judgmentFields, gate) {
  if (gate.startsWith("not_")) {
    return judgmentFields[gate.slice(4)] === false;
  }

  return judgmentFields[gate] === true;
}
