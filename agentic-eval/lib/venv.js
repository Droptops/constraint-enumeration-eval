import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Pinned for reproducibility. The Python version is whatever creates the venv;
// it is recorded in run provenance (see toolVersions) rather than pinned here,
// because the harness cannot install interpreters.
export const PINNED_PYTEST = "8.4.2";
export const VENV_DIR = path.join(MODULE_ROOT, ".venv");

export function venvPython() {
  return process.platform === "win32"
    ? path.join(VENV_DIR, "Scripts", "python.exe")
    : path.join(VENV_DIR, "bin", "python");
}

// Idempotent: creates the venv and installs the pinned pytest on first run only.
// Network is required exactly once here (pip install); per-run test execution is
// network-denied (see sandbox.js). Returns the venv python path and recorded
// tool versions for provenance.
export function ensureVenv() {
  const python = venvPython();

  if (!fs.existsSync(python)) {
    const create = spawnSync(process.platform === "win32" ? "python" : "python3", ["-m", "venv", VENV_DIR], {
      stdio: "inherit"
    });
    if (create.status !== 0) {
      throw new Error("Failed to create venv. Ensure a base Python is on PATH.");
    }

    const install = spawnSync(python, ["-m", "pip", "install", "--quiet", `pytest==${PINNED_PYTEST}`], {
      stdio: "inherit"
    });
    if (install.status !== 0) {
      throw new Error(`Failed to install pinned pytest==${PINNED_PYTEST}.`);
    }
  }

  return { python, pinned_pytest: PINNED_PYTEST, ...toolVersions(python) };
}

export function toolVersions(python) {
  const py = spawnSync(python, ["--version"], { encoding: "utf8" });
  const pt = spawnSync(python, ["-m", "pytest", "--version"], { encoding: "utf8" });
  return {
    python_version: (py.stdout || py.stderr || "").trim(),
    pytest_version: (pt.stdout || pt.stderr || "").trim()
  };
}
