import test from "node:test";
import assert from "node:assert/strict";
import { loadAllCases } from "../lib/loadCases.js";

// Always test against the dev corpus (cases/) regardless of any CASE_DIR set
// in the environment. Running `CASE_DIR=cases_holdout npm run ci` should not
// break this test — the hardcoded count (40) belongs to the dev set only.
test("loads normalized case corpus", () => {
  const savedCaseDir = process.env.CASE_DIR;
  delete process.env.CASE_DIR;

  try {
    const cases = loadAllCases();
    assert.equal(cases.length, 40);
    for (const testCase of cases) {
      assert.equal(testCase.schema_version, "1.1");
      assert.ok(Array.isArray(testCase.hard_constraints));
      assert.ok(testCase.hard_constraints.length > 0);
      assert.ok(Array.isArray(testCase.not_acceptable_final_answers));
      assert.ok(testCase.not_acceptable_final_answers.length > 0);
    }
  } finally {
    if (savedCaseDir !== undefined) process.env.CASE_DIR = savedCaseDir;
  }
});

test("schema_version 1.2 cases load and validate correctly", () => {
  const savedCaseDir = process.env.CASE_DIR;
  process.env.CASE_DIR = "cases_holdout";

  try {
    const cases = loadAllCases();
    assert.ok(cases.length > 0, "cases_holdout should have at least one case");
    const v12Cases = cases.filter((c) => c.schema_version === "1.2");
    assert.ok(v12Cases.length > 0, "cases_holdout should contain at least one schema_version 1.2 case");
    for (const testCase of v12Cases) {
      assert.ok(Array.isArray(testCase.hard_constraints), `${testCase.id} must have hard_constraints array`);
      assert.ok(testCase.hard_constraints.length > 0, `${testCase.id} hard_constraints must be non-empty`);
      assert.ok(Array.isArray(testCase.not_acceptable_final_answers), `${testCase.id} must have not_acceptable_final_answers array`);
      assert.ok(testCase.not_acceptable_final_answers.length > 0, `${testCase.id} not_acceptable_final_answers must be non-empty`);
    }
  } finally {
    if (savedCaseDir !== undefined) process.env.CASE_DIR = savedCaseDir;
    else delete process.env.CASE_DIR;
  }
});
