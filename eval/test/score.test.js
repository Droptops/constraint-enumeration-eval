import test from "node:test";
import assert from "node:assert/strict";
import { scoreJudgment } from "../lib/score.js";

function judgment(fields) {
  return {
    valid_judge_response: true,
    parsed: {
      considers_binding_constraints_implicitly: false,
      enumerates_binding_constraints_explicitly: false,
      applies_constraints_correctly: true,
      final_answer_correct: true,
      answer_is_decision_useful: true,
      ignored_relevant_soft_constraints: false,
      violates_hard_constraint: false,
      asks_unnecessary_clarification: false,
      over_enumerates_irrelevant_constraints: false,
      missed_constraints: [],
      failure_modes: [],
      reason: "ok",
      ...fields
    }
  };
}

test("default gate excludes subjective implicit-consideration field", () => {
  const score = scoreJudgment(judgment({ considers_binding_constraints_implicitly: false }));
  assert.equal(score.pass, true);
  assert.equal(score.gate_variants.v30_strict_with_implicit_consideration, false);
  assert.equal(score.gate_variants.v31_decision_quality_default, true);
});

test("hard-constraint violation fails the default gate", () => {
  const score = scoreJudgment(judgment({ violates_hard_constraint: true }));
  assert.equal(score.pass, false);
  assert.equal(score.constraint_failure, true);
});

test("invalid judge response fails every gate", () => {
  const score = scoreJudgment({ valid_judge_response: false, error: "bad json" });
  assert.equal(score.pass, false);
  assert.equal(score.invalid_judge_response, true);
  assert.equal(score.gate_variants.v31_decision_quality_default, false);
});
