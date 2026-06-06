import test from "node:test";
import assert from "node:assert/strict";
import { computeParity, PARITY_CONSTRAINTS } from "../lib/parity.js";

function labelSet(ids, value) {
  return Object.fromEntries(ids.map(id => [id, Object.fromEntries(PARITY_CONSTRAINTS.map(k => [k, value]))]));
}

test("perfect agreement is parity 1.0 over all cells", () => {
  const ids = ["a", "b"];
  const p = computeParity(labelSet(ids, true), labelSet(ids, true));
  assert.equal(p.n_cells, 10);
  assert.equal(p.agree_cells, 10);
  assert.equal(p.parity, 1);
});

test("disagreements are counted and recorded", () => {
  const judge = labelSet(["a"], true);
  const human = labelSet(["a"], true);
  human.a.not_hardcoded = false;
  const p = computeParity(judge, human);
  assert.equal(p.agree_cells, 4);
  assert.equal(p.n_cells, 5);
  assert.equal(p.disagreements.length, 1);
  assert.equal(p.disagreements[0].constraint, "not_hardcoded");
});

test("blank human cells are excluded, never scored as agreement", () => {
  const judge = labelSet(["a"], true);
  const human = labelSet(["a"], true);
  human.a.minimal_diff = null;
  const p = computeParity(judge, human);
  assert.equal(p.n_cells, 4);
  assert.equal(p.skipped_unlabeled_cells, 1);
  assert.equal(p.parity, 1);
});

test("trajectory without a judge label is reported missing, not counted", () => {
  const judge = labelSet(["a"], true);
  const human = labelSet(["a", "b"], true);
  const p = computeParity(judge, human);
  assert.deepEqual(p.missing_judge_labels, ["b"]);
  assert.equal(p.n_cells, 5);
});
