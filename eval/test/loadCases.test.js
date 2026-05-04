import test from "node:test";
import assert from "node:assert/strict";
import { loadAllCases } from "../lib/loadCases.js";

test("loads normalized case corpus", () => {
  const cases = loadAllCases();
  assert.equal(cases.length, 40);
  for (const testCase of cases) {
    assert.equal(testCase.schema_version, "1.1");
    assert.ok(Array.isArray(testCase.hard_constraints));
    assert.ok(testCase.hard_constraints.length > 0);
    assert.ok(Array.isArray(testCase.not_acceptable_final_answers));
    assert.ok(testCase.not_acceptable_final_answers.length > 0);
  }
});
