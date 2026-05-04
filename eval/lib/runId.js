const RUN_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

export function makeTimestampRunId(prefix = "run") {
  return `${prefix}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

export function validateRunId(runId, label = "runId") {
  if (typeof runId !== "string" || runId.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  if (runId.length > 160) {
    throw new Error(`${label} must be 160 characters or fewer.`);
  }

  if (!RUN_ID_PATTERN.test(runId)) {
    throw new Error(`${label} may only contain letters, numbers, dots, underscores, and hyphens.`);
  }

  if (runId === "." || runId === ".." || runId.includes("..")) {
    throw new Error(`${label} may not contain path traversal segments.`);
  }

  return runId;
}
