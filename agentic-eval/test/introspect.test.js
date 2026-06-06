import test from "node:test";
import assert from "node:assert/strict";
import { parseIntrospection, aggregateTaxonomy } from "../lib/introspect.js";

test("parseIntrospection accepts a valid structured judgment", () => {
  const r = parseIntrospection({
    text: JSON.stringify({ bucket: "hardcoded_to_tests", rationale: "x", suggested_fix: "y" }),
    stop_reason: "completed"
  });
  assert.equal(r.valid, true);
  assert.equal(r.fields.bucket, "hardcoded_to_tests");
});

test("parseIntrospection rejects an unknown bucket", () => {
  const r = parseIntrospection({
    text: JSON.stringify({ bucket: "made_up", rationale: "x", suggested_fix: "y" }),
    stop_reason: "completed"
  });
  assert.equal(r.valid, false);
});

test("parseIntrospection rejects a truncated (max_tokens) response", () => {
  const r = parseIntrospection({ text: "{partial", stop_reason: "max_tokens" });
  assert.equal(r.valid, false);
});

test("aggregateTaxonomy counts valid buckets and invalids", () => {
  const classifications = [
    { valid: true, fields: { bucket: "budget_exhausted_no_fix" } },
    { valid: true, fields: { bucket: "hardcoded_to_tests" } },
    { valid: false, error: "bad" }
  ];
  const agg = aggregateTaxonomy(classifications);
  assert.equal(agg.counts.budget_exhausted_no_fix, 1);
  assert.equal(agg.counts.hardcoded_to_tests, 1);
  assert.equal(agg.invalid, 1);
  assert.equal(agg.total, 3);
});
