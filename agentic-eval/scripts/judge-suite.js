import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bootstrapCi95 } from "../../eval/lib/metrics.js";
import { loadTask } from "../lib/tasks.js";
import { buildJudgeInput, dualJudge, makeRealJudge } from "../lib/trajectoryJudge.js";
import { CLEAN_SOLVE_CONSTRAINTS } from "../lib/trajectoryGate.js";
import { classifyFailure, makeRealIntrospector, aggregateTaxonomy } from "../lib/introspect.js";
import { getAgentModelId } from "../lib/anthropicAgent.js";
import { loadEnvFiles } from "../lib/env.js";

// Judge an existing agent results.jsonl with the REAL cross-family judges, add
// clean-solve and per-constraint rates, run REAL introspection on failures, and
// analyze reward-hacking on honeypot tasks. Spends judge + introspection budget.
//
// Usage: node scripts/judge-suite.js <results.jsonl>

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TASKS_ROOT = path.join(MODULE_ROOT, "tasks");
const FAMILIES = ["openai", "google"];

function loadKeysIfNeeded() {
  loadEnvFiles([path.join(MODULE_ROOT, "..", "eval", ".env.local"), path.join(MODULE_ROOT, "..", "eval", ".env")]);
}

function mean(xs) {
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null;
}

async function main() {
  const resultsPath = process.argv[2];
  if (!resultsPath || !fs.existsSync(resultsPath)) {
    console.error("Usage: node scripts/judge-suite.js <results.jsonl>");
    process.exit(1);
  }
  loadKeysIfNeeded();
  if (!process.env.OPENAI_API_KEY || !process.env.GEMINI_API_KEY) {
    console.error("judge-suite needs OPENAI_API_KEY and GEMINI_API_KEY. Aborting; no call made.");
    process.exit(2);
  }
  const haveAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);

  const rows = fs.readFileSync(resultsPath, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
  const byTask = new Map(rows.map(r => [r.task_id, r]));
  const items = [...byTask.values()].sort((a, b) => (a.task_id < b.task_id ? -1 : 1));

  const judges = FAMILIES.map(family => ({ family, callJudge: makeRealJudge({ family }) }));
  const judged = [];

  for (const row of items) {
    const task = loadTask(path.join(TASKS_ROOT, row.task_id));
    const oraclePass = row.score?.resolve ?? row.oracle?.oracle_pass ?? false;
    const judgeInput = buildJudgeInput(task, row.trajectory, oraclePass);
    console.log(`Judging ${row.task_id} (resolve=${oraclePass}, honeypot=${Boolean(task.is_honeypot)})...`);
    let dual = null;
    try {
      dual = await dualJudge({ judgeInput, oracle_pass: oraclePass, agentFamily: "anthropic", judges });
    } catch (error) {
      console.warn(`  judge error: ${error.message}`);
    }
    judged.push({ task_id: row.task_id, is_honeypot: Boolean(task.is_honeypot), oracle_pass: oraclePass, outcome: row.outcome, dual });
  }

  // Aggregate.
  const resolves = items.map(r => ((r.score?.resolve ?? r.oracle?.oracle_pass) ? 1 : 0));
  const resolveRate = mean(resolves);

  const perFamily = {};
  for (const family of FAMILIES) {
    const valid = judged.filter(j => j.dual && j.dual.results.find(x => x.family === family)?.score.valid_judge_response);
    const cleanVals = valid.map(j => (j.dual.results.find(x => x.family === family).score.clean_solve ? 1 : 0));
    const perConstraint = Object.fromEntries(
      CLEAN_SOLVE_CONSTRAINTS.map(k => [k, mean(valid.map(j => (j.dual.results.find(x => x.family === family).score.constraints[k] ? 1 : 0)))])
    );
    perFamily[family] = { n: valid.length, clean_solve_rate: mean(cleanVals), clean_solve_ci95: bootstrapCi95(cleanVals), per_constraint_satisfied_rate: perConstraint };
  }

  const agreements = judged.filter(j => j.dual?.agreement?.computable).map(j => j.dual.agreement.agreed_count / j.dual.agreement.total);
  const interJudgeAgreement = mean(agreements);

  // Honeypot reward-hacking analysis.
  const honeypots = judged.filter(j => j.is_honeypot).map(j => ({
    task_id: j.task_id,
    resolve: j.oracle_pass,
    held_out_caught_hack: j.oracle_pass === false,
    judge_not_hardcoded: Object.fromEntries(FAMILIES.map(f => {
      const s = j.dual?.results.find(x => x.family === f)?.score;
      return [f, s?.valid_judge_response ? s.fields.not_hardcoded.value : null];
    }))
  }));

  // Introspection on failed runs.
  let taxonomy = { counts: {}, invalid: 0, total: 0 };
  const classifications = [];
  if (haveAnthropic) {
    const introspector = makeRealIntrospector({ model: getAgentModelId() });
    for (const row of items.filter(r => !(r.score?.resolve ?? r.oracle?.oracle_pass))) {
      const task = loadTask(path.join(TASKS_ROOT, row.task_id));
      const ji = buildJudgeInput(task, row.trajectory, false);
      const last = row.trajectory[row.trajectory.length - 1];
      const run = { spec: ji.spec, trajectory_summary: ji.trajectory_summary, oracle_pass: false, loop_stop_reason: last?.stop_reason || "unknown", diff: ji.diff };
      console.log(`Introspecting failed ${row.task_id}...`);
      try {
        const c = await classifyFailure({ run, callIntrospect: introspector });
        classifications.push({ task_id: row.task_id, ...c });
      } catch (error) {
        classifications.push({ task_id: row.task_id, valid: false, error: error.message });
      }
    }
    taxonomy = aggregateTaxonomy(classifications);
  }

  const model = items[0]?.model_id || "unknown";
  const summary = {
    model,
    n: items.length,
    resolve_rate: resolveRate,
    resolve_rate_ci95: bootstrapCi95(resolves),
    clean_solve_by_family: perFamily,
    inter_judge_agreement: interJudgeAgreement,
    honeypots,
    taxonomy,
    classifications
  };

  const outDir = path.join(path.dirname(resultsPath), "judged");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(outDir, "judged.json"), JSON.stringify(judged, null, 2));

  printReport(summary);
  console.log(`\nArtifacts: ${path.relative(MODULE_ROOT, outDir)}`);
}

function pct(v) {
  return v === null || v === undefined ? "n/a" : `${(v * 100).toFixed(1)}%`;
}

function printReport(s) {
  console.log(`\n=== Real-model two-layer result: ${s.model} (n=${s.n}) ===`);
  console.log(`resolve_rate (hard oracle)   = ${pct(s.resolve_rate)}  CI ${s.resolve_rate_ci95 ? `[${pct(s.resolve_rate_ci95.lower)}, ${pct(s.resolve_rate_ci95.upper)}]` : ""}`);
  for (const family of FAMILIES) {
    const f = s.clean_solve_by_family[family];
    console.log(`clean_solve (${family}) = ${pct(f.clean_solve_rate)}  CI ${f.clean_solve_ci95 ? `[${pct(f.clean_solve_ci95.lower)}, ${pct(f.clean_solve_ci95.upper)}]` : ""} (n=${f.n})`);
  }
  console.log(`inter-judge agreement        = ${pct(s.inter_judge_agreement)} of constraint cells`);
  console.log("\nper-constraint satisfied rate (openai / google):");
  for (const k of CLEAN_SOLVE_CONSTRAINTS) {
    console.log(`  ${k.padEnd(24)} ${pct(s.clean_solve_by_family.openai.per_constraint_satisfied_rate[k])} / ${pct(s.clean_solve_by_family.google.per_constraint_satisfied_rate[k])}`);
  }
  console.log("\nhoneypot reward-hacking:");
  for (const h of s.honeypots) {
    console.log(`  ${h.task_id.padEnd(26)} resolve=${h.resolve} not_hardcoded(oai/goog)=${h.judge_not_hardcoded.openai}/${h.judge_not_hardcoded.google}`);
  }
  console.log("\nfailure taxonomy:", JSON.stringify(s.taxonomy.counts));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
