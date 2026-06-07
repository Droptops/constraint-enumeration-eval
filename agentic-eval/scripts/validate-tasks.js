import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureVenv } from "../lib/venv.js";
import { loadAllTasks } from "../lib/tasks.js";
import { createSandbox, cleanupSandbox, runPytest } from "../lib/sandbox.js";
import { injectHeldout } from "../lib/oracle.js";

// Deterministic task-set validator (NO API). For each v2 task it proves the
// invariants the whole eval depends on:
//   buggy   -> visible FAILS, held-out fail_to_pass FAILS, pass_to_pass PASSES
//   gold    -> visible PASSES, held-out fail_to_pass PASSES, pass_to_pass PASSES
//   cheat   -> visible PASSES but held-out fail_to_pass FAILS (held-out catches it)
// Plus structural checks (>=2 generalization cases, content hash present).

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TASKS_ROOT = path.join(MODULE_ROOT, "tasks");

function applyFiles(sandbox, srcDir, files) {
  for (const rel of files || []) {
    fs.copyFileSync(path.join(srcDir, rel), path.join(sandbox.root, rel));
  }
}

function verdicts(task, venv, applied) {
  const sandbox = createSandbox({
    task,
    python: venv.python,
    timeoutMs: (task.test_timeout_seconds || 30) * 1000,
    outputCapBytes: 1_000_000
  });
  try {
    if (applied) applyFiles(sandbox, applied.srcDir, applied.files);
    // Visible tests must pass/fail WITHOUT held-out files present, so run them
    // before injection. This proves the visible suite has no dependency on (or
    // leakage from) __heldout__. Only then inject held-out for the real checks.
    const visible = runPytest(sandbox, task.visible_tests).passed;
    injectHeldout(sandbox, task);
    const failToPass = runPytest(sandbox, task.heldout_fail_to_pass).passed;
    const passToPass = runPytest(sandbox, task.heldout_pass_to_pass).passed;
    return { visible, failToPass, passToPass };
  } finally {
    cleanupSandbox(sandbox);
  }
}

function check(name, condition, problems) {
  if (!condition) problems.push(name);
}

async function main() {
  const venv = ensureVenv();
  const tasks = loadAllTasks(TASKS_ROOT, { schemaVersion: "2.0" });
  if (tasks.length === 0) {
    console.error("No v2 tasks found under tasks/.");
    process.exit(1);
  }

  let allOk = true;
  for (const task of tasks) {
    const problems = [];
    check("has_content_sha256", typeof task.content_sha256 === "string" && task.content_sha256.length === 64, problems);
    check("ge2_heldout_fail_to_pass", (task.heldout_fail_to_pass || []).length >= 2, problems);
    check("has_heldout_dir", Boolean(task.heldoutDir), problems);
    check("has_gold_dir", Boolean(task.goldDir), problems);
    // Leakage guards: held-out tests must not ship inside the agent's workspace,
    // visible targets must not reference the injected __heldout__ mount, and
    // held-out targets must live under it.
    check("no_heldout_in_workspace", !fs.existsSync(path.join(task.workspaceDir, "__heldout__")), problems);
    check("visible_targets_not_heldout", (task.visible_tests || []).every(t => !t.includes("__heldout__")), problems);
    check(
      "heldout_targets_namespaced",
      [...(task.heldout_fail_to_pass || []), ...(task.heldout_pass_to_pass || [])].every(t => t.startsWith("__heldout__/")),
      problems
    );

    const buggy = verdicts(task, venv);
    check("buggy_visible_fails", buggy.visible === false, problems);
    check("buggy_fail_to_pass_fails", buggy.failToPass === false, problems);
    check("buggy_pass_to_pass_passes", buggy.passToPass === true, problems);

    const gold = verdicts(task, venv, { srcDir: task.goldDir, files: task.gold_files });
    check("gold_visible_passes", gold.visible === true, problems);
    check("gold_fail_to_pass_passes", gold.failToPass === true, problems);
    check("gold_pass_to_pass_passes", gold.passToPass === true, problems);

    if (task.cheatDir) {
      const cheat = verdicts(task, venv, { srcDir: task.cheatDir, files: task.cheat_files });
      check("cheat_visible_passes", cheat.visible === true, problems);
      check("cheat_fail_to_pass_fails", cheat.failToPass === false, problems);
    }

    const ok = problems.length === 0;
    allOk = allOk && ok;
    console.log(`${ok ? "OK  " : "FAIL"} ${task.task_id}${ok ? "" : "  -> " + problems.join(", ")}`);
  }

  console.log(`\n${tasks.length} v2 tasks checked.`);
  if (!allOk) {
    console.error("Task validation FAILED.");
    process.exit(1);
  }
  console.log("All task invariants hold (buggy fails held-out, gold passes held-out, cheat dies on held-out).");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
