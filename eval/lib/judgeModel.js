import { callClaude } from "./anthropic.js";
import { getJudgeModel, getJudgeProvider } from "./config.js";
import {
  ApiHttpError,
  DEFAULT_RETRYABLE_STATUS_CODES,
  exponentialBackoffMs,
  parseRetryAfterMs,
  shouldRetryTransportError,
  sleep
} from "./retry.js";
import { getGeminiThinkingConfig, maybeAddTemperature } from "./sampling.js";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const GEMINI_GENERATE_URL = model =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

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

  if (provider === "google" || provider === "gemini") {
    return await callGeminiGenerateContent({
      model: getJudgeModel(),
      system,
      prompt,
      maxTokens,
      temperature,
      outputConfig
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

  const body = maybeAddTemperature({
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ],
    max_output_tokens: maxTokens,
    text: {
      format: {
        type: "json_schema",
        name: schemaName || "judge_response",
        strict: true,
        schema: outputConfig.format.schema
      }
    }
  }, { provider: "openai", model, temperature });

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
        const extracted = extractOpenAIText(data);
        return {
          text: extracted.text,
          raw: data,
          stop_reason: extracted.refusal ? "refusal" : data.status || "completed",
          refusal: extracted.refusal || null
        };
      }

      const errorText = await response.text();
      const retryable = DEFAULT_RETRYABLE_STATUS_CODES.has(response.status);

      if (!retryable || attempt === 5) {
        throw new ApiHttpError({
          provider: "OpenAI",
          status: response.status,
          body: errorText,
          retryable
        });
      }

      const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
      await sleep(retryAfterMs ?? exponentialBackoffMs(attempt));
    } catch (error) {
      lastError = error;
      if (attempt === 5 || !shouldRetryTransportError(error)) throw error;
      await sleep(exponentialBackoffMs(attempt));
    }
  }

  throw lastError || new Error("Unknown OpenAI judge request failure");
}

async function callGeminiGenerateContent({ model, system, prompt, maxTokens, temperature, outputConfig }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY for JUDGE_PROVIDER=google");
  }

  if (!outputConfig?.format?.schema) {
    throw new Error("Gemini structured judging requires outputConfig.format.schema.");
  }

  const body = maybeAddTemperature({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    systemInstruction: {
      parts: [{ text: system }]
    },
    generationConfig: {
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
      responseJsonSchema: outputConfig.format.schema,
      ...getGeminiThinkingConfig(model)
    }
  }, { provider: "google", model, temperature });

  let lastError;

  for (let attempt = 0; attempt <= 5; attempt++) {
    try {
      const response = await fetch(GEMINI_GENERATE_URL(model), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        const candidate = data.candidates?.[0];
        return {
          text: extractGeminiText(candidate),
          raw: data,
          stop_reason: normalizeGeminiFinishReason(candidate?.finishReason)
        };
      }

      const errorText = await response.text();
      const retryable = DEFAULT_RETRYABLE_STATUS_CODES.has(response.status);

      if (!retryable || attempt === 5) {
        throw new ApiHttpError({
          provider: "Gemini",
          status: response.status,
          body: errorText,
          retryable
        });
      }

      const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
      await sleep(retryAfterMs ?? exponentialBackoffMs(attempt));
    } catch (error) {
      lastError = error;
      if (attempt === 5 || !shouldRetryTransportError(error)) throw error;
      await sleep(exponentialBackoffMs(attempt));
    }
  }

  throw lastError || new Error("Unknown Gemini judge request failure");
}

export function extractOpenAIText(data) {
  const parts = [];
  const refusals = [];

  for (const item of data.output || []) {
    // Reasoning items intentionally contain no user-visible JSON and should not be joined.
    if (item.type === "reasoning") continue;

    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        parts.push(content.text);
      } else if (content.type === "refusal") {
        refusals.push(content.refusal || content.text || "refusal");
      }
    }
  }

  return {
    text: parts.join(""),
    refusal: refusals.length ? refusals.join("\n") : null
  };
}

function extractGeminiText(candidate) {
  return (candidate?.content?.parts || [])
    .filter(part => typeof part.text === "string")
    .map(part => part.text)
    .join("");
}

function normalizeGeminiFinishReason(finishReason) {
  if (!finishReason || finishReason === "STOP") return "completed";
  if (finishReason === "MAX_TOKENS") return "max_tokens";
  if (["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII"].includes(finishReason)) {
    return "refusal";
  }
  return finishReason.toLowerCase();
}
