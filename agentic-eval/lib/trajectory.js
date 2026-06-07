// FROZEN trajectory schema (v1.0).
//
// This is the contract consumed by the Phase 1 oracle, the Phase 3 constraint
// judge, and the Phase 4 introspection pass. It is intentionally frozen now so
// later phases can rely on it. The human-readable spec lives in
// TRAJECTORY_SCHEMA.md; this file is the executable definition.
//
// A trajectory is an ordered array of steps. Each step is exactly:
//   {
//     step_idx:     integer, 0-based, equal to its index in the array
//     action_type:  one of ACTION_TYPES
//     action_args:  object — the tool input (raw model payload for "malformed",
//                   model final payload for "model_stop")
//     observation:  object — the tool result / harness response for this step
//     stop_reason:  null while the loop continues; the terminal reason on the
//                   step that ended the loop ("tests_passed" | "budget_exhausted"
//                   | "model_stopped")
//     tokens:       object|null — model token usage for the turn if available
//   }

export const TRAJECTORY_SCHEMA_VERSION = "1.0";
export const ACTION_TYPES = ["read_file", "edit_file", "run_tests", "malformed", "model_stop"];
export const STEP_FIELDS = ["step_idx", "action_type", "action_args", "observation", "stop_reason", "tokens"];
export const TERMINAL_STOP_REASONS = ["tests_passed", "budget_exhausted", "model_stopped"];

export function makeStep({ step_idx, action_type, action_args, observation, stop_reason = null, tokens = null }) {
  return { step_idx, action_type, action_args, observation, stop_reason, tokens };
}

// Throws on any contract violation. Used after every run so a malformed
// trajectory can never silently flow into later phases.
export function validateTrajectory(steps) {
  if (!Array.isArray(steps)) {
    throw new Error("trajectory must be an array");
  }

  steps.forEach((step, index) => {
    if (step === null || typeof step !== "object") {
      throw new Error(`step ${index} is not an object`);
    }
    for (const field of STEP_FIELDS) {
      if (!(field in step)) {
        throw new Error(`step ${index} is missing required field "${field}"`);
      }
    }
    if (step.step_idx !== index) {
      throw new Error(`step ${index} has step_idx ${step.step_idx} (out of order)`);
    }
    if (!ACTION_TYPES.includes(step.action_type)) {
      throw new Error(`step ${index} has invalid action_type "${step.action_type}"`);
    }
    if (step.stop_reason !== null && !TERMINAL_STOP_REASONS.includes(step.stop_reason)) {
      throw new Error(`step ${index} has invalid stop_reason "${step.stop_reason}"`);
    }
  });

  return true;
}
