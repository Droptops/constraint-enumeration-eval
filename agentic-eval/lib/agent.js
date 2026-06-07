import { makeStep, validateTrajectory } from "./trajectory.js";

export const DEFAULT_STEP_BUDGET = 15;

const TOOL_ACTIONS = new Set(["read_file", "edit_file", "run_tests"]);

// The agentic spine. `callModel` is injected: it receives { steps, sandbox } and
// returns the next action object { action_type, action_args, tokens? }. This
// keeps the loop fully testable offline with a deterministic fake model; the
// real Anthropic tool-use client is just one implementation of callModel.
//
// Loop rule: iterate until run_tests reports green (solved) or the step budget
// is hit. A malformed action is recorded and the loop continues without
// crashing. An explicit "stop" action ends the loop as model_stopped.
export async function runAgent({ callModel, sandbox, tools, stepBudget = DEFAULT_STEP_BUDGET }) {
  const steps = [];
  let stopReason = null;
  let solved = false;

  for (let stepIdx = 0; stepIdx < stepBudget; stepIdx++) {
    const action = await callModel({ steps, sandbox });
    const norm = normalizeAction(action);
    const tokens = action && typeof action === "object" ? action.tokens ?? null : null;
    const isLastStep = stepIdx === stepBudget - 1;

    if (norm.action_type === "malformed") {
      // Recorded as a step but does not consume the loop's success path. If it
      // happens on the final step, the loop still ends via budget below.
      steps.push(
        makeStep({
          step_idx: stepIdx,
          action_type: "malformed",
          action_args: action ?? null,
          observation: { ok: false, error: norm.error },
          stop_reason: isLastStep ? "budget_exhausted" : null,
          tokens
        })
      );
      if (isLastStep) stopReason = "budget_exhausted";
      continue;
    }

    if (norm.action_type === "model_stop") {
      stopReason = "model_stopped";
      steps.push(
        makeStep({
          step_idx: stepIdx,
          action_type: "model_stop",
          action_args: norm.args,
          observation: { ok: true },
          stop_reason: stopReason,
          tokens
        })
      );
      break;
    }

    let observation;
    if (norm.action_type === "read_file") observation = tools.readFile(sandbox, norm.args);
    else if (norm.action_type === "edit_file") observation = tools.editFile(sandbox, norm.args);
    else observation = tools.runTests(sandbox, norm.args);

    if (norm.action_type === "run_tests" && observation.passed === true) {
      solved = true;
      stopReason = "tests_passed";
    } else if (isLastStep) {
      stopReason = "budget_exhausted";
    }

    steps.push(
      makeStep({
        step_idx: stepIdx,
        action_type: norm.action_type,
        action_args: norm.args,
        observation,
        stop_reason: solved || isLastStep ? stopReason : null,
        tokens
      })
    );

    if (solved) break;
  }

  validateTrajectory(steps);
  return { solved, stop_reason: stopReason ?? "budget_exhausted", steps };
}

function normalizeAction(action) {
  if (
    action === null ||
    typeof action !== "object" ||
    typeof action.action_type !== "string"
  ) {
    return { action_type: "malformed", error: `unrecognized action: ${safeStringify(action)}` };
  }

  if (action.action_type === "stop") {
    return { action_type: "model_stop", args: action.action_args ?? null };
  }

  if (!TOOL_ACTIONS.has(action.action_type)) {
    return { action_type: "malformed", error: `unknown action_type: ${action.action_type}` };
  }

  if (action.action_type === "run_tests") {
    const args = action.action_args && typeof action.action_args === "object" ? action.action_args : {};
    return { action_type: "run_tests", args };
  }

  if (action.action_args === null || typeof action.action_args !== "object") {
    return { action_type: "malformed", error: `action_args must be an object for ${action.action_type}` };
  }

  return { action_type: action.action_type, args: action.action_args };
}

function safeStringify(value) {
  try {
    return JSON.stringify(value)?.slice(0, 200) ?? String(value);
  } catch {
    return String(value);
  }
}
