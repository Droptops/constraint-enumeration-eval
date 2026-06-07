import fs from "node:fs";
import path from "node:path";

// Deterministic fake models used to prove the suite offline. Each returns a
// scripted callModel compatible with the agent loop's injected seam.

export function scripted(actions) {
  let i = 0;
  return async () => (i < actions.length ? actions[i++] : { action_type: "stop" });
}

function fullFileEdits(task, srcDir, files) {
  return (files || []).map(rel => ({
    action_type: "edit_file",
    action_args: {
      path: rel,
      old_str: fs.readFileSync(path.join(task.workspaceDir, rel), "utf8"),
      new_str: fs.readFileSync(path.join(srcDir, rel), "utf8")
    }
  }));
}

// Applies the task's gold file(s), then runs tests — a clean solve.
export function goldFake(task) {
  return scripted([...fullFileEdits(task, task.goldDir, task.gold_files), { action_type: "run_tests", action_args: {} }]);
}

// Applies the task's cheat file(s) (special-cased to the visible inputs), then
// runs tests — passes visible, must fail held-out.
export function cheatFake(task) {
  return scripted([...fullFileEdits(task, task.cheatDir, task.cheat_files), { action_type: "run_tests", action_args: {} }]);
}

// Never edits; reads the module repeatedly until the step budget is hit.
export function budgetFake(task) {
  const target = (task.gold_files && task.gold_files[0]) || "";
  return async () => ({ action_type: "read_file", action_args: { path: target } });
}
