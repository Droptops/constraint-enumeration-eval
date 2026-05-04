import fs from "fs";

const summaryPath = process.env.SUMMARY;
if (!summaryPath) throw new Error("Set SUMMARY=results/<run>.summary.json");
const s = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const group = s.absolute_summary?.global;

if (!group) throw new Error("Summary is missing absolute_summary.global");

console.log(`# Eval summary: ${s.run_id}\n`);
console.log(`Answer model: ${s.model_under_test}`);
console.log(`Judge: ${s.judge_provider}/${s.judge_model}`);
console.log(`Cases: ${s.num_cases}; trials: ${s.num_trials_per_condition}`);
console.log(`Primary condition: ${group.primary_condition || s.run_config?.primary_condition || ""}\n`);

console.log("## Absolute pass rates\n");
console.log("| condition | pass | hard violation | unnecessary clarification | over-enum | p50 tokens | p90 tokens |");
console.log("|---|---:|---:|---:|---:|---:|---:|");
for (const [condition, v] of Object.entries(group.conditions)) {
  console.log(`| ${condition} | ${pct(v.pass_rate)} | ${pct(v.hard_constraint_violation_rate)} | ${pct(v.unnecessary_clarification_rate)} | ${pct(v.over_enumeration_rate)} | ${num(v.answer_length?.p50_approximate_tokens)} | ${num(v.answer_length?.p90_approximate_tokens)} |`);
}

console.log("\n## Length-quartile pass rates\n");
console.log("| condition | quartile | n | token range | pass |");
console.log("|---|---:|---:|---:|---:|");
for (const [condition, v] of Object.entries(group.conditions)) {
  for (const bucket of v.pass_rate_by_answer_length_quartile || []) {
    console.log(`| ${condition} | Q${bucket.quartile} | ${bucket.n} | ${num(bucket.min_approximate_tokens)}-${num(bucket.max_approximate_tokens)} | ${pct(bucket.pass_rate)} |`);
  }
}

console.log("\n## Primary paired delta summary\n");
const paired = group.paired_delta_summary || group.paired_analysis;
if (paired) {
  console.log(`Comparison: ${paired.comparison_id || `${paired.left_condition}_vs_${paired.right_condition}`}`);
  console.log(`Pairs: ${paired.pairs}`);
  console.log(`Pass delta (${paired.pass?.delta_direction || ""}): ${pct(paired.pass?.mean_delta)}`);
  console.log(`Pass bootstrap CI: ${ci(paired.pass?.ci95_bootstrap)}`);
}

console.log("\n## Gate sensitivity for primary condition\n");
const gate = group.gate_sensitivity;
if (gate?.primary_minus_all_conditions) {
  console.log("| comparison | gate variant | delta |");
  console.log("|---|---|---:|");
  for (const [comparison, deltas] of Object.entries(gate.primary_minus_all_conditions)) {
    if (!deltas) continue;
    for (const [variant, delta] of Object.entries(deltas)) {
      console.log(`| ${comparison} | ${variant} | ${pct(delta)} |`);
    }
  }
}

console.log("\n## Pairwise comparisons\n");
for (const mode of ["pairwise_gold_anchored_summary", "pairwise_gold_blind_summary"]) {
  const byComparison = s[mode]?.by_comparison || {};
  console.log(`### ${mode}\n`);
  console.log("| comparison | left win | right win | tie | valid |");
  console.log("|---|---:|---:|---:|---:|");
  for (const [comparison, v] of Object.entries(byComparison)) {
    console.log(`| ${comparison} | ${pct(v.left_win_rate)} | ${pct(v.right_win_rate)} | ${pct(v.tie_rate)} | ${v.valid_total ?? 0} |`);
  }
  console.log("");
}

function pct(x) { return x === null || x === undefined ? "" : `${(x * 100).toFixed(1)}%`; }
function num(x) { return x === null || x === undefined ? "" : String(Math.round(x)); }
function ci(value) {
  if (!value) return "";
  return `[${pct(value.lower)}, ${pct(value.upper)}]`;
}
