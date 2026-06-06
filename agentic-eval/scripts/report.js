import fs from "node:fs";
import path from "node:path";
import { computeMetrics } from "../lib/runner.js";
import { formatReport } from "../lib/report.js";

// Print a metrics report from a results.jsonl file. Resume-safe: if a task has
// multiple rows (a recomputed row appended after a tampered one), the last wins.
const resultsPath = process.argv[2];
if (!resultsPath || !fs.existsSync(resultsPath)) {
  console.error("Usage: node scripts/report.js <results.jsonl>");
  process.exit(1);
}

const rows = fs
  .readFileSync(resultsPath, "utf8")
  .split("\n")
  .filter(Boolean)
  .map(line => JSON.parse(line));

const byTask = new Map(rows.map(row => [row.task_id, row]));
const results = [...byTask.values()].sort((a, b) => (a.task_id < b.task_id ? -1 : 1));

console.log(formatReport(computeMetrics(results), { title: `metrics: ${path.basename(path.dirname(resultsPath))}` }));
