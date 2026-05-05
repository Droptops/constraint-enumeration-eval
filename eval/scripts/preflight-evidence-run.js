import fs from "node:fs";
import path from "node:path";
import { runPreflight } from "../lib/preflightEvidenceRun.js";

function loadDotenvLocal() {
  const candidates = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), "..", ".env.local")
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const raw = fs.readFileSync(candidate, "utf8");
    for (const rawLine of raw.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
    return candidate;
  }
  return null;
}

function pad(label, width) {
  return label.length >= width ? label : label + " ".repeat(width - label.length);
}

function printPlan(plan) {
  console.log("=== Evidence Run Preflight ===");
  console.log(`Run ID:           ${plan.runId}`);
  console.log(`Git HEAD:         ${plan.gitHead || "(unavailable)"}`);
  const status = plan.gitStatus === null ? "(unavailable)" : plan.gitStatus.trim() || "(clean)";
  console.log(`Git status:       ${status.includes("\n") ? "" : status}`);
  if (status.includes("\n")) {
    for (const line of status.split("\n")) console.log(`  ${line}`);
  }

  console.log("");
  console.log(`Case dir:         ${plan.caseDir}${plan.resolvedCaseDir ? ` -> ${plan.resolvedCaseDir}` : ""}`);
  console.log(`Case count:       ${plan.caseCount} .json file(s)`);
  console.log(`Trials per case:  ${plan.trialsPerCase ?? "(invalid)"}`);
  console.log(`Expected rows:    ${plan.expectedRows} (caseCount x conditions x trials)`);

  console.log("");
  console.log(`Conditions (${plan.conditions.length}):`);
  for (const c of plan.conditions) console.log(`  - ${c}`);

  console.log("");
  console.log(`Pairwise comparisons (${plan.pairwiseComparisons.length}):`);
  for (const p of plan.pairwiseComparisons) console.log(`  - ${p}`);

  console.log("");
  console.log(`Primary judge:    ${plan.primaryJudge || "(unset)"}`);
  console.log(`Judge specs (${plan.judgeSpecs.length}):`);
  for (const s of plan.judgeSpecs) console.log(`  - ${s}`);

  console.log("");
  console.log("Key presence (no values shown):");
  const providers = Object.keys(plan.keyPresence).sort();
  if (providers.length === 0) {
    console.log("  (no providers checked)");
  } else {
    for (const p of providers) {
      console.log(`  ${pad(p + ":", 12)} present: ${plan.keyPresence[p] ? "yes" : "NO"}`);
    }
  }

  console.log("");
  console.log("Prompt identities (first 60 chars + sha256):");
  const conds = Object.keys(plan.promptIdentities);
  if (conds.length === 0) {
    console.log("  (none resolved)");
  } else {
    for (const cond of conds) {
      const id = plan.promptIdentities[cond];
      const preview = id.preview.replace(/\s+/g, " ");
      console.log(`  ${pad(cond, 44)} | "${preview}${id.preview.length === 60 ? "..." : ""}" | sha256:${id.sha256.slice(0, 16)}... | len=${id.length}`);
    }
  }
}

function main() {
  const dotenvPath = loadDotenvLocal();
  if (dotenvPath) {
    console.log(`Loaded environment from ${dotenvPath}`);
    console.log("");
  }

  const result = runPreflight(process.env);
  printPlan(result.plan);

  console.log("");
  if (result.warnings.length > 0) {
    console.log(`WARNINGS (${result.warnings.length}):`);
    for (const w of result.warnings) console.log(`  - ${w}`);
    console.log("");
  }

  if (result.errors.length > 0) {
    console.log(`ERRORS (${result.errors.length}):`);
    for (const e of result.errors) console.log(`  - ${e}`);
    console.log("");
    console.log("PREFLIGHT FAILED. Fix errors above before launching the evidence run.");
    process.exit(1);
  }

  console.log("PREFLIGHT OK. Plan locked above. Safe to proceed.");
  process.exit(0);
}

main();
