const DEFAULT_EVAL_CONDITIONS = ["baseline", "skill"];
const LEGACY_INCLUDE_LENGTH_CONTROL_CONDITIONS = ["baseline", "careful_control", "skill"];
const ALL_EVAL_CONDITIONS = [
  "baseline",
  "careful_control",
  "step_by_step_control",
  "constraint_axis_prompting",
  "constraint_check_no_enumeration",
  "style_matched_baseline",
  "skill",
  "skill_concise"
];

export function getAnswerTemperature() {
  return parseTemperature(process.env.ANSWER_TEMPERATURE, 0, "ANSWER_TEMPERATURE", 1);
}

export function getJudgeTemperature() {
  const provider = getJudgeProvider();
  const maxTemperature = provider === "openai" ? 2 : 1;
  return parseTemperature(process.env.JUDGE_TEMPERATURE, 0, "JUDGE_TEMPERATURE", maxTemperature);
}

export function getAnswerModel() {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
}

export function getJudgeProvider() {
  return (process.env.JUDGE_PROVIDER || "anthropic").toLowerCase();
}

export function getJudgeModel() {
  const provider = getJudgeProvider();

  if (provider === "openai") {
    return process.env.OPENAI_JUDGE_MODEL || "gpt-5.1";
  }

  if (provider === "google" || provider === "gemini") {
    return process.env.GEMINI_JUDGE_MODEL || "gemini-2.5-pro";
  }

  return process.env.JUDGE_MODEL || "claude-opus-4-7";
}

export function getStyleRewriteModel() {
  return process.env.STYLE_REWRITE_MODEL || getAnswerModel();
}

export function getDoubleSwappedPairwise() {
  return parseBoolean(process.env.DOUBLE_SWAPPED_PAIRWISE, false);
}

export function getIncludeLengthControl() {
  return parseBoolean(process.env.INCLUDE_LENGTH_CONTROL, false);
}

export function getEvalConditions() {
  if (process.env.EVAL_CONDITIONS) {
    const requested = process.env.EVAL_CONDITIONS.split(",").map(value => value.trim()).filter(Boolean);

    if (requested.length === 0) {
      throw new Error("EVAL_CONDITIONS must include at least one condition.");
    }

    for (const condition of requested) {
      if (!ALL_EVAL_CONDITIONS.includes(condition)) {
        throw new Error(`Unknown EVAL_CONDITIONS entry: ${condition}. Allowed: ${ALL_EVAL_CONDITIONS.join(", ")}`);
      }
    }

    if (!requested.includes("baseline") || !requested.includes("skill")) {
      throw new Error("EVAL_CONDITIONS must include both baseline and skill for paired/pairwise analysis.");
    }

    return canonicalizeEvalConditions(requested);
  }

  if (getIncludeLengthControl()) return canonicalizeEvalConditions(LEGACY_INCLUDE_LENGTH_CONTROL_CONDITIONS);
  return canonicalizeEvalConditions(DEFAULT_EVAL_CONDITIONS);
}

export function isSameVendorJudge() {
  return getJudgeProvider() === "anthropic";
}

export function getRunConfig() {
  return {
    answer_model: getAnswerModel(),
    answer_temperature: getAnswerTemperature(),
    judge_provider: getJudgeProvider(),
    judge_model: getJudgeModel(),
    judge_temperature: getJudgeTemperature(),
    double_swapped_pairwise: getDoubleSwappedPairwise(),
    include_length_control: getIncludeLengthControl(),
    eval_conditions: getEvalConditions(),
    style_rewrite_model: getStyleRewriteModel()
  };
}

export function getAllowedEvalConditions() {
  return [...ALL_EVAL_CONDITIONS];
}

function canonicalizeEvalConditions(conditions) {
  const unique = [...new Set(conditions)];
  return ALL_EVAL_CONDITIONS.filter(condition => unique.includes(condition));
}

function parseTemperature(value, fallback, name, max = 1) {
  if (value === undefined || value === null || value === "") return fallback;

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) {
    throw new Error(`${name} must be a number between 0 and ${max}.`);
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
