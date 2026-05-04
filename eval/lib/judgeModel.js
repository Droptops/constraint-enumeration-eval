import { callClaude } from "./anthropic.js";
import { getJudgeModel, getJudgeProvider } from "./config.js";
import { DEFAULT_RETRYABLE_STATUS_CODES, exponentialBackoffMs, parseRetryAfterMs, sleep } from "./retry.js";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

export async function callJudgeModel({ system, prompt, maxTokens = 1200, temperature = 0, outputConfig, schemaName }) {
  const provider = getJudgeProvider();

  if (provider === "anthropic") {
    return await callClaude({
      model: getJudgeModel(),
      system,
      messages: [{ role: "user", content: prompt }],
      maxTokens,
      temperature,
      outputConfig
    });
  }

  if (provider === "openai") {
    return await callOpenAIResponses({
      model: getJudgeModel(),
      system,
      prompt,
      maxTokens,
      temperature,
      outputConfig,
      schemaName
    });
  }

  throw new Error(`Unsupported JUDGE_PROVIDER: ${provider}`);
}

async function callOpenAIResponses({ model, system, prompt, maxTokens, temperature, outputConfig, schemaName }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY for JUDGE_PROVIDER=openai");
  }

  if (!outputConfig?.format?.schema) {
    throw new Error("OpenAI structured judging requires outputConfig.format.schema.");
  }

  const body = {
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ],
    max_output_tokens: maxTokens,
    temperature,
    text: {
      format: {
        type: "json_schema",
        name: schemaName || "judge_response",
        strict: true,
        schema: outputConfig.format.schema
      }
    }
  };

  let lastError;

  for (let attempt = 0; attempt <= 5; attempt++) {
    try {
      const response = await fetch(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        return {
          text: data.output_text || extractOpenAIText(data),
          raw: data,
          stop_reason: data.status || "completed"
        };
      }

      const errorText = await response.text();
      const retryable = DEFAULT_RETRYABLE_STATUS_CODES.has(response.status);

      if (!retryable || attempt === 5) {
        throw new Error(`OpenAI error ${response.status}: ${errorText}`);
      }

      const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
      const backoffMs = retryAfterMs ?? exponentialBackoffMs(attempt);
      await sleep(backoffMs);
    } catch (error) {
      lastError = error;
      if (attempt === 5) throw error;
      await sleep(exponentialBackoffMs(attempt));
    }
  }

  throw lastError || new Error("Unknown OpenAI judge request failure");
}

function extractOpenAIText(data) {
  const parts = [];

  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        parts.push(content.text);
      }
    }
  }

  return parts.join("");
}
