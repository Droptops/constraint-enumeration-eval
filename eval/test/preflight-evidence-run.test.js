import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runPreflight } from "../lib/preflightEvidenceRun.js";
import { systemForCondition } from "../lib/runCase.js";

const R10_BASE_ENV = {
  EVAL_CONDITIONS:
    "baseline,careful_control,constraint_axis_prompting,production_constraint_prompt,production_blocker_first_v6.3_candidate",
  PAIRWISE_COMPARISONS:
    "production_blocker_first_v6.3_candidate:baseline,production_blocker_first_v6.3_candidate:careful_control,production_blocker_first_v6.3_candidate:production_constraint_prompt,production_blocker_first_v6.3_candidate:constraint_axis_prompting",
  LAB_PRIMARY_JUDGE_SPEC: "openai:gpt-5.1",
  LAB_JUDGE_SPECS: "anthropic:claude-opus-4-7,openai:gpt-5.1",
  JUDGE_PROVIDER: "openai",
  OPENAI_JUDGE_MODEL: "gpt-5.1",
  OPENAI_API_KEY: "test-key-present",
  ANTHROPIC_API_KEY: "test-key-present"
};

function makeFixtureCaseDir(totalCaseCount, { filesPerCorpus = totalCaseCount } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "preflight-cases-"));
  const perFile = Math.max(1, Math.floor(totalCaseCount / filesPerCorpus));
  let remaining = totalCaseCount;
  for (let i = 0; i < filesPerCorpus && remaining > 0; i++) {
    const isLast = i === filesPerCorpus - 1;
    const count = isLast ? remaining : Math.min(perFile, remaining);
    const arr = Array.from({ length: count }, (_, j) => ({ id: `fixture_${i}_${j}` }));
    fs.writeFileSync(path.join(tmp, `case_${i}.json`), JSON.stringify(arr) + "\n", "utf8");
    remaining -= count;
  }
  return tmp;
}

function findError(errors, substring) {
  return errors.find(e => e.includes(substring));
}

test("preflight fails when EVAL_CONDITIONS is unset", () => {
  const env = { ...R10_BASE_ENV };
  delete env.EVAL_CONDITIONS;
  const result = runPreflight(env);
  assert.equal(result.ok, false);
  assert.ok(findError(result.errors, "EVAL_CONDITIONS"), `expected EVAL_CONDITIONS error in: ${result.errors.join(" | ")}`);
});

test("preflight fails when PAIRWISE_COMPARISONS is unset", () => {
  const env = { ...R10_BASE_ENV };
  delete env.PAIRWISE_COMPARISONS;
  const result = runPreflight(env);
  assert.equal(result.ok, false);
  assert.ok(
    findError(result.errors, "PAIRWISE_COMPARISONS"),
    `expected PAIRWISE_COMPARISONS error in: ${result.errors.join(" | ")}`
  );
});

test("preflight fails when pairwise references a condition not in EVAL_CONDITIONS", () => {
  const env = {
    ...R10_BASE_ENV,
    PAIRWISE_COMPARISONS: "production_blocker_first_v6.3_candidate:style_matched_baseline"
  };
  const result = runPreflight(env);
  assert.equal(result.ok, false);
  assert.ok(
    findError(result.errors, "style_matched_baseline"),
    `expected pairwise->condition error in: ${result.errors.join(" | ")}`
  );
});

test("preflight fails when LAB_JUDGE_SPECS includes google:gemini-2.5-pro without a Gemini key", () => {
  const env = {
    ...R10_BASE_ENV,
    LAB_JUDGE_SPECS: "anthropic:claude-opus-4-7,openai:gpt-5.1,google:gemini-2.5-pro"
  };
  // Ensure no Gemini key leaks in from the host env
  delete env.GEMINI_API_KEY;
  delete env.GOOGLE_API_KEY;

  const result = runPreflight(env);
  assert.equal(result.ok, false);
  const err = findError(result.errors, "GEMINI_API_KEY");
  assert.ok(err, `expected Gemini key error in: ${result.errors.join(" | ")}`);
  assert.ok(err.includes("GOOGLE_API_KEY"), "error should also mention GOOGLE_API_KEY");
});

test("preflight passes for the r10 run plan", () => {
  const result = runPreflight({ ...R10_BASE_ENV });
  assert.equal(result.ok, true, `expected ok=true, errors: ${result.errors.join(" | ")}`);
  assert.equal(result.plan.primaryJudge, "openai:gpt-5.1");
  assert.deepEqual(result.plan.judgeSpecs.sort(), ["anthropic:claude-opus-4-7", "openai:gpt-5.1"].sort());
  assert.equal(result.plan.keyPresence.openai, true);
  assert.equal(result.plan.keyPresence.anthropic, true);
  assert.equal(result.plan.conditions.length, 5);
  assert.equal(result.plan.pairwiseComparisons.length, 4);
});

test("preflight computes expected row count = 300 for 20 cases x 5 conditions x 3 trials", () => {
  const fixtureDir = makeFixtureCaseDir(20);
  try {
    const env = { ...R10_BASE_ENV, CASE_DIR: fixtureDir };
    const result = runPreflight(env);
    assert.equal(result.ok, true, `expected ok=true, errors: ${result.errors.join(" | ")}`);
    assert.equal(result.plan.caseCount, 20);
    assert.equal(result.plan.trialsPerCase, 3);
    assert.equal(result.plan.conditions.length, 5);
    assert.equal(result.plan.expectedRows, 300);
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test("preflight sums case entries across multiple .json files (4 files x 5 cases = 20)", () => {
  const fixtureDir = makeFixtureCaseDir(20, { filesPerCorpus: 4 });
  try {
    const env = { ...R10_BASE_ENV, CASE_DIR: fixtureDir };
    const result = runPreflight(env);
    assert.equal(result.ok, true, `expected ok=true, errors: ${result.errors.join(" | ")}`);
    assert.equal(result.plan.caseFileCount, 4, "should see 4 .json files");
    assert.equal(result.plan.caseCount, 20, "should sum to 20 case entries across files");
    assert.equal(result.plan.expectedRows, 300, "5 conditions x 3 trials x 20 cases");
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test("production_blocker_first_v6.3_candidate resolves to a non-empty system prompt", () => {
  const system = systemForCondition("production_blocker_first_v6.3_candidate");
  assert.equal(typeof system, "string");
  assert.ok(system.trim().length > 0, "production_blocker_first_v6.3_candidate must resolve to a non-empty prompt");
});
