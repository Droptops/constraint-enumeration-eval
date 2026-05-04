import test from "node:test";
import assert from "node:assert/strict";

import { extractOpenAIAnswerText, extractGeminiAnswerText, normalizeProvider } from "../lib/answerModel.js";

test("extractOpenAIAnswerText skips reasoning and joins output text", () => {
  const result = extractOpenAIAnswerText({
    output: [
      { type: "reasoning", content: [{ type: "output_text", text: "hidden" }] },
      { type: "message", content: [{ type: "output_text", text: "Visible" }, { type: "output_text", text: " answer" }] }
    ]
  });

  assert.equal(result.text, "Visible answer");
  assert.equal(result.refusal, null);
});

test("extractOpenAIAnswerText surfaces refusals", () => {
  const result = extractOpenAIAnswerText({
    output: [{ type: "message", content: [{ type: "refusal", refusal: "No." }] }]
  });

  assert.equal(result.text, "");
  assert.equal(result.refusal, "No.");
});

test("extractGeminiAnswerText joins text parts", () => {
  const result = extractGeminiAnswerText({
    content: { parts: [{ text: "Hello" }, { inlineData: {} }, { text: " world" }] }
  });

  assert.equal(result, "Hello world");
});

test("normalizeProvider accepts gemini alias", () => {
  assert.equal(normalizeProvider("gemini"), "google");
  assert.equal(normalizeProvider("openai"), "openai");
});
