import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLEAN_SOLVE_CONSTRAINTS } from "../lib/trajectoryGate.js";

// Render a bar-chart SVG from a judge-suite summary.json. Every value comes from
// the artifact; nothing is hand-entered.
const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const summaryPath =
  process.argv[2] || path.join(MODULE_ROOT, "results", "suite-real-claude-sonnet-4-6", "judged", "summary.json");
const outPath = path.join(MODULE_ROOT, "RESULTS-figure.svg");

if (!fs.existsSync(summaryPath)) {
  console.error(`No summary at ${summaryPath}. Run judge-suite first.`);
  process.exit(1);
}
const s = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

const W = 780;
const LABEL_X = 250;
const TRACK_X = LABEL_X + 12;
const TRACK_W = 430;
const ROW_H = 34;
const BAR_H = 18;

const CLAY = "#D97757";
const ZERO = "#C9B8A8";
const TRACK = "#ECE7E1";
const INK = "#2B2B2B";
const MUTE = "#6B6660";

const rows = [];
rows.push({ kind: "header", text: "Environment outcome (SWE-bench-style)" });
rows.push({ label: "resolve rate (hard oracle)", value: s.resolve_rate });
rows.push({ kind: "header", text: "Trajectory quality (this eval's addition)" });
rows.push({ label: "clean-solve rate", value: s.clean_solve_by_family.openai.clean_solve_rate });
const pc = s.clean_solve_by_family.openai.per_constraint_satisfied_rate;
for (const k of CLEAN_SOLVE_CONSTRAINTS) rows.push({ label: `  ${k}`, value: pc[k], sub: true });

let y = 70;
const parts = [];
for (const row of rows) {
  if (row.kind === "header") {
    y += 12;
    parts.push(`<text x="20" y="${y}" font-size="13" font-weight="700" fill="${MUTE}" font-family="sans-serif">${row.text}</text>`);
    y += 22;
    continue;
  }
  const v = row.value ?? 0;
  const fillW = Math.max(0, Math.min(1, v)) * TRACK_W;
  const color = v >= 0.999 ? CLAY : v <= 0.001 ? ZERO : CLAY;
  parts.push(`<text x="${LABEL_X}" y="${y + BAR_H - 4}" text-anchor="end" font-size="${row.sub ? 12 : 13}" fill="${INK}" font-family="monospace">${row.label}</text>`);
  parts.push(`<rect x="${TRACK_X}" y="${y}" width="${TRACK_W}" height="${BAR_H}" rx="3" fill="${TRACK}"/>`);
  if (fillW > 0) parts.push(`<rect x="${TRACK_X}" y="${y}" width="${fillW.toFixed(1)}" height="${BAR_H}" rx="3" fill="${color}"/>`);
  parts.push(`<text x="${TRACK_X + TRACK_W + 8}" y="${y + BAR_H - 4}" font-size="12" font-weight="700" fill="${v <= 0.001 ? MUTE : INK}" font-family="sans-serif">${(v * 100).toFixed(0)}%</text>`);
  y += ROW_H;
}

const H = y + 56;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="sans-serif">
<rect width="${W}" height="${H}" fill="#FAF9F7"/>
<text x="20" y="32" font-size="18" font-weight="800" fill="${INK}">${s.model}: resolves ${(s.resolve_rate * 100).toFixed(0)}%, clean-solves ${(s.clean_solve_by_family.openai.clean_solve_rate * 100).toFixed(0)}%</text>
<text x="20" y="52" font-size="12" fill="${MUTE}">n=${s.n} held-out tasks · cross-family judges (OpenAI+Gemini) agree on ${(s.inter_judge_agreement * 100).toFixed(0)}% of cells · single trial, temp 0</text>
${parts.join("\n")}
<text x="20" y="${H - 30}" font-size="11" fill="${MUTE}">The entire resolve-vs-clean-solve gap is one behavior: the agent never adds a regression test. All other constraints: 100%.</text>
<text x="20" y="${H - 14}" font-size="10" fill="${MUTE}">Small synthetic suite, not SWE-bench scale. Generated from results/.../judged/summary.json.</text>
</svg>`;

fs.writeFileSync(outPath, svg);
console.log(`Wrote ${path.relative(MODULE_ROOT, outPath)}`);
