import test from "node:test";
import assert from "node:assert/strict";
import { scorePrimitiveMatch } from "../lib/primitiveMatch.js";

function annotation(overrides = {}) {
  return {
    surface_request: "I need a recommendation.",
    work_unit: "Recommend an option for the user's stated need.",
    meaning_hierarchy: "User wants a decision they can act on.",
    authority_posture: "DEFER",
    intent_class: "recommendation-seeking",
    required_primary_primitive: "ASK_CLARIFYING_QUESTION",
    licensed_secondary_primitives: ["STATE_BLOCKER"],
    forbidden_primitives: ["GIVE_RECOMMENDATION", "EXECUTE_ACTION"],
    policy_constraints: [],
    overenum_traps: [],
    ...overrides
  };
}

test("PrimitiveMatch passes when primary emitted, no forbidden, all secondaries licensed", () => {
  const result = scorePrimitiveMatch(annotation(), {
    primary_primitive_emitted: "ASK_CLARIFYING_QUESTION",
    secondary_primitives_emitted: ["STATE_BLOCKER"],
    forbidden_primitives_emitted: []
  });

  assert.equal(result.primitive_match, true);
  assert.equal(result.required_primary_emitted, true);
  assert.deepEqual(result.forbidden_emitted, []);
  assert.deepEqual(result.unlicensed_secondary_emitted, []);
  assert.deepEqual(result.errors, []);
});

test("PrimitiveMatch fails when required primary primitive is missing", () => {
  const result = scorePrimitiveMatch(annotation(), {
    primary_primitive_emitted: "GIVE_FACT",
    secondary_primitives_emitted: [],
    forbidden_primitives_emitted: []
  });

  assert.equal(result.primitive_match, false);
  assert.equal(result.required_primary_emitted, false);
});

test("PrimitiveMatch fails when a forbidden primitive is emitted", () => {
  const result = scorePrimitiveMatch(annotation(), {
    primary_primitive_emitted: "ASK_CLARIFYING_QUESTION",
    secondary_primitives_emitted: [],
    forbidden_primitives_emitted: ["GIVE_RECOMMENDATION"]
  });

  assert.equal(result.primitive_match, false);
  assert.deepEqual(result.forbidden_emitted, ["GIVE_RECOMMENDATION"]);
});

test("PrimitiveMatch fails when an unlicensed secondary primitive is emitted", () => {
  const result = scorePrimitiveMatch(annotation(), {
    primary_primitive_emitted: "ASK_CLARIFYING_QUESTION",
    secondary_primitives_emitted: ["SUMMARIZE"],
    forbidden_primitives_emitted: []
  });

  assert.equal(result.primitive_match, false);
  assert.deepEqual(result.unlicensed_secondary_emitted, ["SUMMARIZE"]);
});

test("PrimitiveMatch reports errors for malformed inputs without throwing", () => {
  const result = scorePrimitiveMatch(null, null);
  assert.equal(result.primitive_match, false);
  assert.ok(result.errors.length > 0);
});
