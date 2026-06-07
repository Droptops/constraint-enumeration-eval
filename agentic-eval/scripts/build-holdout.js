import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureVenv } from "../lib/venv.js";
import { loadAllTasks, loadTask } from "../lib/tasks.js";
import { runSuite } from "../lib/runner.js";
import { goldFake, cheatFake, budgetFake } from "../lib/fakeModels.js";
import { buildJudgeInput, dualJudge, makeRealJudge } from "../lib/trajectoryJudge.js";
import { judgmentToLabels, PARITY_CONSTRAINTS } from "../lib/parity.js";
import { classifyFailure, makeRealIntrospector, aggregateTaxonomy } from "../lib/introspect.js";
import { getAgentModelId } from "../lib/anthropicAgent.js";
import { loadEnvFiles } from "../lib/env.js";

// Builds the Phase 4 holdout: regenerate a spread of trajectories on the FAKE
// model (offline), then label the judge side with the REAL cross-family judges,
// run REAL introspection on the failed runs, and emit a BLANK human-label
// template. Spends judge + introspection API budget (keys via env only).

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TASKS_ROOT = path.join(MODULE_ROOT, "tasks");
const OUT_DIR = path.join(MODULE_ROOT, "results", "phase4-holdout");
const CHEAT_TASK = "count_words_keyerror";
const BUDGET_TASK = "all_positive_early_return";

function loadKeysIfNeeded() {
  if (process.env.OPENAI_API_KEY && process.env.GEMINI_API_KEY && process.env.ANTHROPIC_API_KEY) return;
  loadEnvFiles([path.join(MODULE_ROOT, "..", "eval", ".env.local"), path.join(MODULE_ROOT, "..", "eval", ".env")]);
}

function latestStep0() {
  const dir = path.join(MODULE_ROOT, "results");
  if (!fs.existsSync(dir)) return null;
  const dirs = fs.readdirSync(dir).filter(d => d.startsWith("phase2-step0-") && fs.existsSync(path.join(dir, d, "step0.json"))).sort();
  return dirs.length ? path.join(dir, dirs[dirs.length - 1], "step0.json") : null;
}

async function main() {
  loadKeysIfNeeded();
  if (!process.env.OPENAI_API_KEY || !process.env.GEMINI_API_KEY) {
    console.error("build-holdout needs OPENAI_API_KEY and GEMINI_API_KEY (judges). Aborting; no call made.");
    process.exit(2);
  }
  const haveAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  if (!haveAnthropic) console.warn("ANTHROPIC_API_KEY missing -> skipping real introspection (taxonomy will be empty).");

  const venv = ensureVenv();
  const tasks = loadAllTasks(TASKS_ROOT, { schemaVersion: "2.0" });
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Regenerate a spread of trajectories on the fake model (offline).
  const mixedModel = {
    make: t => (t.task_id === CHEAT_TASK ? cheatFake(t) : t.task_id === BUDGET_TASK ? budgetFake(t) : goldFake(t)),
    id: t => (t.task_id === CHEAT_TASK ? "fake:cheat" : t.task_id === BUDGET_TASK ? "fake:budget" : "fake:gold"),
    seed: "phase4"
  };
  const suite = await runSuite({ tasks, model: mixedModel, venv, resultsPath: path.join(OUT_DIR, "suite", "results.jsonl") });

  const items = suite.results.map(r => ({
    trajectory_id: r.task_id,
    task: tasks.find(t => t.task_id === r.task_id),
    trajectory: r.trajectory,
    oracle_pass: r.score.resolve
  }));

  // Include the one real-agent trajectory (Step 0) if available.
  const step0Path = latestStep0();
  if (step0Path) {
    const step0 = JSON.parse(fs.readFileSync(step0Path, "utf8"));
    items.push({ trajectory_id: "step0_one_line_bug", task: loadTask(path.join(TASKS_ROOT, "..", "tasks", "one_line_bug")), trajectory: step0.trajectory, oracle_pass: step0.oracle.oracle_pass });
  }

  const judges = [
    { family: "openai", callJudge: makeRealJudge({ family: "openai" }) },
    { family: "google", callJudge: makeRealJudge({ family: "google" }) }
  ];

  const judgeLabels = { openai: {}, google: {} };
  const template = [];
  const dualRaw = {};
  const holdout = [];

  for (const item of items) {
    const judgeInput = buildJudgeInput(item.task, item.trajectory, item.oracle_pass);
    console.log(`Judging ${item.trajectory_id} (oracle_pass=${item.oracle_pass})...`);
    let dual = null;
    try {
      dual = await dualJudge({ judgeInput, oracle_pass: item.oracle_pass, agentFamily: "anthropic", judges });
    } catch (error) {
      console.warn(`  judge error on ${item.trajectory_id}: ${error.message}`);
    }
    dualRaw[item.trajectory_id] = dual;

    const labelsByFamily = { openai: null, google: null };
    if (dual) {
      for (const res of dual.results) {
        const labels = judgmentToLabels(res.score);
        labelsByFamily[res.family] = labels;
        if (labels) judgeLabels[res.family][item.trajectory_id] = labels;
      }
    }

    holdout.push({ trajectory_id: item.trajectory_id, task_id: item.task.task_id, oracle_pass: item.oracle_pass, judge_labels: labelsByFamily });
    template.push({
      trajectory_id: item.trajectory_id,
      task_id: item.task.task_id,
      oracle_pass: item.oracle_pass,
      spec: judgeInput.spec,
      diff: judgeInput.diff,
      trajectory_summary: judgeInput.trajectory_summary,
      human_labels: Object.fromEntries(PARITY_CONSTRAINTS.map(k => [k, null]))
    });
  }

  // Real introspection on FAILED runs only.
  const classifications = [];
  if (haveAnthropic) {
    const introspector = makeRealIntrospector({ model: getAgentModelId() });
    for (const item of items.filter(i => i.oracle_pass === false)) {
      const ji = buildJudgeInput(item.task, item.trajectory, item.oracle_pass);
      const last = item.trajectory[item.trajectory.length - 1];
      const run = { spec: ji.spec, trajectory_summary: ji.trajectory_summary, oracle_pass: item.oracle_pass, loop_stop_reason: last?.stop_reason || "unknown", diff: ji.diff };
      console.log(`Introspecting failed run ${item.trajectory_id}...`);
      try {
        const c = await classifyFailure({ run, callIntrospect: introspector });
        classifications.push({ trajectory_id: item.trajectory_id, ...c });
      } catch (error) {
        console.warn(`  introspection error on ${item.trajectory_id}: ${error.message}`);
        classifications.push({ trajectory_id: item.trajectory_id, valid: false, error: error.message });
      }
    }
  }
  const taxonomy = aggregateTaxonomy(classifications);

  fs.writeFileSync(path.join(OUT_DIR, "holdout.json"), JSON.stringify({ generated: "fake-model trajectories; real cross-family judge labels", trajectories: holdout }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "judge-labels.json"), JSON.stringify(judgeLabels, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "label-template.json"), JSON.stringify(template, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "introspection.json"), JSON.stringify({ classifications, taxonomy }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "dual-raw.json"), JSON.stringify(dualRaw, null, 2));

  console.log(`\nHoldout: ${holdout.length} trajectories | introspected failed: ${classifications.length}`);
  console.log("Taxonomy:", JSON.stringify(taxonomy.counts));
  console.log(`Artifacts: ${path.relative(MODULE_ROOT, OUT_DIR)}`);
  console.log("\nNext: copy label-template.json -> human-labels.json, fill human_labels, then `npm run report-final`.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
