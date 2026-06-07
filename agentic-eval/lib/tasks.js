import fs from "node:fs";
import path from "node:path";
import { sha256, stableJson } from "../../eval/lib/hash.js";

// Load a task directory. Two provenance hashes are computed:
//   workspace_sha256 — the snapshot the AGENT sees (workspace/ only).
//   content_sha256   — the FULL task definition (manifest + workspace + heldout
//                      + gold), used by the runner's resume integrity check.
// The held-out tests live in heldout/ and are NEVER part of the agent's
// workspace copy; they are injected only at oracle time.
export function loadTask(taskDir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(taskDir, "task.json"), "utf8"));
  const workspaceDir = path.join(taskDir, "workspace");
  const heldoutDir = path.join(taskDir, "heldout");
  const goldDir = path.join(taskDir, "gold");
  const cheatDir = path.join(taskDir, "cheat");

  const task = {
    ...manifest,
    taskDir,
    workspaceDir,
    heldoutDir: fs.existsSync(heldoutDir) ? heldoutDir : null,
    goldDir: fs.existsSync(goldDir) ? goldDir : null,
    cheatDir: fs.existsSync(cheatDir) ? cheatDir : null,
    workspace_sha256: hashDir(workspaceDir)
  };

  task.content_sha256 = sha256(
    stableJson({
      manifest,
      workspace: dirEntries(workspaceDir),
      heldout: task.heldoutDir ? dirEntries(task.heldoutDir) : [],
      gold: task.goldDir ? dirEntries(task.goldDir) : [],
      // cheat/ is consumed by the fake-cheat proof; include it so editing a
      // planted cheat patch invalidates cached fake-cheat results.
      cheat: task.cheatDir ? dirEntries(task.cheatDir) : []
    })
  );

  return task;
}

// Load every task directory under tasksRoot, optionally filtered by schema
// version. Returns tasks sorted by task_id for deterministic ordering.
export function loadAllTasks(tasksRoot, { schemaVersion } = {}) {
  return fs
    .readdirSync(tasksRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(tasksRoot, entry.name, "task.json")))
    .map(entry => loadTask(path.join(tasksRoot, entry.name)))
    .filter(task => (schemaVersion ? task.schema_version === schemaVersion : true))
    .sort((a, b) => (a.task_id < b.task_id ? -1 : 1));
}

function hashDir(dir) {
  return sha256(stableJson(dirEntries(dir)));
}

function dirEntries(dir) {
  return listFiles(dir)
    .map(file => ({
      path: path.relative(dir, file).split(path.sep).join("/"),
      content: fs.readFileSync(file, "utf8")
    }))
    .sort((a, b) => (a.path < b.path ? -1 : 1));
}

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}
