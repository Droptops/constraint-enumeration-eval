import { callClaude } from "./anthropic.js";
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

export async function callAnswerModel({ provider, model, system, messages, maxTokens = 1200, temperature = 0 }) {
  const normalizedProvider = normalizeProvider(provider);

  if (normalizedProvider === "anthropic") {
    return await callClaude({ model, system, messages, maxTokens, temperature });
  }

  if (normalizedProvider === "openai") {
    return await callOpenAIAnswer({ model, system, messages, maxTokens, temperature });
  }

  if (normalizedProvider === "google") {
    return await callGeminiAnswer({ model, system, messages, maxTokens, temperature });
  }

  throw new Error(`Unsupported ANSWER_PROVIDER: ${provider}`);
}

export function normalizeProvider(provider) {
  const normalized = String(provider || "anthropic").toLowerCase();
  if (normalized === "gemini") return "google";
  if (["anthropic", "openai", "google"].includes(normalized)) return normalized;
  throw new Error(`Unsupported provider: ${provider}`);
}

async function callOpenAIAnswer({ model, system, messages, maxTokens, temperature }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY for ANSWER_PROVIDER=openai");
  }

  const body = maybeAddTemperature({
    model,
    input: [
      { role: "system", content: system },
      ...messages.map(message => ({ role: message.role, content: message.content }))
    ],
    max_output_tokens: maxTokens
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
        const extracted = extractOpenAIAnswerText(data);
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
        throw new ApiHttpError({ provider: "OpenAI", status: response.status, body: errorText, retryable });
      }

      const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
      await sleep(retryAfterMs ?? exponentialBackoffMs(attempt));
    } catch (error) {
      lastError = error;
      if (attempt === 5 || !shouldRetryTransportError(error)) throw error;
      await sleep(exponentialBackoffMs(attempt));
    }
  }

  throw lastError || new Error("Unknown OpenAI answer request failure");
}

async function callGeminiAnswer({ model, system, messages, maxTokens, temperature }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY for ANSWER_PROVIDER=google");
  }

  const body = maybeAddTemperature({
    contents: messages.map(message => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }]
    })),
    systemInstruction: {
      parts: [{ text: system }]
    },
    generationConfig: {
      maxOutputTokens: maxTokens,
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
          text: extractGeminiAnswerText(candidate),
          raw: data,
          stop_reason: normalizeGeminiFinishReason(candidate?.finishReason)
        };
      }

      const errorText = await response.text();
      const retryable = DEFAULT_RETRYABLE_STATUS_CODES.has(response.status);

      if (!retryable || attempt === 5) {
        throw new ApiHttpError({ provider: "Gemini", status: response.status, body: errorText, retryable });
      }

      const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
      await sleep(retryAfterMs ?? exponentialBackoffMs(attempt));
    } catch (error) {
      lastError = error;
      if (attempt === 5 || !shouldRetryTransportError(error)) throw error;
      await sleep(exponentialBackoffMs(attempt));
    }
  }

  throw lastError || new Error("Unknown Gemini answer request failure");
}

export function extractOpenAIAnswerText(data) {
  const parts = [];
  const refusals = [];

  for (const item of data.output || []) {
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

export function extractGeminiAnswerText(candidate) {
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
  return String(finishReason).toLowerCase();
}
