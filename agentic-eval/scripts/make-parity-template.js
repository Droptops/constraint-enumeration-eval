import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadTask } from "../lib/tasks.js";
import { buildJudgeInput } from "../lib/trajectoryJudge.js";
import { judgmentToLabels, PARITY_CONSTRAINTS } from "../lib/parity.js";

// Build a human-label template + the judges' labels (stored separately, so the
// template you fill is unbiased) from a real run's results.jsonl + judged.json.
// No API. Usage:
//   node scripts/make-parity-template.js <results.jsonl> <judged.json> [outDir]

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TASKS_ROOT = path.join(MODULE_ROOT, "tasks");

const resultsPath = process.argv[2];
const judgedPath = process.argv[3];
const outDir = process.argv[4] || path.join(MODULE_ROOT, "results_published", "parity");

if (!resultsPath || !fs.existsSync(resultsPath) || !judgedPath || !fs.existsSync(judgedPath)) {
  console.error("Usage: node scripts/make-parity-template.js <results.jsonl> <judged.json> [outDir]");
  process.exit(1);
}

// Latest row per task (single-trial runs => one per task).
const rows = fs.readFileSync(resultsPath, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
const byTask = new Map(rows.map(r => [r.task_id, r]));
const items = [...byTask.values()].sort((a, b) => (a.task_id < b.task_id ? -1 : 1));

// Judge labels per family, keyed by task_id.
const judged = JSON.parse(fs.readFileSync(judgedPath, "utf8"));
const judgeByTask = new Map();
for (const j of judged) {
  const perFamily = {};
  for (const r of j.dual?.results || []) perFamily[r.family] = judgmentToLabels(r.score);
  judgeByTask.set(j.task_id, perFamily);
}

const template = [];
const judgeLabels = {};
for (const row of items) {
  const task = loadTask(path.join(TASKS_ROOT, row.task_id));
  const oraclePass = row.score?.resolve ?? row.oracle?.oracle_pass ?? false;
  const ji = buildJudgeInput(task, row.trajectory, oraclePass);
  template.push({
    trajectory_id: row.task_id,
    oracle_pass: oraclePass,
    spec: ji.spec,
    diff: ji.diff,
    trajectory_summary: ji.trajectory_summary,
    human_labels: Object.fromEntries(PARITY_CONSTRAINTS.map(k => [k, null]))
  });
  judgeLabels[row.task_id] = judgeByTask.get(row.task_id) || {};
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "parity-template.json"), JSON.stringify(template, null, 2));
fs.writeFileSync(path.join(outDir, "parity-judge-labels.json"), JSON.stringify(judgeLabels, null, 2));

console.log(`Wrote ${template.length} trajectories to ${path.relative(MODULE_ROOT, outDir)}/`);
console.log("Next: copy parity-template.json -> parity-human-labels.json, fill each human_labels (true/false),");
console.log("then: node scripts/report-parity.js results_published/parity/parity-judge-labels.json results_published/parity/parity-human-labels.json");
