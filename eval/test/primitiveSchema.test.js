import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PRIMITIVES,
  AUTHORITY_POSTURES,
  REQUIRED_ANNOTATION_FIELDS,
  validatePrimitiveCaseAnnotation
} from "../lib/primitiveSchema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function validAnnotation(overrides = {}) {
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

test("primitive set and authority postures expose canonical values", () => {
  assert.ok(PRIMITIVES.includes("GIVE_FACT"));
  assert.ok(PRIMITIVES.includes("REFUSE_AND_REDIRECT"));
  assert.equal(PRIMITIVES.length, 10);
  assert.deepEqual([...AUTHORITY_POSTURES], ["ADVISE", "EXECUTE", "DEFER", "STOP"]);
  assert.ok(REQUIRED_ANNOTATION_FIELDS.includes("authority_posture"));
});

test("valid primitive schema annotation passes validation", () => {
  const result = validatePrimitiveCaseAnnotation(validAnnotation());
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("unknown primitive in required_primary_primitive is rejected", () => {
  const result = validatePrimitiveCaseAnnotation(
    validAnnotation({ required_primary_primitive: "INVENT_FACT" })
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes("unknown primitive in required_primary_primitive")));
});

test("unknown authority posture is rejected", () => {
  const result = validatePrimitiveCaseAnnotation(
    validAnnotation({ authority_posture: "DELEGATE" })
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes("unknown authority_posture")));
});

test("primary primitive overlapping forbidden primitive is rejected", () => {
  const result = validatePrimitiveCaseAnnotation(
    validAnnotation({
      required_primary_primitive: "GIVE_RECOMMENDATION",
      forbidden_primitives: ["GIVE_RECOMMENDATION"]
    })
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes("overlaps forbidden_primitives")));
});

test("licensed secondary overlapping forbidden is rejected", () => {
  const result = validatePrimitiveCaseAnnotation(
    validAnnotation({
      licensed_secondary_primitives: ["STATE_BLOCKER", "GIVE_RECOMMENDATION"],
      forbidden_primitives: ["GIVE_RECOMMENDATION", "EXECUTE_ACTION"]
    })
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes("licensed_secondary_primitives overlap forbidden_primitives")));
});

test("validator does not throw for malformed input", () => {
  assert.doesNotThrow(() => validatePrimitiveCaseAnnotation(null));
  assert.doesNotThrow(() => validatePrimitiveCaseAnnotation("not an object"));
  const result = validatePrimitiveCaseAnnotation(null);
  assert.equal(result.ok, false);
});

test("missing required field is reported", () => {
  const annotation = validAnnotation();
  delete annotation.work_unit;
  const result = validatePrimitiveCaseAnnotation(annotation);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes("missing required field: work_unit")));
});

test("non-array forbidden_primitives is rejected", () => {
  const result = validatePrimitiveCaseAnnotation(
    validAnnotation({ forbidden_primitives: "GIVE_RECOMMENDATION" })
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes("forbidden_primitives must be an array")));
});

test("missing-info blocker fixture validates against the schema", () => {
  const fixturePath = path.resolve(
    __dirname,
    "../fixtures/primitive_cases/missing_info_blocker_example.json"
  );
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const result = validatePrimitiveCaseAnnotation(fixture);
  assert.equal(result.ok, true, `errors: ${result.errors.join("; ")}`);
});
