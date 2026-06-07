import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureVenv } from "../lib/venv.js";
import { loadAllTasks } from "../lib/tasks.js";
import { runSuite } from "../lib/runner.js";
import { goldFake } from "../lib/fakeModels.js";

// Proves resumability + hash integrity on the FAKE model:
//   Run 1: limit=4 (simulated mid-run kill) -> 4 rows written.
//   Run 2: resume -> 4 skipped by hash, 4 computed, metrics cover all 8.
//   Run 3: resume again -> all 8 skipped, metrics identical.
//   Run 4: tamper one row's content_sha256 -> that task is recomputed, rest skipped.

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TASKS_ROOT = path.join(MODULE_ROOT, "tasks");

let failures = 0;
function assert(name, condition) {
  console.log(`  ${condition ? "OK  " : "FAIL"} ${name}`);
  if (!condition) failures += 1;
}

function countRows(p) {
  return fs.readFileSync(p, "utf8").split("\n").filter(Boolean).length;
}

function tamperOneRow(p, taskId) {
  const out = fs
    .readFileSync(p, "utf8")
    .split("\n")
    .filter(Boolean)
    .map(line => {
      const row = JSON.parse(line);
      if (row.task_id === taskId) row.content_sha256 = "0".repeat(64);
      return JSON.stringify(row);
    });
  fs.writeFileSync(p, out.join("\n") + "\n");
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function main() {
  const venv = ensureVenv();
  const tasks = loadAllTasks(TASKS_ROOT, { schemaVersion: "2.0" });
  const resultsPath = path.join(MODULE_ROOT, "results", "phase2-resume-proof", "results.jsonl");
  fs.rmSync(path.dirname(resultsPath), { recursive: true, force: true });
  const model = { make: goldFake, id: () => "fake:gold", seed: "phase2-fake" };

  console.log("Run 1: limit=4 (simulated mid-run kill)");
  const r1 = await runSuite({ tasks, model, venv, resultsPath, limit: 4, log: l => console.log("    " + l) });
  assert("run1 computed 4", r1.computed === 4);
  assert("run1 skipped 0", r1.skipped === 0);
  assert("results.jsonl has 4 rows", countRows(resultsPath) === 4);

  const n = tasks.length;
  console.log("\nRun 2: resume (no limit)");
  const r2 = await runSuite({ tasks, model, venv, resultsPath, log: l => console.log("    " + l) });
  assert("run2 skipped 4 (hash-verified)", r2.skipped === 4);
  assert(`run2 computed ${n - 4}`, r2.computed === n - 4);
  assert(`run2 metrics cover all ${n}`, r2.metrics.n === n);
  const metricsFull = r2.metrics;

  console.log("\nRun 3: resume again (expect all skipped, identical metrics)");
  const r3 = await runSuite({ tasks, model, venv, resultsPath, log: l => console.log("    " + l) });
  assert("run3 computed 0", r3.computed === 0);
  assert(`run3 skipped ${n}`, r3.skipped === n);
  assert("run3 metrics identical to run2", same(r3.metrics, metricsFull));

  console.log("\nRun 4: tamper one row's content_sha256 (integrity check must recompute it)");
  tamperOneRow(resultsPath, tasks[0].task_id);
  const r4 = await runSuite({ tasks, model, venv, resultsPath, log: l => console.log("    " + l) });
  assert("run4 recomputed exactly 1 (the tampered task)", r4.computed === 1);
  assert(`run4 skipped ${n - 1}`, r4.skipped === n - 1);
  assert(`run4 metrics still cover ${n} and equal run2`, r4.metrics.n === n && same(r4.metrics, metricsFull));

  if (failures > 0) {
    console.error(`\n${failures} assertion(s) FAILED.`);
    process.exit(1);
  }
  console.log("\nResume + integrity proofs passed.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
