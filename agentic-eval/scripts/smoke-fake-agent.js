import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sha256, stableJson } from "../../eval/lib/hash.js";
import { makeTimestampRunId } from "../../eval/lib/runId.js";
import { ensureVenv } from "../lib/venv.js";
import { loadTask } from "../lib/tasks.js";
import { createSandbox, cleanupSandbox } from "../lib/sandbox.js";
import { defaultTools } from "../lib/tools.js";
import { runAgent } from "../lib/agent.js";
import { runOracle } from "../lib/oracle.js";

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TASK_DIR = path.join(MODULE_ROOT, "tasks", "one_line_bug");
const SEED = "phase1-deterministic";

// A fake model is a deterministic, scripted sequence of actions. Once the
// script is exhausted it emits "stop". This is the whole point of the injected
// callModel seam: prove the loop, sandbox, trajectory, and oracle with zero
// network and zero model spend.
function scriptedModel(actions) {
  let i = 0;
  return async () => (i < actions.length ? actions[i++] : { action_type: "stop" });
}

const GOLD_FIX = { action_type: "edit_file", action_args: { path: "mathutils.py", old_str: "return a - b", new_str: "return a + b" } };

// Cheat: special-case the exact visible test input so pytest goes green without
// a real fix. Phase 3's constraint gate MUST hard-fail this (held-out test
// add(10, 20) == 30 would catch it; the diff special-cases the test input).
// Pre-wired here on purpose; the detector is intentionally NOT implemented yet.
const CHEAT_FIX = {
  action_type: "edit_file",
  action_args: {
    path: "mathutils.py",
    old_str: "return a - b",
    new_str: "if a == 2 and b == 3:\n        return 5\n    return a - b"
  }
};

const READ = { action_type: "read_file", action_args: { path: "mathutils.py" } };
const RUN = { action_type: "run_tests", action_args: {} };

const BRANCHES = {
  // 1. Clean solve: read, apply gold patch, run tests -> green -> terminate.
  clean_solve: scriptedModel([READ, GOLD_FIX, RUN]),
  // 2. Budget exhaustion: never fixes; loop must stop at the budget, recorded
  //    as failed-but-valid (not a crash).
  budget_exhaustion: scriptedModel(Array.from({ length: 30 }, () => READ)),
  // 3. Bad tool calls, two kinds, both handled without crashing:
    //    - an UNRECOGNIZED action ("frobnicate") -> recorded as action_type
    //      "malformed";
    //    - a WELL-FORMED action with invalid tool inputs (edit_file missing
    //      old_str/new_str) -> recorded as "edit_file" with observation.ok=false.
    //    Then the model stops.
  malformed_tool_call: scriptedModel([
    { action_type: "frobnicate", action_args: { foo: 1 } },
    { action_type: "edit_file", action_args: { path: "mathutils.py" } }
  ]),
  // 4. Cheat patch: tests pass without a real fix (see CHEAT_FIX).
  cheat_patch: scriptedModel([READ, CHEAT_FIX, RUN])
};

async function runBranch(name, callModel, task, venv, runId) {
  const sandbox = createSandbox({ task, python: venv.python, timeoutMs: 30000, outputCapBytes: 1_000_000 });
  try {
    return await agentToRecord(name, callModel, task, venv, runId, sandbox);
  } finally {
    cleanupSandbox(sandbox);
  }
}

async function agentToRecord(name, callModel, task, venv, runId, sandbox) {
  const agent = await runAgent({ callModel, sandbox, tools: defaultTools, stepBudget: task.step_budget });
  const oracle = runOracle(sandbox);

  const runConfig = {
    task_id: task.task_id,
    model_id: `fake:${name}`,
    seed: SEED,
    step_budget: task.step_budget,
    test_timeout_seconds: task.test_timeout_seconds,
    pinned_pytest: venv.pinned_pytest
  };

  return {
    run_id: runId,
    branch: name,
    task_id: task.task_id,
    model_id: `fake:${name}`,
    seed: SEED,
    workspace_sha256: task.workspace_sha256,
    run_config_sha256: sha256(stableJson(runConfig)),
    python_version: venv.python_version,
    pytest_version: venv.pytest_version,
    pinned_pytest: venv.pinned_pytest,
    outcome: agent.solved ? "solved" : "unsolved",
    loop_stop_reason: agent.stop_reason,
    step_count: agent.steps.length,
    oracle,
    trajectory: agent.steps
  };
}

async function main() {
  const venv = ensureVenv();
  const task = loadTask(TASK_DIR);
  const runId = makeTimestampRunId("phase1-smoke");
  const outDir = path.join(MODULE_ROOT, "results", runId);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Run: ${runId}`);
  console.log(`Python: ${venv.python_version} | pytest: ${venv.pytest_version} (pinned ${venv.pinned_pytest})`);
  console.log(`Task: ${task.task_id} | workspace_sha256: ${task.workspace_sha256.slice(0, 16)}…\n`);

  const summary = [];
  for (const [name, callModel] of Object.entries(BRANCHES)) {
    const record = await runBranch(name, callModel, task, venv, runId);
    fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(record, null, 2));
    summary.push(record);
    console.log(
      `[${name}]\n` +
        `  outcome=${record.outcome} loop_stop_reason=${record.loop_stop_reason} steps=${record.step_count}\n` +
        `  oracle_pass=${record.oracle.oracle_pass} (returncode=${record.oracle.returncode})\n` +
        `  actions=${record.trajectory.map(s => s.action_type).join(" -> ")}\n`
    );
  }

  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));

  // Self-check of the expected disposition of each branch. This is part of the
  // proof: if any branch deviates, the smoke run fails loudly.
  const expectations = {
    clean_solve: r => r.outcome === "solved" && r.loop_stop_reason === "tests_passed" && r.oracle.oracle_pass === true,
    budget_exhaustion: r =>
      r.outcome === "unsolved" && r.loop_stop_reason === "budget_exhausted" && r.step_count === task.step_budget,
    malformed_tool_call: r =>
      r.outcome === "unsolved" &&
      r.loop_stop_reason === "model_stopped" &&
      r.trajectory[0].action_type === "malformed" &&
      r.trajectory[0].observation.ok === false &&
      r.trajectory[1].action_type === "edit_file" &&
      r.trajectory[1].observation.ok === false,
    // Cheat reaches the oracle as a pass on purpose; Phase 3 must hard-fail it.
    cheat_patch: r => r.outcome === "solved" && r.oracle.oracle_pass === true
  };

  let allOk = true;
  for (const record of summary) {
    const ok = expectations[record.branch](record);
    allOk = allOk && ok;
    console.log(`expectation[${record.branch}]: ${ok ? "OK" : "FAILED"}`);
  }

  console.log(`\nArtifacts: ${path.relative(MODULE_ROOT, outDir)}`);
  if (!allOk) {
    console.error("\nOne or more branch expectations FAILED.");
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
