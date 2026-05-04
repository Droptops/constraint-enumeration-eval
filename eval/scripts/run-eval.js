import path from "path";

import { loadAllCases } from "../lib/loadCases.js";
import { runBatch, selectDiverseCases } from "../lib/runBatch.js";
import { makeTimestampRunId, validateRunId } from "../lib/runId.js";

const runId = validateRunId(process.env.RUN_ID || makeTimestampRunId("eval"));
const trials = Number.parseInt(process.env.TRIALS || process.env.SMOKE_TRIALS || "3", 10);
const maxCasesRaw = process.env.MAX_CASES || process.env.SMOKE_CASES || "all";

if (!Number.isInteger(trials) || trials < 1 || trials > 10) {
  throw new Error("TRIALS must be an integer between 1 and 10.");
}

const allCases = loadAllCases();
const cases = maxCasesRaw === "all"
  ? allCases
  : selectDiverseCases(allCases, Number.parseInt(maxCasesRaw, 10));

if (!Array.isArray(cases) || cases.length === 0) {
  throw new Error("No cases selected.");
}

const { artifact, summaryPath } = await runBatch({
  runId,
  cases,
  allCasesForHash: allCases,
  trials,
  resultsDir: path.join(process.cwd(), "results"),
  smokeTest: false,
  log: message => console.log(message)
});

console.log("");
console.log("Eval complete.");
console.log(`Summary: ${summaryPath}`);
console.log(JSON.stringify(artifact.absolute_summary.global.conditions, null, 2));
