import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureVenv } from "../lib/venv.js";
import { loadAllTasks } from "../lib/tasks.js";
import { runSuite, computeMetrics } from "../lib/runner.js";
import { goldFake } from "../lib/fakeModels.js";
import { createAnthropicAgentModel, getAgentModelId, getAgentCondition, getAgentTemperature } from "../lib/anthropicAgent.js";
import { formatReport } from "../lib/report.js";
import { loadEnvFiles } from "../lib/env.js";

// One-command suite runner. Resumable (same results path -> hash-verified skips).
//   AGENT=fake-gold (default) — offline, free; applies each task's gold patch.
//   AGENT=real                — spends API budget; needs ANTHROPIC_API_KEY and an
//                               explicit opt-in. NOT run automatically.
const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TASKS_ROOT = path.join(MODULE_ROOT, "tasks");
const AGENT = process.env.AGENT || "fake-gold";

function loadApiKeyIfNeeded() {
  if (process.env.ANTHROPIC_API_KEY) return;
  loadEnvFiles([
    path.join(MODULE_ROOT, "..", "eval", ".env.local"),
    path.join(MODULE_ROOT, "..", "eval", ".env"),
    path.join(MODULE_ROOT, ".env.local")
  ]);
}

function buildModel() {
  if (AGENT === "fake-gold") {
    return { model: { make: goldFake, id: () => "fake:gold", seed: "phase2-fake" }, label: "fake-gold" };
  }
  if (AGENT === "real") {
    loadApiKeyIfNeeded();
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("AGENT=real requires ANTHROPIC_API_KEY. Aborting (no real call made).");
      process.exit(2);
    }
    const condition = getAgentCondition();
    const temperature = getAgentTemperature();
    // Condition and temperature are folded into model_id so the run-config hash
    // (and the row) distinguish A/B conditions and sampling temperature.
    const condSuffix = condition === "default" ? "" : `+${condition}`;
    const tempSuffix = temperature === 0 ? "" : `@t${temperature}`;
    const modelId = `${getAgentModelId()}${condSuffix}${tempSuffix}`;
    const labelSuffix = `${condition === "default" ? "" : `-${condition}`}${temperature === 0 ? "" : `-t${temperature}`}`;
    return {
      model: { make: () => createAnthropicAgentModel({ condition, temperature }), id: () => modelId, seed: null },
      label: `real-${getAgentModelId()}${labelSuffix}`
    };
  }
  console.error(`Unknown AGENT=${AGENT}. Use fake-gold or real.`);
  process.exit(1);
}

async function main() {
  const venv = ensureVenv();
  const tasks = loadAllTasks(TASKS_ROOT, { schemaVersion: "2.0" });
  const { model, label } = buildModel();
  const outDir = path.join(MODULE_ROOT, "results", `suite-${label}`);
  const resultsPath = path.join(outDir, "results.jsonl");
  const limit = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;
  const trials = process.env.TRIALS ? Number(process.env.TRIALS) : 1;

  console.log(`Suite AGENT=${AGENT} tasks=${tasks.length} trials=${trials} -> ${path.relative(MODULE_ROOT, resultsPath)}`);
  for (let trial = 0; trial < trials; trial++) {
    if (trials > 1) console.log(`-- trial ${trial} --`);
    await runSuite({ tasks, model, venv, resultsPath, limit, trial, log: line => console.log("  " + line) });
  }

  // Aggregate metrics over every task x trial sample.
  const allRows = fs.readFileSync(resultsPath, "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line));
  const byKey = new Map(allRows.map(row => [`${row.task_id}#${row.trial ?? 0}`, row]));
  const metrics = computeMetrics([...byKey.values()]);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "metrics.json"), JSON.stringify(metrics, null, 2));
  console.log("\n" + formatReport(metrics, { title: `suite ${label} (trials=${trials})` }));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
