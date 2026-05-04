export function shouldOmitAnthropicSamplingParams(model) {
  const normalized = String(model || "").toLowerCase();
  // Claude Opus 4.7 rejects explicit sampling parameters. Revisit this map
  // whenever Anthropic introduces new models with similar restrictions.
  return normalized.startsWith("claude-opus-4-7");
}

export function shouldOmitOpenAISamplingParams(model) {
  const normalized = String(model || "").toLowerCase();
  // OpenAI reasoning-family models commonly reject or ignore explicit sampling
  // params. Keep this conservative so switching OPENAI_JUDGE_MODEL to o1/o3/o4
  // or GPT-5-style reasoning models does not 400 on temperature.
  return (
    normalized.startsWith("o1") ||
    normalized.startsWith("o3") ||
    normalized.startsWith("o4") ||
    normalized.startsWith("gpt-5")
  );
}

export function shouldOmitSamplingParams({ provider, model }) {
  const normalizedProvider = String(provider || "").toLowerCase();

  if (normalizedProvider === "anthropic") {
    return shouldOmitAnthropicSamplingParams(model);
  }

  if (normalizedProvider === "openai") {
    return shouldOmitOpenAISamplingParams(model);
  }

  return false;
}

/**
 * Returns the thinkingConfig object to spread into generationConfig for Gemini models.
 * - Gemini 3: uses thinkingLevel (not thinkingBudget)
 * - Gemini 2.5 Pro: thinkingBudget range is 128–32768; cannot be disabled
 * - Gemini 2.5 Flash/Flash-Lite: thinkingBudget can be 0 to disable thinking
 * - All other models: no thinkingConfig
 */
export function getGeminiThinkingConfig(model) {
  const m = String(model || "").toLowerCase();
  if (m.includes("gemini-3")) {
    return { thinkingConfig: { thinkingLevel: "low" } };
  }
  if (m.includes("gemini-2.5-pro")) {
    return { thinkingConfig: { thinkingBudget: 128 } }; // minimum valid for Pro; cannot disable
  }
  if (m.includes("gemini-2.5-flash")) {
    return { thinkingConfig: { thinkingBudget: 0 } }; // Flash supports 0 to disable thinking
  }
  return {};
}

export function maybeAddTemperature(body, { provider = "anthropic", model, temperature }) {
  if (temperature === undefined || temperature === null) return body;
  if (shouldOmitSamplingParams({ provider, model })) return body;

  if (["google", "gemini"].includes(String(provider || "").toLowerCase())) {
    body.generationConfig ||= {};
    body.generationConfig.temperature = temperature;
    return body;
  }

  body.temperature = temperature;
  return body;
}
