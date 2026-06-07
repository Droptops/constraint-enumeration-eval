import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const NETBLOCK_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "netblock");

export class SandboxPathError extends Error {}

// Copy the task workspace into a fresh temp dir. The agent only ever reads,
// edits, and runs tests inside this copy — never the original task files or the
// repo. cleanupSandbox removes it.
export function createSandbox({ task, python, timeoutMs = 30000, outputCapBytes = 1_000_000 }) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "agentic-eval-")));
  fs.cpSync(task.workspaceDir, root, { recursive: true });
  return { root, task, python, timeoutMs, outputCapBytes };
}

export function cleanupSandbox(sandbox) {
  // Best-effort. maxRetries/retryDelay handles the common Windows race where a
  // just-killed test subprocess (timeout / output-cap) or an AV scanner still
  // holds handles on the temp dir for a moment after the process exits. If it
  // still cannot be removed, the dir lives under the OS temp root and will be
  // reclaimed — warn rather than crash the run over cleanup.
  try {
    fs.rmSync(sandbox.root, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
  } catch (error) {
    console.warn(`cleanupSandbox: could not remove ${sandbox.root} (${error.code}); leaving for OS temp reaper.`);
  }
}

// Resolve a model-supplied relative path and prove it stays inside the sandbox.
// Blocks absolute paths, "..", and symlink escapes (via realpath on anything
// that already exists).
export function resolveInSandbox(root, relPath) {
  if (typeof relPath !== "string" || relPath.length === 0) {
    throw new SandboxPathError("path must be a non-empty string");
  }
  if (path.isAbsolute(relPath)) {
    throw new SandboxPathError(`absolute paths are not allowed: ${relPath}`);
  }

  const realRoot = fs.realpathSync(root);
  const rootPrefix = realRoot.endsWith(path.sep) ? realRoot : realRoot + path.sep;
  const resolved = path.resolve(realRoot, relPath);
  const real = fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;

  if (real !== realRoot && !real.startsWith(rootPrefix)) {
    throw new SandboxPathError(`path escapes sandbox: ${relPath}`);
  }
  return resolved;
}

// Run pytest on the given node ids inside the sandbox as an isolated subprocess.
// Enforces a wall-clock timeout (process killed) and an output-size cap
// (process killed once exceeded), and denies in-process network access by
// prepending the netblock sitecustomize to PYTHONPATH. The sandbox root is also
// on PYTHONPATH so top-level task modules import cleanly.
export function runPytest(sandbox, targets) {
  const env = {
    ...process.env,
    PYTHONPATH: [NETBLOCK_DIR, sandbox.root, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
    PYTHONDONTWRITEBYTECODE: "1",
    HTTP_PROXY: "",
    HTTPS_PROXY: "",
    http_proxy: "",
    https_proxy: ""
  };

  const result = spawnSync(sandbox.python, ["-m", "pytest", "-q", "-p", "no:cacheprovider", ...targets], {
    cwd: sandbox.root,
    env,
    encoding: "utf8",
    timeout: sandbox.timeoutMs,
    maxBuffer: sandbox.outputCapBytes,
    killSignal: "SIGKILL"
  });

  const timedOut = result.error?.code === "ETIMEDOUT";
  const outputCapExceeded = result.error?.code === "ENOBUFS" || /maxBuffer/i.test(result.error?.message || "");
  const passed = result.status === 0 && !timedOut && !outputCapExceeded;

  return {
    passed,
    returncode: result.status,
    timedOut,
    outputCapExceeded,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}
