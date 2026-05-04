export function getAnswerTemperature() {
  return parseTemperature(process.env.ANSWER_TEMPERATURE, 0, "ANSWER_TEMPERATURE");
}

export function getJudgeTemperature() {
  return parseTemperature(process.env.JUDGE_TEMPERATURE, 0, "JUDGE_TEMPERATURE");
}

export function getAnswerModel() {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
}

export function getJudgeProvider() {
  return (process.env.JUDGE_PROVIDER || "anthropic").toLowerCase();
}

export function getJudgeModel() {
  if (getJudgeProvider() === "openai") {
    return process.env.OPENAI_JUDGE_MODEL || "gpt-4o-2024-08-06";
  }

  return process.env.JUDGE_MODEL || "claude-opus-4-7";
}

export function getDoubleSwappedPairwise() {
  return parseBoolean(process.env.DOUBLE_SWAPPED_PAIRWISE, false);
}

export function getIncludeLengthControl() {
  return parseBoolean(process.env.INCLUDE_LENGTH_CONTROL, false);
}

export function getEvalConditions() {
  const conditions = ["baseline", "skill"];
  if (getIncludeLengthControl()) conditions.splice(1, 0, "careful_control");
  return conditions;
}

export function isSameVendorJudge() {
  return getJudgeProvider() !== "openai";
}

function parseTemperature(value, fallback, name) {
  if (value === undefined || value === null || value === "") return fallback;

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error(`${name} must be a number between 0 and 1.`);
  }

  return parsed;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  throw new Error(`Expected boolean-like value, got ${value}.`);
}
