import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bootstrapCi95 } from "../../eval/lib/metrics.js";
import { computeParity, PARITY_CONSTRAINTS } from "../lib/parity.js";
import { ERROR_TAXONOMY } from "../lib/introspect.js";

// Final metrics report. Separates resolve rate (hard oracle) from clean-solve
// rate (taste gate), prints the parity number (or PENDING if human labels are
// not yet provided), and the failure taxonomy. Every number traces to a
// holdout artifact; nothing is invented.

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(MODULE_ROOT, "results", "phase4-holdout");

function readJson(p, fallback = null) {
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : fallback;
}

function mean(values) {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
}

function pct(v) {
  return v === null || v === undefined ? "n/a" : `${(v * 100).toFixed(1)}%`;
}

function cleanSolveRate(trajectories, family) {
  const labeled = trajectories.filter(t => t.judge_labels && t.judge_labels[family]);
  const clean = labeled.filter(t => t.oracle_pass === true && PARITY_CONSTRAINTS.every(k => t.judge_labels[family][k] === true));
  return { n: labeled.length, clean: clean.length, rate: labeled.length ? clean.length / labeled.length : null };
}

function main() {
  const holdout = readJson(path.join(OUT_DIR, "holdout.json"));
  const introspection = readJson(path.join(OUT_DIR, "introspection.json"), { taxonomy: { counts: {}, invalid: 0, total: 0 } });
  const humanLabelsRaw = readJson(path.join(OUT_DIR, "human-labels.json"));

  if (!holdout) {
    console.error("No holdout.json. Run `npm run build-holdout` first.");
    process.exit(1);
  }

  const trajectories = holdout.trajectories;
  const lines = [];
  lines.push("=== agentic-eval FINAL metrics report ===");
  lines.push("SCOPE: small synthetic suite; trajectories are FAKE-model (+ one real Step 0). Judge labels are REAL cross-family (OpenAI + Gemini). Not a real-model resolve-rate result.");
  lines.push("");

  // Resolve rate (hard oracle) over the holdout set.
  const oracle = trajectories.map(t => (t.oracle_pass ? 1 : 0));
  const resolveRate = mean(oracle);
  const ci = bootstrapCi95(oracle);
  lines.push("-- Resolve rate (hard oracle, held-out tests) --");
  lines.push(`n = ${trajectories.length}`);
  lines.push(`resolve_rate = ${pct(resolveRate)}` + (ci ? `  bootstrap 95% CI [${pct(ci.lower)}, ${pct(ci.upper)}]` : ""));
  lines.push("");

  // Clean-solve rate (taste gate) per judge family.
  lines.push("-- Clean-solve rate (taste gate = oracle_pass AND all five constraints) --");
  for (const family of ["openai", "google"]) {
    const cs = cleanSolveRate(trajectories, family);
    lines.push(`${family.padEnd(8)} clean_solve = ${pct(cs.rate)}  (${cs.clean}/${cs.n} labeled)`);
  }
  lines.push("NOTE: clean-solve is low here because the fake/gold trajectories fix the bug WITHOUT adding a regression test, so added_or_updated_test=false. Both judge families enforce this independently. This is the rubric working, not a bug.");
  lines.push("");

  // Parity (judge vs human).
  lines.push("-- Parity (judge labels vs YOUR human labels) --");
  if (!humanLabelsRaw) {
    lines.push("PENDING: no human-labels.json found. Copy results/phase4-holdout/label-template.json to");
    lines.push("results/phase4-holdout/human-labels.json, fill the human_labels (true/false), then re-run.");
    lines.push("The parity HARNESS is validated by `npm run prove-parity` on synthetic known labels");
    lines.push("(e.g. 3 planted disagreements -> 22/25). No human parity number is asserted until you label.");
  } else {
    const humanByTrajectory = {};
    for (const entry of humanLabelsRaw) humanByTrajectory[entry.trajectory_id] = entry.human_labels;
    for (const family of ["openai", "google"]) {
      const judgeLabels = {};
      for (const t of trajectories) if (t.judge_labels && t.judge_labels[family]) judgeLabels[t.trajectory_id] = t.judge_labels[family];
      const parity = computeParity(judgeLabels, humanByTrajectory);
      if (parity.n_cells === 0) {
        lines.push(`${family.padEnd(8)} parity = PENDING (no filled human cells)`);
      } else {
        lines.push(`${family.padEnd(8)} parity = ${parity.agree_cells}/${parity.n_cells} (${pct(parity.parity)}); skipped ${parity.skipped_unlabeled_cells} unlabeled; ${parity.disagreements.length} disagreement(s)`);
      }
    }
    lines.push("Trust is earned only to this number; it is printed, not asserted.");
  }
  lines.push("");

  // Failure taxonomy.
  lines.push("-- Failure taxonomy (introspection on failed runs) --");
  const counts = introspection.taxonomy.counts || {};
  for (const bucket of ERROR_TAXONOMY) {
    if (counts[bucket]) lines.push(`  ${bucket.padEnd(26)} ${counts[bucket]}`);
  }
  lines.push(`  (total classified: ${introspection.taxonomy.total}, invalid: ${introspection.taxonomy.invalid})`);

  const report = lines.join("\n");
  console.log(report);
  fs.writeFileSync(path.join(OUT_DIR, "final-report.txt"), report + "\n");
  console.log(`\nWrote ${path.relative(MODULE_ROOT, path.join(OUT_DIR, "final-report.txt"))}`);
}

main();
