import test from "node:test";
import assert from "node:assert/strict";
import { makeStep, validateTrajectory } from "../lib/trajectory.js";

test("validateTrajectory accepts a well-formed ordered trajectory", () => {
  const steps = [
    makeStep({ step_idx: 0, action_type: "read_file", action_args: { path: "a" }, observation: { ok: true } }),
    makeStep({
      step_idx: 1,
      action_type: "run_tests",
      action_args: {},
      observation: { passed: true },
      stop_reason: "tests_passed"
    })
  ];
  assert.equal(validateTrajectory(steps), true);
});

test("validateTrajectory rejects out-of-order step_idx", () => {
  const steps = [makeStep({ step_idx: 5, action_type: "read_file", action_args: {}, observation: {} })];
  assert.throws(() => validateTrajectory(steps), /out of order/);
});

test("validateTrajectory rejects a step missing a contract field", () => {
  // Missing stop_reason and tokens — a hand-built step that skipped makeStep.
  const bad = { step_idx: 0, action_type: "read_file", action_args: {}, observation: {} };
  assert.throws(() => validateTrajectory([bad]), /missing required field/);
});

test("validateTrajectory rejects an unknown action_type", () => {
  const steps = [makeStep({ step_idx: 0, action_type: "teleport", action_args: {}, observation: {} })];
  assert.throws(() => validateTrajectory(steps), /invalid action_type/);
});

test("validateTrajectory rejects an invalid stop_reason", () => {
  const steps = [
    makeStep({ step_idx: 0, action_type: "run_tests", action_args: {}, observation: {}, stop_reason: "vibes" })
  ];
  assert.throws(() => validateTrajectory(steps), /invalid stop_reason/);
});
