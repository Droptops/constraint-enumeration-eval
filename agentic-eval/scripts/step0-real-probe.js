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
import { validateTrajectory } from "../lib/trajectory.js";
import { createAnthropicAgentModel, getAgentModelId } from "../lib/anthropicAgent.js";
import { loadEnvFiles } from "../lib/env.js";

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TASK_DIR = path.join(MODULE_ROOT, "tasks", "one_line_bug");

// Load ANTHROPIC_API_KEY from a local env file if it is not already in the
// environment. These files are gitignored secrets; we read, never print them.
function loadApiKeyIfNeeded() {
  if (process.env.ANTHROPIC_API_KEY) return;
  loadEnvFiles([
    path.join(MODULE_ROOT, "..", "eval", ".env.local"),
    path.join(MODULE_ROOT, "..", "eval", ".env"),
    path.join(MODULE_ROOT, "..", ".env.local"),
    path.join(MODULE_ROOT, ".env.local")
  ]);
}

async function main() {
  loadApiKeyIfNeeded();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY not found. Set it in the environment, or create eval/.env.local " +
        "with ANTHROPIC_API_KEY=... (gitignored). Step 0 needs exactly one authorized real call."
    );
    process.exit(2);
  }

  const venv = ensureVenv();
  const task = loadTask(TASK_DIR);
  const model = getAgentModelId();
  const runId = makeTimestampRunId("phase2-step0");
  const outDir = path.join(MODULE_ROOT, "results", runId);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Step 0 real-model wiring probe`);
  console.log(`Agent model: ${model}`);
  console.log(`Python: ${venv.python_version} | pytest: ${venv.pytest_version}`);
  console.log(`Task: ${task.task_id}\n`);

  const sandbox = createSandbox({ task, python: venv.python, timeoutMs: 30000, outputCapBytes: 1_000_000 });
  let record;
  try {
    const agent = await runAgent({
      callModel: createAnthropicAgentModel({ model }),
      sandbox,
      tools: defaultTools,
      stepBudget: task.step_budget
    });

    // Independent re-validation of the recorded trajectory against the frozen schema.
    validateTrajectory(agent.steps);

    const oracle = runOracle(sandbox);
    const runConfig = { task_id: task.task_id, model_id: model, step_budget: task.step_budget, pinned_pytest: venv.pinned_pytest };

    record = {
      run_id: runId,
      probe: "step0_real_wiring",
      task_id: task.task_id,
      model_id: model,
      workspace_sha256: task.workspace_sha256,
      run_config_sha256: sha256(stableJson(runConfig)),
      python_version: venv.python_version,
      pytest_version: venv.pytest_version,
      outcome: agent.solved ? "solved" : "unsolved",
      loop_stop_reason: agent.stop_reason,
      step_count: agent.steps.length,
      schema_valid: true,
      oracle,
      trajectory: agent.steps
    };
  } finally {
    cleanupSandbox(sandbox);
  }

  fs.writeFileSync(path.join(outDir, "step0.json"), JSON.stringify(record, null, 2));

  console.log(`outcome=${record.outcome} loop_stop_reason=${record.loop_stop_reason} steps=${record.step_count}`);
  console.log(`schema_valid=${record.schema_valid} oracle_pass=${record.oracle.oracle_pass}`);
  console.log(`actions=${record.trajectory.map(s => s.action_type).join(" -> ")}`);
  console.log(`\nArtifact: ${path.relative(MODULE_ROOT, path.join(outDir, "step0.json"))}`);

  const wiringOk =
    record.schema_valid &&
    ["tests_passed", "budget_exhausted", "model_stopped"].includes(record.loop_stop_reason);
  if (!wiringOk) {
    console.error("\nWiring probe FAILED: trajectory invalid or loop did not terminate cleanly.");
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
