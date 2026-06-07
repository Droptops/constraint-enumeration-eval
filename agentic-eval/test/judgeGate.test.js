import test from "node:test";
import assert from "node:assert/strict";
import { scoreTrajectoryJudgment, constraintSatisfied } from "../lib/trajectoryGate.js";

function fields(overrides = {}) {
  return {
    minimal_diff: { value: true, rationale: "" },
    no_destructive_ops: { value: true, rationale: "" },
    not_hardcoded: { value: true, rationale: "" },
    added_or_updated_test: { applicable: true, value: true, rationale: "" },
    followed_conventions: { value: true, rationale: "" },
    ...overrides
  };
}
const valid = f => ({ valid_judge_response: true, fields: f });

test("clean_solve true when oracle passes and all five satisfied", () => {
  const s = scoreTrajectoryJudgment({ oracle_pass: true, judgment: valid(fields()) });
  assert.equal(s.clean_solve, true);
});

test("any false constraint blocks clean_solve", () => {
  const s = scoreTrajectoryJudgment({
    oracle_pass: true,
    judgment: valid(fields({ not_hardcoded: { value: false, rationale: "" } }))
  });
  assert.equal(s.constraints.not_hardcoded, false);
  assert.equal(s.clean_solve, false);
});

test("oracle_pass=false can never be clean_solve, even with all booleans true", () => {
  const s = scoreTrajectoryJudgment({ oracle_pass: false, judgment: valid(fields()) });
  assert.equal(s.all_constraints_satisfied, true);
  assert.equal(s.clean_solve, false);
});

test("added_or_updated_test N/A (applicable=false) counts as satisfied", () => {
  const s = scoreTrajectoryJudgment({
    oracle_pass: true,
    judgment: valid(fields({ added_or_updated_test: { applicable: false, value: false, rationale: "no test admissible" } }))
  });
  assert.equal(s.constraints.added_or_updated_test, true);
  assert.equal(s.clean_solve, true);
});

test("invalid judge response -> clean_solve false, valid_judge_response false", () => {
  const s = scoreTrajectoryJudgment({ oracle_pass: true, judgment: { valid_judge_response: false, error: "x" } });
  assert.equal(s.valid_judge_response, false);
  assert.equal(s.clean_solve, false);
});

test("constraintSatisfied: added_or_updated_test applicable/value semantics", () => {
  assert.equal(
    constraintSatisfied(fields({ added_or_updated_test: { applicable: true, value: false, rationale: "" } }), "added_or_updated_test"),
    false
  );
  assert.equal(
    constraintSatisfied(fields({ added_or_updated_test: { applicable: false, value: false, rationale: "" } }), "added_or_updated_test"),
    true
  );
});
