import test from "node:test";
import assert from "node:assert/strict";
import { seededBoolean, seededFloat } from "../lib/seededRandom.js";

test("seededFloat is deterministic and bounded", () => {
  const a = seededFloat("case:1");
  const b = seededFloat("case:1");
  assert.equal(a, b);
  assert.ok(a >= 0 && a < 1);
});

test("seededBoolean is deterministic", () => {
  assert.equal(seededBoolean("same-seed"), seededBoolean("same-seed"));
});
