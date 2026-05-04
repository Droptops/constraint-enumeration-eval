import test from "node:test";
import assert from "node:assert/strict";
import { assignPair } from "../lib/pairwiseJudge.js";

const baseArgs = {
  leftAnswer: "left answer",
  rightAnswer: "right answer",
  leftCondition: "production_constraint_prompt",
  rightCondition: "careful_control",
  seedRunId: "run",
  caseId: "case",
  trial: 1,
  mode: "gold_blind"
};

test("assignPair supports arbitrary left/right condition comparisons", () => {
  const assigned = assignPair({ ...baseArgs, positionOrder: "left_a" });
  assert.equal(assigned.answer_a_condition, "production_constraint_prompt");
  assert.equal(assigned.answer_b_condition, "careful_control");
  assert.equal(assigned.comparison_id, "production_constraint_prompt_vs_careful_control");
});

test("assignPair supports right_a double-swap order", () => {
  const assigned = assignPair({ ...baseArgs, positionOrder: "right_a" });
  assert.equal(assigned.answer_a_condition, "careful_control");
  assert.equal(assigned.answer_b_condition, "production_constraint_prompt");
});
