import fs from "node:fs";
import { resolveInSandbox, runPytest } from "./sandbox.js";

// The three tools exposed to the model-under-test. Each returns a plain
// observation object (never throws on model error) so the loop can record it
// and continue. Path access is sandbox-guarded; run_tests targets come from the
// trusted task manifest, not the model, so the model cannot point pytest at
// arbitrary files.

export function readFile(sandbox, args) {
  const abs = resolveInSandbox(sandbox.root, args?.path);
  if (!fs.existsSync(abs)) {
    return { ok: false, error: `file not found: ${args.path}` };
  }
  return { ok: true, path: args.path, content: fs.readFileSync(abs, "utf8") };
}

export function editFile(sandbox, args) {
  const { path: relPath, old_str, new_str } = args || {};
  if (typeof old_str !== "string" || typeof new_str !== "string") {
    return { ok: false, error: "edit_file requires string old_str and new_str" };
  }

  const abs = resolveInSandbox(sandbox.root, relPath);
  if (!fs.existsSync(abs)) {
    return { ok: false, error: `file not found: ${relPath}` };
  }

  const before = fs.readFileSync(abs, "utf8");
  const matches = old_str === "" ? 0 : before.split(old_str).length - 1;
  if (matches === 0) {
    return { ok: false, error: "old_str not found in file" };
  }
  if (matches > 1) {
    return { ok: false, error: `old_str is not unique (${matches} matches); make it more specific` };
  }

  fs.writeFileSync(abs, before.replace(old_str, new_str), "utf8");
  return { ok: true, path: relPath, replaced: 1 };
}

export function runTests(sandbox) {
  // The model never chooses targets — run_tests always runs the task's
  // designated VISIBLE tests (v2) or fail_to_pass+pass_to_pass (v1 demo). This
  // is the seam that keeps held-out tests unreachable: they are not in the
  // sandbox during the loop and the model cannot point pytest at them.
  const task = sandbox.task;
  const targets =
    Array.isArray(task.visible_tests) && task.visible_tests.length
      ? task.visible_tests
      : [...(task.fail_to_pass || []), ...(task.pass_to_pass || [])];

  const r = runPytest(sandbox, targets);
  return {
    ok: true,
    passed: r.passed,
    returncode: r.returncode,
    timed_out: r.timedOut,
    output_cap_exceeded: r.outputCapExceeded,
    targets,
    stdout_tail: r.stdout.slice(-4000),
    stderr_tail: r.stderr.slice(-2000)
  };
}

export const defaultTools = { readFile, editFile, runTests };
