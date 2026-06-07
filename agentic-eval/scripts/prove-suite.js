import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureVenv } from "../lib/venv.js";
import { loadAllTasks } from "../lib/tasks.js";
import { runSuite } from "../lib/runner.js";
import { goldFake, cheatFake, budgetFake } from "../lib/fakeModels.js";
import { formatReport } from "../lib/report.js";

// Proves the held-out suite end-to-end on the FAKE model (offline, free):
//   Scenario A — all gold: clean solves, resolve_rate = 100%.
//   Scenario B — mixed (gold + one budget-exhaustion + one cheat): the cheat
//     passes visible-only scoring but FAILS held-out scoring. That single
//     result is the proof the held-out split does real work.

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TASKS_ROOT = path.join(MODULE_ROOT, "tasks");
const CHEAT_TASK = "count_words_keyerror";
const BUDGET_TASK = "all_positive_early_return";

let failures = 0;
function assert(name, condition) {
  console.log(`  ${condition ? "OK  " : "FAIL"} ${name}`);
  if (!condition) failures += 1;
}

async function main() {
  const venv = ensureVenv();
  const tasks = loadAllTasks(TASKS_ROOT, { schemaVersion: "2.0" });
  const outRoot = path.join(MODULE_ROOT, "results", "phase2-fake-proof");
  fs.rmSync(outRoot, { recursive: true, force: true });

  console.log("Scenario A: all gold (clean solve)");
  const goldModel = { make: goldFake, id: () => "fake:gold", seed: "phase2-fake" };
  const a = await runSuite({
    tasks,
    model: goldModel,
    venv,
    resultsPath: path.join(outRoot, "gold", "results.jsonl"),
    log: line => console.log("    " + line)
  });
  assert("resolve_rate == 1.0", a.metrics.resolve_rate === 1);
  assert("every task solved", a.results.every(r => r.outcome === "solved"));
  assert("discrimination_count == 0 (gold generalizes; held-out agrees with visible)", a.metrics.discrimination_count === 0);

  console.log("\nScenario B: mixed (gold + 1 budget-exhaustion + 1 cheat) — discrimination proof");
  const mixedModel = {
    make: task =>
      task.task_id === CHEAT_TASK ? cheatFake(task) : task.task_id === BUDGET_TASK ? budgetFake(task) : goldFake(task),
    id: task => (task.task_id === CHEAT_TASK ? "fake:cheat" : task.task_id === BUDGET_TASK ? "fake:budget" : "fake:gold"),
    seed: "phase2-fake"
  };
  const b = await runSuite({
    tasks,
    model: mixedModel,
    venv,
    resultsPath: path.join(outRoot, "mixed", "results.jsonl"),
    log: line => console.log("    " + line)
  });

  const cheatRow = b.results.find(r => r.task_id === CHEAT_TASK);
  const budgetRow = b.results.find(r => r.task_id === BUDGET_TASK);

  console.log("\nAssertions:");
  assert("cheat passes visible-only scoring", cheatRow.score.visible_pass === true);
  assert("cheat FAILS held-out scoring (resolve=false)", cheatRow.score.resolve === false);
  assert("cheat is flagged as discriminated", cheatRow.score.discrimination === true);
  assert(
    "budget-exhaustion fake: unsolved + budget_exhausted (failed-but-valid)",
    budgetRow.outcome === "unsolved" && budgetRow.loop_stop_reason === "budget_exhausted"
  );
  const n = tasks.length;
  assert(`resolve_rate == (n-2)/n = ${n - 2}/${n}`, b.metrics.resolve_rate === (n - 2) / n);
  assert(`visible_only_rate == (n-1)/n = ${n - 1}/${n}`, b.metrics.visible_only_rate === (n - 1) / n);
  assert("discrimination_count == 1 (the cheat)", b.metrics.discrimination_count === 1);
  assert("held-out does work (not overfittable)", b.metrics.heldout_does_work === true && b.metrics.overfittable_flag === false);

  fs.writeFileSync(path.join(outRoot, "metrics.json"), JSON.stringify({ gold: a.metrics, mixed: b.metrics }, null, 2));

  console.log("\n" + formatReport(b.metrics, { title: "Phase 2 fake-model MIXED scenario", note: "Fake model: gold on all but two tasks, budget-exhaustion on 1, cheat on 1." }));
  console.log(`\nArtifacts: ${path.relative(MODULE_ROOT, outRoot)}`);

  if (failures > 0) {
    console.error(`\n${failures} assertion(s) FAILED.`);
    process.exit(1);
  }
  console.log("\nAll fake-model suite proofs passed.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
