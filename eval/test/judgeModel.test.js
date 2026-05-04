import test from "node:test";
import assert from "node:assert/strict";
import { extractOpenAIText } from "../lib/judgeModel.js";
import { getGeminiThinkingConfig } from "../lib/sampling.js";

test("extractOpenAIText skips reasoning blocks and collects output text", () => {
  const extracted = extractOpenAIText({
    output: [
      { type: "reasoning", content: [{ type: "output_text", text: "hidden" }] },
      { type: "message", content: [{ type: "output_text", text: "{\"ok\":true}" }] }
    ]
  });

  assert.equal(extracted.text, "{\"ok\":true}");
  assert.equal(extracted.refusal, null);
});

test("extractOpenAIText surfaces refusals", () => {
  const extracted = extractOpenAIText({
    output: [
      { type: "message", content: [{ type: "refusal", refusal: "cannot comply" }] }
    ]
  });

  assert.equal(extracted.text, "");
  assert.equal(extracted.refusal, "cannot comply");
});

test("getGeminiThinkingConfig: 2.5 Pro uses minimum thinkingBudget (not 0)", () => {
  const cfg = getGeminiThinkingConfig("gemini-2.5-pro");
  assert.deepEqual(cfg, { thinkingConfig: { thinkingBudget: 128 } });
});

test("getGeminiThinkingConfig: 2.5 Flash allows thinkingBudget 0", () => {
  const cfg = getGeminiThinkingConfig("gemini-2.5-flash");
  assert.deepEqual(cfg, { thinkingConfig: { thinkingBudget: 0 } });
});

test("getGeminiThinkingConfig: Gemini 3 uses thinkingLevel not thinkingBudget", () => {
  const cfg = getGeminiThinkingConfig("gemini-3-ultra");
  assert.deepEqual(cfg, { thinkingConfig: { thinkingLevel: "low" } });
  assert.equal("thinkingBudget" in cfg.thinkingConfig, false);
});

test("getGeminiThinkingConfig: unknown model returns empty config", () => {
  const cfg = getGeminiThinkingConfig("gemini-1.5-pro");
  assert.deepEqual(cfg, {});
});
