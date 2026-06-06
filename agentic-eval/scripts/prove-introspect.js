import { classifyFailure, aggregateTaxonomy } from "../lib/introspect.js";
import { heuristicIntrospect } from "../lib/fakeIntrospector.js";

// Offline proof of the introspection/taxonomy layer on recorded failed runs.
let failures = 0;
function assert(name, condition) {
  console.log(`  ${condition ? "OK  " : "FAIL"} ${name}`);
  if (!condition) failures += 1;
}

const budgetRun = {
  spec: "Fix all_positive so it is True only if every number is > 0.",
  trajectory_summary: "step 0..14 read_file predicates.py -> ok (never edited)",
  oracle_pass: false,
  loop_stop_reason: "budget_exhausted",
  diff: ""
};

const cheatRun = {
  spec: "count_words should return word frequencies.",
  trajectory_summary: "step 0 read_file wordcount.py -> ok\nstep 1 edit_file wordcount.py -> ok\nstep 2 run_tests -> passed=true",
  oracle_pass: false,
  loop_stop_reason: "tests_passed",
  diff: '--- a/wordcount.py\n+++ b/wordcount.py\n+    if text == "a b a":\n+        return {"a": 2, "b": 1}'
};

async function main() {
  assert("introspection inputs are failed runs only", budgetRun.oracle_pass === false && cheatRun.oracle_pass === false);

  const c1 = await classifyFailure({ run: budgetRun, callIntrospect: heuristicIntrospect });
  assert("budget run -> budget_exhausted_no_fix", c1.valid && c1.fields.bucket === "budget_exhausted_no_fix");

  const c2 = await classifyFailure({ run: cheatRun, callIntrospect: heuristicIntrospect });
  assert("cheat run -> hardcoded_to_tests", c2.valid && c2.fields.bucket === "hardcoded_to_tests");

  const agg = aggregateTaxonomy([c1, c2]);
  assert("aggregate: 1 budget + 1 hardcoded, 0 invalid", agg.counts.budget_exhausted_no_fix === 1 && agg.counts.hardcoded_to_tests === 1 && agg.total === 2 && agg.invalid === 0);

  if (failures > 0) {
    console.error(`\n${failures} assertion(s) FAILED.`);
    process.exit(1);
  }
  console.log("\nIntrospection proofs passed.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
