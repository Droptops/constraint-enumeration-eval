import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureVenv } from "../lib/venv.js";
import { loadTask } from "../lib/tasks.js";
import { createSandbox, cleanupSandbox } from "../lib/sandbox.js";
import { defaultTools } from "../lib/tools.js";
import { runAgent } from "../lib/agent.js";

const venv = ensureVenv();
const TASK_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "tasks", "one_line_bug");

const GOLD = {
  action_type: "edit_file",
  action_args: { path: "mathutils.py", old_str: "return a - b", new_str: "return a + b" }
};
const READ = { action_type: "read_file", action_args: { path: "mathutils.py" } };
const RUN = { action_type: "run_tests", action_args: {} };

function scripted(actions) {
  let i = 0;
  return async () => (i < actions.length ? actions[i++] : { action_type: "stop" });
}

test("clean solve: applies gold fix, tests pass, loop terminates on green", async () => {
  const task = loadTask(TASK_DIR);
  const sandbox = createSandbox({ task, python: venv.python });
  try {
    const r = await runAgent({ callModel: scripted([READ, GOLD, RUN]), sandbox, tools: defaultTools, stepBudget: task.step_budget });
    assert.equal(r.solved, true);
    assert.equal(r.stop_reason, "tests_passed");
    assert.equal(r.steps.length, 3);
    assert.equal(r.steps[2].observation.passed, true);
  } finally {
    cleanupSandbox(sandbox);
  }
});

test("loop does not run past green: a post-green sabotage action is never requested", async () => {
  const task = loadTask(TASK_DIR);
  const sandbox = createSandbox({ task, python: venv.python });
  const sabotage = {
    action_type: "edit_file",
    action_args: { path: "mathutils.py", old_str: "return a + b", new_str: "return 999" }
  };
  const actions = [READ, GOLD, RUN, sabotage];
  let calls = 0;
  try {
    const r = await runAgent({
      callModel: async () => {
        const a = actions[calls] ?? { action_type: "stop" };
        calls += 1;
        return a;
      },
      sandbox,
      tools: defaultTools,
      stepBudget: task.step_budget
    });
    assert.equal(r.steps.length, 3);
    assert.equal(calls, 3); // the 4th (sabotage) action was never pulled from the model
  } finally {
    cleanupSandbox(sandbox);
  }
});

test("budget exhaustion: never solves, stops at the budget, recorded not crashed", async () => {
  const task = loadTask(TASK_DIR);
  const sandbox = createSandbox({ task, python: venv.python });
  try {
    const r = await runAgent({
      callModel: scripted(Array.from({ length: 50 }, () => READ)),
      sandbox,
      tools: defaultTools,
      stepBudget: 15
    });
    assert.equal(r.solved, false);
    assert.equal(r.stop_reason, "budget_exhausted");
    assert.equal(r.steps.length, 15);
    assert.equal(r.steps[14].stop_reason, "budget_exhausted");
  } finally {
    cleanupSandbox(sandbox);
  }
});

test("malformed actions are recorded without crashing; loop continues then stops", async () => {
  const task = loadTask(TASK_DIR);
  const sandbox = createSandbox({ task, python: venv.python });
  try {
    const r = await runAgent({
      callModel: scripted([{ action_type: "frobnicate", action_args: {} }, null, "not even an object"]),
      sandbox,
      tools: defaultTools,
      stepBudget: 15
    });
    assert.equal(r.steps[0].action_type, "malformed");
    assert.equal(r.steps[1].action_type, "malformed");
    assert.equal(r.steps[2].action_type, "malformed");
    assert.equal(r.steps[3].action_type, "model_stop");
    assert.equal(r.stop_reason, "model_stopped");
  } finally {
    cleanupSandbox(sandbox);
  }
});
