import test from "node:test";
import assert from "node:assert/strict";
import { isInvalidJudgeStopReason } from "../lib/judge.js";

test("isInvalidJudgeStopReason flags OpenAI 'incomplete' truncation", () => {
  // OpenAI Responses labels a token-truncated completion status="incomplete";
  // it must be treated as invalid, like Anthropic/Gemini "max_tokens", so a
  // truncated-but-parseable judgment is not admitted into the gate.
  assert.equal(isInvalidJudgeStopReason("incomplete"), true);
});

test("isInvalidJudgeStopReason flags refusal and max_tokens", () => {
  assert.equal(isInvalidJudgeStopReason("refusal"), true);
  assert.equal(isInvalidJudgeStopReason("max_tokens"), true);
});

test("isInvalidJudgeStopReason accepts normal completion reasons", () => {
  assert.equal(isInvalidJudgeStopReason("completed"), false);
  assert.equal(isInvalidJudgeStopReason("end_turn"), false);
  assert.equal(isInvalidJudgeStopReason(undefined), false);
});
