import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAnswerResult } from "../lib/runCase.js";

test("normalizeAnswerResult flags OpenAI 'incomplete' as truncated", () => {
  // OpenAI Responses reports token truncation as status="incomplete"; it must be
  // counted as truncated, like Anthropic/Gemini "max_tokens".
  assert.equal(normalizeAnswerResult({ stop_reason: "incomplete" }).truncated, true);
  assert.equal(normalizeAnswerResult({ stop_reason: "max_tokens" }).truncated, true);
});

test("normalizeAnswerResult does not flag normal completions or refusals as truncated", () => {
  assert.equal(normalizeAnswerResult({ stop_reason: "completed" }).truncated, false);
  assert.equal(normalizeAnswerResult({ stop_reason: "end_turn" }).truncated, false);
  assert.equal(normalizeAnswerResult({ stop_reason: "refusal" }).truncated, false);
});
