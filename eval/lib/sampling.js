export function shouldOmitAnthropicSamplingParams(model) {
  const normalized = String(model || "").toLowerCase();
  return normalized.startsWith("claude-opus-4-7");
}

export function maybeAddTemperature(body, { model, temperature }) {
  if (temperature === undefined || temperature === null) return body;
  if (shouldOmitAnthropicSamplingParams(model)) return body;
  body.temperature = temperature;
  return body;
}
