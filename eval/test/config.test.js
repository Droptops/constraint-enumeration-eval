import test from "node:test";
import assert from "node:assert/strict";

import {
  getEvalConditions,
  getJudgeProvider,
  getPrimaryCondition,
  isSameVendorJudge
} from "../lib/config.js";

function withEnv(overrides, fn) {
  const previous = new Map(Object.keys(overrides).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("default primary condition matches frontier production prompt", () => {
  withEnv({ PRIMARY_CONDITION: undefined, EVAL_CONDITIONS: undefined, PAIRWISE_COMPARISONS: undefined }, () => {
    assert.equal(getPrimaryCondition(), "production_constraint_prompt");
    assert.deepEqual(getEvalConditions(), ["baseline", "production_constraint_prompt"]);
  });
});

test("same-vendor judge warning is provider-aware", () => {
  withEnv({ ANSWER_PROVIDER: "openai", JUDGE_PROVIDER: "openai" }, () => {
    assert.equal(isSameVendorJudge(), true);
  });

  withEnv({ ANSWER_PROVIDER: "anthropic", JUDGE_PROVIDER: "openai" }, () => {
    assert.equal(isSameVendorJudge(), false);
  });
});

test("judge provider normalizes gemini alias", () => {
  withEnv({ JUDGE_PROVIDER: "gemini" }, () => {
    assert.equal(getJudgeProvider(), "google");
  });
});
