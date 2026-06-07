import fs from "node:fs";
import path from "node:path";

// Reconstruct the final unified diff for a run by replaying the trajectory's
// successful edit_file actions over the original workspace files. This is exact:
// the only mutations the agent makes to the workspace are edit_file replacements,
// so workspace + applied edits == the sandbox's final state. Held-out tests are
// never in the workspace and never touched by edits, so they can never appear in
// this diff.
export function reconstructDiff(task, trajectory) {
  const changed = new Map(); // relPath -> { original, current }

  for (const step of trajectory) {
    if (step.action_type !== "edit_file" || step.observation?.ok !== true) continue;
    const rel = step.action_args.path;
    if (!changed.has(rel)) {
      const original = readWorkspaceFile(task, rel);
      changed.set(rel, { original, current: original });
    }
    const entry = changed.get(rel);
    entry.current = entry.current.replace(step.action_args.old_str, step.action_args.new_str);
  }

  const parts = [];
  for (const [rel, { original, current }] of [...changed.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (original === current) continue;
    parts.push(unifiedDiff(rel, original, current));
  }
  return parts.join("\n");
}

function readWorkspaceFile(task, rel) {
  const abs = path.join(task.workspaceDir, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
}

// Minimal LCS-based unified diff (full context). Files here are tiny, so a DP
// LCS is fine and avoids a diff dependency.
export function unifiedDiff(relPath, original, current) {
  const a = original.split("\n");
  const b = current.split("\n");
  const ops = diffLines(a, b);
  const lines = [`--- a/${relPath}`, `+++ b/${relPath}`];
  for (const [kind, text] of ops) {
    lines.push(kind === "ctx" ? ` ${text}` : kind === "del" ? `-${text}` : `+${text}`);
  }
  return lines.join("\n");
}

function diffLines(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push(["ctx", a[i]]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push(["del", a[i]]);
      i++;
    } else {
      ops.push(["add", b[j]]);
      j++;
    }
  }
  while (i < n) ops.push(["del", a[i++]]);
  while (j < m) ops.push(["add", b[j++]]);
  return ops;
}

export function summarizeTrajectory(trajectory) {
  return trajectory
    .map(step => {
      const obs = step.observation || {};
      let result;
      if (step.action_type === "run_tests") result = `passed=${obs.passed}`;
      else if (step.action_type === "edit_file") result = obs.ok ? "ok" : `error: ${obs.error}`;
      else if (step.action_type === "read_file") result = obs.ok ? "ok" : `error: ${obs.error}`;
      else result = obs.ok === false ? `error: ${obs.error}` : "stop";
      const target = step.action_args?.path ? ` ${step.action_args.path}` : "";
      return `step ${step.step_idx} ${step.action_type}${target} -> ${result}`;
    })
    .join("\n");
}

// Assemble the judge's input. Contains ONLY the task spec, the reconstructed
// diff, the trajectory summary, and the target files — no held-out tests.
export function buildJudgeInput(task, trajectory, oracle_pass) {
  return {
    task_id: task.task_id,
    spec: task.description,
    target_files: task.gold_files || [],
    diff: reconstructDiff(task, trajectory),
    trajectory_summary: summarizeTrajectory(trajectory),
    oracle_pass: oracle_pass === true
  };
}
