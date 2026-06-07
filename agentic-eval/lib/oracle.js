import fs from "node:fs";
import path from "node:path";
import { runPytest } from "./sandbox.js";

const HELDOUT_MOUNT = "__heldout__";

// Copy the held-out tests into the sandbox at oracle time, under a reserved
// mount dir. They were NEVER in the workspace copy the agent saw, and the loop
// has already finished, so the agent could not read or run them.
export function injectHeldout(sandbox, task) {
  if (!task.heldoutDir) throw new Error(`task ${task.task_id} has no heldout/ directory`);
  fs.cpSync(task.heldoutDir, path.join(sandbox.root, HELDOUT_MOUNT), { recursive: true });
}

// v2 held-out oracle. Returns the visible-only verdict (diagnostic), the
// held-out resolve verdict (the real metric), and whether the held-out split
// changed the verdict (discrimination).
export function scoreFinalState(sandbox, task) {
  const visible = runPytest(sandbox, task.visible_tests || []);

  injectHeldout(sandbox, task);
  const heldoutTargets = [...(task.heldout_fail_to_pass || []), ...(task.heldout_pass_to_pass || [])];
  const heldout = runPytest(sandbox, heldoutTargets);

  const visible_pass = visible.passed;
  const resolve = heldout.passed; // exit 0 over all held-out targets, not timed out / capped

  return {
    resolve,
    visible_pass,
    discrimination: visible_pass !== resolve,
    visible: summarize(visible),
    heldout: { ...summarize(heldout), targets: heldoutTargets }
  };
}

function summarize(r) {
  return {
    passed: r.passed,
    returncode: r.returncode,
    timed_out: r.timedOut,
    output_cap_exceeded: r.outputCapExceeded,
    output_tail: r.stdout.slice(-1500)
  };
}

// The hard oracle. Deterministic, no judge: after the agent's final edit, run
// the task's fail_to_pass and pass_to_pass node ids together. oracle_pass is
// true only if pytest exits 0 (every target passed) and the run neither timed
// out nor blew the output cap. fail_to_pass must now pass; pass_to_pass must
// have stayed green.
export function runOracle(sandbox) {
  const failToPass = sandbox.task.fail_to_pass || [];
  const passToPass = sandbox.task.pass_to_pass || [];
  const targets = [...failToPass, ...passToPass];

  const r = runPytest(sandbox, targets);

  return {
    oracle_pass: r.passed,
    returncode: r.returncode,
    timed_out: r.timedOut,
    output_cap_exceeded: r.outputCapExceeded,
    fail_to_pass: failToPass,
    pass_to_pass: passToPass,
    targets,
    output_tail: r.stdout.slice(-2000),
    stderr_tail: r.stderr.slice(-1000)
  };
}
