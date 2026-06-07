import fs from "node:fs";
import path from "node:path";
import { sha256, stableJson } from "../../eval/lib/hash.js";
import { bootstrapCi95 } from "../../eval/lib/metrics.js";
import { createSandbox, cleanupSandbox } from "./sandbox.js";
import { defaultTools } from "./tools.js";
import { runAgent } from "./agent.js";
import { scoreFinalState } from "./oracle.js";
import { fileURLToPath } from "node:url";

const LIB_DIR = path.dirname(fileURLToPath(import.meta.url));
let cachedHarnessHash = null;

// Hash of all behavior-determining harness source (lib/*.js + the netblock
// sitecustomize). Folded into the run-config hash so a change to the agent loop,
// agent client, sandbox, oracle, tools, judge, or runner invalidates cached rows
// on resume. Without this, edits to the prompt/tool schema/sandbox/output cap/
// model params could be silently "hash-verified" and preserve stale metrics.
export function harnessHash() {
  if (cachedHarnessHash) return cachedHarnessHash;
  const parts = fs
    .readdirSync(LIB_DIR)
    .filter(name => name.endsWith(".js"))
    .sort()
    .map(name => ({ name, content: fs.readFileSync(path.join(LIB_DIR, name), "utf8") }));
  const netblock = path.join(LIB_DIR, "netblock", "sitecustomize.py");
  if (fs.existsSync(netblock)) {
    parts.push({ name: "netblock/sitecustomize.py", content: fs.readFileSync(netblock, "utf8") });
  }
  cachedHarnessHash = sha256(stableJson(parts));
  return cachedHarnessHash;
}

export function runConfigHash(task, modelId, pinnedPytest, trial = 0) {
  return sha256(
    stableJson({
      task_id: task.task_id,
      content_sha256: task.content_sha256,
      model_id: modelId,
      trial,
      step_budget: task.step_budget,
      test_timeout_seconds: task.test_timeout_seconds,
      pinned_pytest: pinnedPytest,
      harness_sha256: harnessHash()
    })
  );
}

// Resumable suite runner. `model` = { make(task) -> callModel, id(task) -> string, seed }.
// Appends one JSON line per task to resultsPath. On rerun with the same
// resultsPath, a completed task is reused ONLY if content_sha256,
// run_config_sha256, and model_id all match; otherwise it is recomputed.
// `limit` caps how many tasks are newly computed this invocation (used to
// simulate a mid-run kill for the resume proof).
export async function runSuite({ tasks, model, venv, resultsPath, limit = Infinity, trial = 0, log = () => {} }) {
  const byKey = new Map(readResults(resultsPath).map(row => [`${row.task_id}#${row.trial ?? 0}`, row]));
  const results = [];
  let computed = 0;
  let skipped = 0;

  for (const task of tasks) {
    const modelId = model.id(task);
    const runConfigSha = runConfigHash(task, modelId, venv.pinned_pytest, trial);
    const key = `${task.task_id}#${trial}`;
    const prior = byKey.get(key);

    if (prior && isReusable(prior, task, modelId, runConfigSha)) {
      results.push(prior);
      skipped += 1;
      log(`skip      ${task.task_id} (hash-verified)`);
      continue;
    }
    if (prior) {
      log(`recompute ${task.task_id} (integrity mismatch: ${mismatchReason(prior, task, modelId, runConfigSha)})`);
    }
    if (computed >= limit) {
      log(`stop      limit=${limit} reached before ${task.task_id}`);
      break;
    }

    const row = await runOne(task, model, venv, modelId, runConfigSha, trial);
    appendResult(resultsPath, row);
    byKey.set(key, row);
    results.push(row);
    computed += 1;
    log(`done      ${task.task_id} resolve=${row.score.resolve} visible=${row.score.visible_pass} disc=${row.score.discrimination}`);
  }

  return { results, computed, skipped, metrics: computeMetrics(results) };
}

async function runOne(task, model, venv, modelId, runConfigSha, trial = 0) {
  const sandbox = createSandbox({
    task,
    python: venv.python,
    timeoutMs: (task.test_timeout_seconds || 30) * 1000,
    outputCapBytes: 1_000_000
  });
  try {
    const agent = await runAgent({ callModel: model.make(task), sandbox, tools: defaultTools, stepBudget: task.step_budget });
    const score = scoreFinalState(sandbox, task);
    return {
      task_id: task.task_id,
      trial,
      bug_type: task.bug_type || null,
      model_id: modelId,
      seed: model.seed ?? null,
      workspace_sha256: task.workspace_sha256,
      content_sha256: task.content_sha256,
      run_config_sha256: runConfigSha,
      harness_sha256: harnessHash(),
      python_version: venv.python_version,
      pytest_version: venv.pytest_version,
      outcome: agent.solved ? "solved" : "unsolved",
      loop_stop_reason: agent.stop_reason,
      step_count: agent.steps.length,
      score,
      trajectory: agent.steps
    };
  } finally {
    cleanupSandbox(sandbox);
  }
}

function isReusable(prior, task, modelId, runConfigSha) {
  return prior.content_sha256 === task.content_sha256 && prior.run_config_sha256 === runConfigSha && prior.model_id === modelId;
}

function mismatchReason(prior, task, modelId, runConfigSha) {
  if (prior.content_sha256 !== task.content_sha256) return "content_sha256";
  if (prior.model_id !== modelId) return "model_id";
  if (prior.run_config_sha256 !== runConfigSha) return "run_config_sha256";
  return "unknown";
}

export function computeMetrics(results) {
  const n = results.length;
  const resolves = results.map(r => (r.score.resolve ? 1 : 0));
  const visibles = results.map(r => (r.score.visible_pass ? 1 : 0));
  const discriminated = results.filter(r => r.score.discrimination).length;
  const resolveRate = n ? mean(resolves) : null;
  const visibleOnlyRate = n ? mean(visibles) : null;
  const heldoutDoesWork = discriminated > 0 || resolveRate !== visibleOnlyRate;

  return {
    n,
    resolve_rate: resolveRate,
    resolve_rate_ci95_bootstrap: bootstrapCi95(resolves),
    visible_only_rate: visibleOnlyRate,
    discrimination_count: discriminated,
    discrimination_rate: n ? discriminated / n : null,
    // Pre-registered falsification: held-out scoring must diverge from
    // visible-only scoring somewhere, or the held-out set is doing no work.
    heldout_does_work: heldoutDoesWork,
    overfittable_flag: !heldoutDoesWork,
    per_task: results.map(r => ({
      task_id: r.task_id,
      resolve: r.score.resolve,
      visible_pass: r.score.visible_pass,
      discrimination: r.score.discrimination
    }))
  };
}

function readResults(resultsPath) {
  if (!fs.existsSync(resultsPath)) return [];
  return fs.readFileSync(resultsPath, "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line));
}

function appendResult(resultsPath, row) {
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
  fs.appendFileSync(resultsPath, JSON.stringify(row) + "\n");
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
