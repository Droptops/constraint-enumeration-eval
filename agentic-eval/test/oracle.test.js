import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureVenv } from "../lib/venv.js";
import { loadTask } from "../lib/tasks.js";
import { createSandbox, cleanupSandbox } from "../lib/sandbox.js";
import { runOracle } from "../lib/oracle.js";

const venv = ensureVenv();
const TASK_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "tasks", "one_line_bug");

test("oracle fails on the unmodified buggy workspace", () => {
  const task = loadTask(TASK_DIR);
  const sandbox = createSandbox({ task, python: venv.python });
  try {
    const r = runOracle(sandbox);
    assert.equal(r.oracle_pass, false);
  } finally {
    cleanupSandbox(sandbox);
  }
});

test("oracle passes after the gold fix is applied", () => {
  const task = loadTask(TASK_DIR);
  const sandbox = createSandbox({ task, python: venv.python });
  try {
    const file = path.join(sandbox.root, "mathutils.py");
    fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("return a - b", "return a + b"));
    const r = runOracle(sandbox);
    assert.equal(r.oracle_pass, true);
  } finally {
    cleanupSandbox(sandbox);
  }
});
