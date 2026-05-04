import test from "node:test";
import assert from "node:assert/strict";
import { extractOpenAIText } from "../lib/judgeModel.js";

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
