import { computeParity, PARITY_CONSTRAINTS } from "../lib/parity.js";

// Offline known-answer proof of the parity harness (analog of validate-tasks for
// the parity layer). Synthetic judge/human labels with KNOWN agreement.

let failures = 0;
function assert(name, condition) {
  console.log(`  ${condition ? "OK  " : "FAIL"} ${name}`);
  if (!condition) failures += 1;
}

function labelSet(ids, value) {
  return Object.fromEntries(ids.map(id => [id, Object.fromEntries(PARITY_CONSTRAINTS.map(k => [k, value]))]));
}

function main() {
  const ids = ["t1", "t2", "t3", "t4", "t5"];
  const judge = labelSet(ids, true);

  const perfect = computeParity(judge, labelSet(ids, true));
  assert("perfect agreement -> parity 25/25 = 1.0", perfect.agree_cells === 25 && perfect.n_cells === 25 && perfect.parity === 1);

  const human3 = labelSet(ids, true);
  human3.t1.minimal_diff = false;
  human3.t2.not_hardcoded = false;
  human3.t3.followed_conventions = false;
  const p3 = computeParity(judge, human3);
  assert("3 disagreements -> parity 22/25", p3.agree_cells === 22 && p3.n_cells === 25);
  assert("3 disagreements recorded with judge/human values", p3.disagreements.length === 3);
  assert("per-constraint minimal_diff parity = 4/5", p3.per_constraint.minimal_diff.agree === 4 && p3.per_constraint.minimal_diff.total === 5);

  const humanBlank = labelSet(ids, true);
  humanBlank.t4.minimal_diff = null;
  humanBlank.t5.no_destructive_ops = null;
  const pb = computeParity(judge, humanBlank);
  assert("blank human cells excluded -> 23 cells, 2 skipped", pb.n_cells === 23 && pb.skipped_unlabeled_cells === 2);
  assert("blank cells never scored as agreement -> 23/23 = 1.0", pb.parity === 1);

  const humanExtra = labelSet([...ids, "t6"], true);
  const pe = computeParity(judge, humanExtra);
  assert("trajectory with no judge label reported as missing", pe.missing_judge_labels.includes("t6"));
  assert("missing-judge trajectory not counted (still 25 cells over t1-t5)", pe.n_cells === 25);

  if (failures > 0) {
    console.error(`\n${failures} assertion(s) FAILED.`);
    process.exit(1);
  }
  console.log("\nParity harness proofs passed.");
}

main();
