import path from "path";

import { loadAllCases } from "../lib/loadCases.js";
import { runBatch, selectDiverseCases } from "../lib/runBatch.js";

const runId = process.env.RUN_ID || `smoke-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const trials = Number.parseInt(process.env.SMOKE_TRIALS || "1", 10);
const maxCases = Number.parseInt(process.env.SMOKE_CASES || "4", 10);

if (!Number.isInteger(trials) || trials < 1 || trials > 5) {
  throw new Error("SMOKE_TRIALS must be an integer between 1 and 5.");
}

if (!Number.isInteger(maxCases) || maxCases < 1) {
  throw new Error("SMOKE_CASES must be a positive integer.");
}

const allCases = loadAllCases();
const cases = selectDiverseCases(allCases, maxCases);

const { artifact, summaryPath } = await runBatch({
  runId,
  cases,
  allCasesForHash: allCases,
  trials,
  resultsDir: path.join(process.cwd(), "results"),
  smokeTest: true,
  log: message => console.log(message)
});

console.log("");
console.log("Smoke test complete.");
console.log(`Summary: ${summaryPath}`);
console.log(JSON.stringify(artifact.absolute_summary.global, null, 2));
console.log(JSON.stringify(artifact.pairwise_gold_anchored_summary.global, null, 2));
console.log(JSON.stringify(artifact.pairwise_gold_blind_summary.global, null, 2));
