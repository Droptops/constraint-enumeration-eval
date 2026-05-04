import test from "node:test";
import assert from "node:assert/strict";
import {
  bootstrapCi95,
  groupBy,
  marginWeight,
  mcnemar,
  summarizeResults
} from "../lib/metrics.js";

function result({ caseId, condition, pass, tokens = 10, trial = 1 }) {
  return {
    caseId,
    condition,
    trial,
    category: "physical",
    requires_direct_answer: true,
    clarification_expected: false,
    score: {
      pass,
      constraint_failure: !pass,
      invalid_judge_response: false,
      gate_variants: {
        v31_decision_quality_default: pass,
        v30_strict_with_implicit_consideration: pass
      },
      fields: {
        final_answer_correct: pass,
        considers_binding_constraints_implicitly: pass,
        enumerates_binding_constraints_explicitly: false,
        applies_constraints_correctly: pass,
        violates_hard_constraint: !pass,
        asks_unnecessary_clarification: false,
        over_enumerates_irrelevant_constraints: false,
        ignored_relevant_soft_constraints: false
      }
    },
    answer_stats: {
      characters: tokens * 4,
      approximate_words: tokens,
      approximate_tokens: tokens
    },
    answer_truncated: false
  };
}

test("groupBy is safe for prototype-like keys", () => {
  const grouped = groupBy([{ key: "__proto__" }, { key: "constructor" }], item => item.key);
  assert.equal(Object.getPrototypeOf(grouped), null);
  assert.equal(grouped.__proto__.length, 1);
  assert.equal(grouped.constructor.length, 1);
});

test("mcnemar continuity-corrected p-value matches known b=10 c=2 value", () => {
  const left = Array(10).fill(0).concat(Array(2).fill(1));
  const right = Array(10).fill(1).concat(Array(2).fill(0));
  const summary = mcnemar(left, right, "left", "right");
  assert.equal(summary.left_zero_right_one, 10);
  assert.equal(summary.left_one_right_zero, 2);
  assert.ok(Math.abs(summary.chi_square_continuity_corrected - 4.0833333333) < 1e-9);
  assert.ok(Math.abs(summary.approximate_p_value - 0.0433081) < 1e-4);
});

test("bootstrap CI returns ordered bounds", () => {
  const ci = bootstrapCi95([1, 0, 1, -1, 0], 200);
  assert.ok(ci.lower <= ci.upper);
  assert.equal(ci.iterations, 200);
});

test("summarizeResults includes length buckets and gate sensitivity", () => {
  const summary = summarizeResults([
    result({ caseId: "a", condition: "baseline", pass: false, tokens: 5 }),
    result({ caseId: "a", condition: "skill", pass: true, tokens: 20 })
  ]);
  assert.equal(summary.global.baseline.pass_rate, 0);
  assert.equal(summary.global.skill.pass_rate, 1);
  assert.ok(summary.global.conditions.skill.pass_rate_by_answer_length_quartile);
  assert.ok(summary.global.gate_sensitivity.conditions.skill);
});

test("invalid pairwise margin throws instead of silently zeroing", () => {
  assert.equal(marginWeight("small"), 0.33);
  assert.throws(() => marginWeight("huge"), /Invalid pairwise margin/);
});
