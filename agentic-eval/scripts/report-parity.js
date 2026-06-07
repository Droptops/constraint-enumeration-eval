import fs from "node:fs";
import { computeParity, PARITY_CONSTRAINTS } from "../lib/parity.js";

// Compute judge-vs-human parity from the stored judge labels and your filled
// human labels. Prints the number; trust is earned only to what it shows.
// Usage:
//   node scripts/report-parity.js <parity-judge-labels.json> <parity-human-labels.json>

const judgePath = process.argv[2];
const humanPath = process.argv[3];
if (!judgePath || !fs.existsSync(judgePath) || !humanPath || !fs.existsSync(humanPath)) {
  console.error("Usage: node scripts/report-parity.js <parity-judge-labels.json> <parity-human-labels.json>");
  process.exit(1);
}

// Tolerate a UTF-8 BOM, which some editors add when you hand-edit the labels.
const readJson = p => JSON.parse(fs.readFileSync(p, "utf8").replace(/^﻿/, ""));
const judgeLabels = readJson(judgePath); // { tid: { openai:{...}, google:{...} } }
const humanArr = readJson(humanPath); // [ { trajectory_id, human_labels } ]
const humanByTrajectory = {};
for (const entry of humanArr) humanByTrajectory[entry.trajectory_id] = entry.human_labels;

function pct(v) {
  return v === null ? "n/a" : `${(v * 100).toFixed(1)}%`;
}

console.log("=== Judge-vs-human parity (printed, not asserted as trust) ===");
for (const family of ["openai", "google"]) {
  const judgeForFamily = {};
  for (const [tid, fams] of Object.entries(judgeLabels)) {
    if (fams[family]) judgeForFamily[tid] = fams[family];
  }
  const p = computeParity(judgeForFamily, humanByTrajectory);
  console.log(
    `\n${family}: parity = ${p.agree_cells}/${p.n_cells} (${pct(p.parity)}) over ${p.n_trajectories} labeled trajectories; ` +
      `${p.skipped_unlabeled_cells} cells left blank; ${p.disagreements.length} disagreement(s)`
  );
  for (const k of PARITY_CONSTRAINTS) {
    const c = p.per_constraint[k];
    console.log(`  ${k.padEnd(24)} ${c.agree}/${c.total} (${pct(c.parity)})`);
  }
  for (const d of p.disagreements) {
    console.log(`  DISAGREE ${d.trajectory_id} :: ${d.constraint}: judge=${d.judge} human=${d.human}`);
  }
}
