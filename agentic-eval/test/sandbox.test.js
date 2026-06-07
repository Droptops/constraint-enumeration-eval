import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ensureVenv } from "../lib/venv.js";
import { createSandbox, cleanupSandbox, resolveInSandbox, runPytest, SandboxPathError } from "../lib/sandbox.js";

const venv = ensureVenv();

function tempTask(files, manifest = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agentic-eval-fixture-"));
  const workspaceDir = path.join(dir, "workspace");
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(workspaceDir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return { task: { taskDir: dir, workspaceDir, fail_to_pass: [], pass_to_pass: [], ...manifest }, dir };
}

test("resolveInSandbox allows in-sandbox paths and blocks escapes", () => {
  const { task, dir } = tempTask({ "a.py": "x = 1\n" });
  const sandbox = createSandbox({ task, python: venv.python });
  try {
    assert.ok(resolveInSandbox(sandbox.root, "a.py").startsWith(sandbox.root));
    assert.throws(() => resolveInSandbox(sandbox.root, "../escape.py"), SandboxPathError);
    assert.throws(() => resolveInSandbox(sandbox.root, "../../escape.py"), SandboxPathError);
    assert.throws(() => resolveInSandbox(sandbox.root, "sub/../../escape.py"), SandboxPathError);
    assert.throws(() => resolveInSandbox(sandbox.root, path.join(os.tmpdir(), "abs.py")), SandboxPathError);
  } finally {
    cleanupSandbox(sandbox);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveInSandbox blocks symlink/junction escapes", () => {
  const { task, dir } = tempTask({ "a.py": "x = 1\n" });
  const sandbox = createSandbox({ task, python: venv.python });
  const secretDir = fs.mkdtempSync(path.join(os.tmpdir(), "agentic-eval-secret-"));
  fs.writeFileSync(path.join(secretDir, "secret.txt"), "top secret");

  let linked = true;
  try {
    // "junction" works on Windows without admin; falls back fine on POSIX.
    fs.symlinkSync(secretDir, path.join(sandbox.root, "link"), "junction");
  } catch {
    linked = false;
  }

  try {
    if (linked) {
      assert.throws(() => resolveInSandbox(sandbox.root, "link/secret.txt"), SandboxPathError);
    } else {
      console.log("  (symlink creation unavailable; skipped escape assertion)");
    }
  } finally {
    cleanupSandbox(sandbox);
    fs.rmSync(secretDir, { recursive: true, force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("sandbox is an isolated copy; edits do not touch the task workspace", () => {
  const { task, dir } = tempTask({ "a.py": "original\n" });
  const sandbox = createSandbox({ task, python: venv.python });
  try {
    fs.writeFileSync(path.join(sandbox.root, "a.py"), "modified\n");
    assert.equal(fs.readFileSync(path.join(task.workspaceDir, "a.py"), "utf8"), "original\n");
  } finally {
    cleanupSandbox(sandbox);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("runPytest enforces the wall-clock timeout on a hanging test", () => {
  const { task, dir } = tempTask(
    { "tests/test_hang.py": "def test_hang():\n    while True:\n        pass\n" },
    { fail_to_pass: ["tests/test_hang.py::test_hang"] }
  );
  const sandbox = createSandbox({ task, python: venv.python, timeoutMs: 4000 });
  try {
    const r = runPytest(sandbox, ["tests/test_hang.py::test_hang"]);
    assert.equal(r.timedOut, true);
    assert.equal(r.passed, false);
  } finally {
    cleanupSandbox(sandbox);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("runPytest enforces the output-size cap", () => {
  const many = Array.from({ length: 500 }, (_, i) => `def test_fail_${i}():\n    assert False\n`).join("\n");
  const { task, dir } = tempTask({ "tests/test_spam.py": many }, {});
  const sandbox = createSandbox({ task, python: venv.python, timeoutMs: 30000, outputCapBytes: 30000 });
  try {
    const r = runPytest(sandbox, ["tests/test_spam.py"]);
    assert.equal(r.outputCapExceeded, true);
    assert.equal(r.passed, false);
  } finally {
    cleanupSandbox(sandbox);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("runPytest denies in-process network access", () => {
  const { task, dir } = tempTask({
    "tests/test_net.py":
      "import socket\n\n\ndef test_net():\n    socket.create_connection(('example.com', 80), timeout=2)\n"
  });
  const sandbox = createSandbox({ task, python: venv.python, timeoutMs: 15000 });
  try {
    const r = runPytest(sandbox, ["tests/test_net.py::test_net"]);
    assert.equal(r.passed, false);
    assert.match(r.stdout + r.stderr, /network access denied/);
  } finally {
    cleanupSandbox(sandbox);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
