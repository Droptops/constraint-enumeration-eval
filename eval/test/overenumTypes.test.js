import test from "node:test";
import assert from "node:assert/strict";
import { OVERENUM_TYPES, classifyOverEnumSignals } from "../lib/overenumTypes.js";

test("OverEnum types describe legacy as the gate metric and the others as diagnostic", () => {
  assert.equal(OVERENUM_TYPES.legacy_overenum.diagnostic_only, false);
  assert.equal(OVERENUM_TYPES.behavioral_over_enum.diagnostic_only, true);
  assert.equal(OVERENUM_TYPES.authority_over_enum.diagnostic_only, true);
});

test("OverEnum typing helper normalizes booleans", () => {
  const result = classifyOverEnumSignals({
    legacy_overenum: true,
    behavioral_over_enum: true,
    authority_over_enum: false
  });

  assert.equal(result.legacy_overenum, true);
  assert.equal(result.behavioral_over_enum, true);
  assert.equal(result.authority_over_enum, false);
  assert.deepEqual(result.warnings, []);
});

test("OverEnum typing helper warns on missing fields", () => {
  const result = classifyOverEnumSignals({ legacy_overenum: true });

  assert.equal(result.legacy_overenum, true);
  assert.equal(result.behavioral_over_enum, null);
  assert.equal(result.authority_over_enum, null);
  assert.ok(result.warnings.some(w => w.includes("missing field: behavioral_over_enum")));
  assert.ok(result.warnings.some(w => w.includes("missing field: authority_over_enum")));
});

test("OverEnum typing helper warns on non-boolean values", () => {
  const result = classifyOverEnumSignals({
    legacy_overenum: "yes",
    behavioral_over_enum: 1,
    authority_over_enum: false
  });

  assert.equal(result.legacy_overenum, null);
  assert.equal(result.behavioral_over_enum, null);
  assert.equal(result.authority_over_enum, false);
  assert.ok(result.warnings.some(w => w.includes("legacy_overenum is not a boolean")));
});

test("OverEnum typing helper flags contradictory authority/legacy combination", () => {
  const result = classifyOverEnumSignals({
    legacy_overenum: false,
    behavioral_over_enum: false,
    authority_over_enum: true
  });

  assert.ok(
    result.warnings.some(w => w.includes("authority_over_enum=true but legacy_overenum=false"))
  );
});

test("OverEnum typing helper flags contradictory behavioral/legacy combination", () => {
  const result = classifyOverEnumSignals({
    legacy_overenum: false,
    behavioral_over_enum: true,
    authority_over_enum: false
  });

  assert.ok(
    result.warnings.some(w => w.includes("behavioral_over_enum=true but legacy_overenum=false"))
  );
});

test("OverEnum typing helper handles null input", () => {
  const result = classifyOverEnumSignals(null);
  assert.equal(result.legacy_overenum, null);
  assert.ok(result.warnings.length > 0);
});
