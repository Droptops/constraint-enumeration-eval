import fs from "fs";
import path from "path";

const manifestPath = process.env.LAB_MANIFEST;
const primaryConditionOverride = process.env.PRIMARY_CONDITION || null;

if (!manifestPath) {
  throw new Error("LAB_MANIFEST is required for frontier reports. Run eval:frontier-matrix first, then set LAB_MANIFEST=results/<frontier-lab-run>.manifest.json.");
}
const seriousControls = (process.env.SERIOUS_CONTROLS || "careful_control,constraint_axis_prompting,skill")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

const summaryPaths = readManifestSummaryPaths(manifestPath);

if (summaryPaths.length === 0) {
  throw new Error(`No summaries found in manifest: ${manifestPath}`);
}

const summaries = summaryPaths.map(summaryPath => ({
  path: summaryPath,
  summary: JSON.parse(fs.readFileSync(summaryPath, "utf8"))
}));

console.log(`# Frontier-lab report\n`);
console.log(`Manifest: ${manifestPath}`);
console.log(`Summaries: ${summaries.length}`);
console.log(`Serious controls: ${seriousControls.join(", ")}\n`);

console.log("## Run-level threshold table\n");
console.log("| run | answer | judge | primary | primary pass | strongest control | control pass | delta | CI | hard violation delta vs baseline | p50 tokens | pairwise vs strongest | verdict |");
console.log("|---|---|---|---|---:|---|---:|---:|---|---:|---:|---|---|");

const rows = [];
for (const item of summaries) {
  const row = summarizeRun(item.summary, item.path);
  rows.push(row);
  console.log(`| ${row.run_id} | ${row.answer_label} | ${row.judge_label} | ${row.primary_condition} | ${pct(row.primary_pass)} | ${row.strongest_control || ""} | ${pct(row.strongest_control_pass)} | ${pp(row.delta_vs_strongest)} | ${formatCi(row.ci_vs_strongest)} | ${pp(row.hard_violation_delta_vs_baseline)} | ${num(row.primary_p50_tokens)} | ${row.pairwise_vs_strongest} | ${row.verdict} |`);
}

console.log("\n## Lab-care thresholds\n");
console.log("| criterion | target | status |");
console.log("|---|---:|---|");
printCriterion("Any primary > strongest control by >=5pp", ">= +5pp", rows.some(row => (row.delta_vs_strongest ?? -Infinity) >= 0.05));
printCriterion("Any primary > strongest control by >=8pp", ">= +8pp", rows.some(row => (row.delta_vs_strongest ?? -Infinity) >= 0.08));
printCriterion("All judges directionally favor primary over baseline", "> 0pp", rows.every(row => (row.delta_vs_baseline ?? -Infinity) > 0));
printCriterion("No run has higher hard-constraint violation than baseline", "<= 0pp", rows.every(row => (row.hard_violation_delta_vs_baseline ?? Infinity) <= 0));
printCriterion("At least one bootstrap CI excludes zero vs strongest control", "lower > 0", rows.some(row => row.ci_vs_strongest?.lower > 0));
printCriterion("At least one pairwise win rate vs strongest control >60%", ">60%", rows.some(row => (row.pairwise_vs_strongest_rate ?? 0) > 0.6));

console.log("\n## Interpretation guardrails\n");
console.log("- Claim primary > baseline only if the baseline delta is positive under multiple judges.");
console.log("- Claim primary > careful/axis prompting only if the strongest-control delta is positive and ideally the bootstrap CI excludes zero.");
console.log("- Treat pairwise wins as perceived usefulness; treat absolute gates as strict rubric compliance.");
console.log("- For frontier-lab interest, the important number is primary vs strongest serious control, not primary vs baseline.\n");

function summarizeRun(summary, summaryPath) {
  const group = summary.absolute_summary?.global;
  if (!group) throw new Error(`Missing absolute_summary.global in ${summaryPath}`);

  const primaryCondition = primaryConditionOverride || group.primary_condition || summary.run_config?.primary_condition || "production_constraint_prompt";
  const conditions = group.conditions || {};
  const primary = conditions[primaryCondition];
  if (!primary) throw new Error(`Primary condition ${primaryCondition} not found in ${summaryPath}`);

  const availableControls = seriousControls
    .map(condition => [condition, conditions[condition]])
    .filter(([, value]) => value && typeof value.pass_rate === "number");
  const strongest = availableControls.sort((a, b) => b[1].pass_rate - a[1].pass_rate)[0] || [null, null];

  const baseline = conditions.baseline || null;
  const pairedDeltas = group.paired_condition_deltas || {};
  const strongestKey = strongest[0] ? `${primaryCondition}_minus_${strongest[0]}` : null;
  const strongestDelta = strongestKey ? pairedDeltas[strongestKey]?.pass : null;
  const baselineKey = `${primaryCondition}_minus_baseline`;
  const baselineDelta = pairedDeltas[baselineKey]?.pass || null;
  const hardViolationReductionVsBaseline = pairedDeltas[baselineKey]?.hard_constraint_violation_reduction || null;
  const pairwise = bestPairwise(summary, `${primaryCondition}_vs_${strongest[0]}`, primaryCondition);

  return {
    run_id: summary.run_id,
    answer_label: `${summary.answer_provider || summary.source_run_config?.answer_provider || "anthropic"}/${summary.model_under_test || summary.source_run_config?.answer_model || ""}`,
    judge_label: `${summary.judge_provider}/${summary.judge_model}`,
    primary_condition: primaryCondition,
    primary_pass: primary.pass_rate,
    strongest_control: strongest[0],
    strongest_control_pass: strongest[1]?.pass_rate ?? null,
    delta_vs_strongest: strongest[1] ? primary.pass_rate - strongest[1].pass_rate : null,
    ci_vs_strongest: strongestDelta?.ci95_bootstrap || null,
    delta_vs_baseline: baseline ? primary.pass_rate - baseline.pass_rate : null,
    hard_violation_delta_vs_baseline: hardViolationReductionVsBaseline?.mean_delta ?? null,
    primary_p50_tokens: primary.answer_length?.p50_approximate_tokens ?? null,
    pairwise_vs_strongest: pairwise ? `${pct(pairwise.winRate)} (${pairwise.mode})` : "",
    pairwise_vs_strongest_rate: pairwise?.winRate ?? null,
    verdict: verdict({ primary, baseline, strongest: strongest[1], deltaVsStrongest: strongest[1] ? primary.pass_rate - strongest[1].pass_rate : null, ci: strongestDelta?.ci95_bootstrap || null })
  };
}

function bestPairwise(summary, comparisonId, primaryCondition) {
  if (!comparisonId || comparisonId.endsWith("_vs_null")) return null;
  const candidates = [];

  for (const [modeName, mode] of [
    ["anchored", summary.pairwise_gold_anchored_summary],
    ["blind", summary.pairwise_gold_blind_summary]
  ]) {
    const found = mode?.by_comparison?.[comparisonId];
    if (!found || found.valid_total === 0) continue;
    const winRate = found.left_condition === primaryCondition ? found.left_win_rate : found.right_win_rate;
    candidates.push({ mode: modeName, winRate, valid: found.valid_total });
  }

  return candidates.sort((a, b) => b.winRate - a.winRate)[0] || null;
}

function verdict({ primary, baseline, strongest, deltaVsStrongest, ci }) {
  if (!baseline) return "incomplete";
  if ((primary.pass_rate - baseline.pass_rate) <= 0) return "fails baseline";
  if (!strongest) return "beats baseline only";
  if (deltaVsStrongest < 0) return "loses strongest control";
  if (ci?.lower > 0) return "strong";
  if (deltaVsStrongest >= 0.05) return "promising";
  return "thin edge";
}

function readManifestSummaryPaths(filePath) {
  const manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const baseDir = path.dirname(filePath);
  return (manifest.runs || [])
    .map(run => run.summary_json)
    .filter(Boolean)
    .map(summary => path.isAbsolute(summary) ? summary : path.resolve(baseDir, "..", summary))
    .filter(summary => fs.existsSync(summary));
}


function printCriterion(name, target, passed) {
  console.log(`| ${name} | ${target} | ${passed ? "PASS" : "not yet"} |`);
}

function pct(x) { return x === null || x === undefined || Number.isNaN(x) ? "" : `${(x * 100).toFixed(1)}%`; }
function pp(x) { return x === null || x === undefined || Number.isNaN(x) ? "" : `${(x * 100).toFixed(1)}pp`; }
function num(x) { return x === null || x === undefined || Number.isNaN(x) ? "" : String(Math.round(x)); }
function formatCi(ci) { return ci ? `[${pp(ci.lower)}, ${pp(ci.upper)}]` : ""; }
