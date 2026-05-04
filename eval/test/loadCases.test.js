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
