import fs from "node:fs";
import path from "node:path";
import { GATE_VARIANTS, gateVariants } from "../lib/trajectoryGate.js";

// Compute clean-solve under every gate variant, per judge family, from an
// existing judge-suite judged.json. Recomputes from oracle_pass + constraints,
// so it works on already-recorded runs (no API). Shows the verdict is a
// decomposable sensitivity table, not one brittle number.
//
// Usage: node scripts/report-variants.js <judged.json>

const judgedPath = process.argv[2];
if (!judgedPath || !fs.existsSync(judgedPath)) {
  console.error("Usage: node scripts/report-variants.js <judged.json>");
  process.exit(1);
}

const judged = JSON.parse(fs.readFileSync(judgedPath, "utf8"));
const FAMILIES = ["openai", "google"];

function mean(xs) {
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null;
}
function pct(v) {
  return v === null ? "n/a" : `${(v * 100).toFixed(1)}%`;
}

const variantNames = Object.keys(GATE_VARIANTS);
const table = {};
for (const family of FAMILIES) {
  const rows = judged
    .map(item => item.dual?.results?.find(r => r.family === family)?.score)
    .filter(score => score && score.valid_judge_response);
  table[family] = {
    n: rows.length,
    variants: Object.fromEntries(
      variantNames.map(name => [name, mean(rows.map(score => (gateVariants(score.oracle_pass, score.constraints)[name] ? 1 : 0)))])
    )
  };
}

console.log(`=== Clean-solve by gate variant (${path.basename(path.dirname(judgedPath))}) ===`);
console.log("variant".padEnd(22) + FAMILIES.map(f => f.padEnd(10)).join(""));
for (const name of variantNames) {
  console.log(name.padEnd(22) + FAMILIES.map(f => pct(table[f].variants[name]).padEnd(10)).join(""));
}
console.log("\nconstraints per variant:");
for (const [name, keys] of Object.entries(GATE_VARIANTS)) console.log(`  ${name.padEnd(20)} ${keys.join(", ")}`);

const outPath = path.join(path.dirname(judgedPath), "variants.json");
fs.writeFileSync(outPath, JSON.stringify({ gate_variants: GATE_VARIANTS, by_family: table }, null, 2));
console.log(`\nWrote ${outPath}`);
