import {
  ApiHttpError,
  DEFAULT_RETRYABLE_STATUS_CODES,
  exponentialBackoffMs,
  parseRetryAfterMs,
  shouldRetryTransportError,
  sleep
} from "./retry.js";
import { maybeAddTemperature } from "./sampling.js";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export async function callClaude({
  model,
  system,
  messages,
  maxTokens = 1000,
  temperature = 0,
  outputConfig,
  maxRetries = 5
}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }

  if (!model) {
    throw new Error("Missing model");
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("messages must be a non-empty array");
  }

  const body = maybeAddTemperature(
    {
      model,
      max_tokens: maxTokens,
      messages
    },
    { provider: "anthropic", model, temperature }
  );

  if (system) body.system = system;
  if (outputConfig) body.output_config = outputConfig;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": process.env.ANTHROPIC_VERSION || "2023-06-01"
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();

        return {
          text: data.content?.find(block => block.type === "text")?.text || "",
          raw: data,
          stop_reason: data.stop_reason
        };
      }

      const errorText = await response.text();
      const retryable = DEFAULT_RETRYABLE_STATUS_CODES.has(response.status);

      if (!retryable || attempt === maxRetries) {
        throw new ApiHttpError({
          provider: "Anthropic",
          status: response.status,
          body: errorText,
          retryable
        });
      }

      const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
      await sleep(retryAfterMs ?? exponentialBackoffMs(attempt));
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetryTransportError(error)) {
        throw error;
      }

      await sleep(exponentialBackoffMs(attempt));
    }
  }

  throw lastError || new Error("Unknown Anthropic request failure");
}
