const DEFAULT_EVAL_CONDITIONS = ["baseline", "production_constraint_prompt"];
const LEGACY_INCLUDE_LENGTH_CONTROL_CONDITIONS = ["baseline", "careful_control", "skill"];
const ALL_EVAL_CONDITIONS = [
  "baseline",
  "careful_control",
  "step_by_step_control",
  "constraint_axis_prompting",
  "constraint_check_no_enumeration",
  "style_matched_baseline",
  "production_constraint_prompt",
  "production_blocker_first_v6.3_candidate",
  "production_blocker_first_v6.4_candidate",
  "production_blocker_first_v6.5_candidate",
  "skill",
  "skill_concise"
];

export function getAnswerTemperature() {
  const provider = getAnswerProvider();
  const maxTemperature = provider === "openai" ? 2 : 1;
  return parseTemperature(process.env.ANSWER_TEMPERATURE, 0, "ANSWER_TEMPERATURE", maxTemperature);
}

export function getJudgeTemperature() {
  const provider = getJudgeProvider();
  const maxTemperature = provider === "openai" ? 2 : 1;
  return parseTemperature(process.env.JUDGE_TEMPERATURE, 0, "JUDGE_TEMPERATURE", maxTemperature);
}

export function getAnswerProvider() {
  return normalizeProvider(process.env.ANSWER_PROVIDER || "anthropic");
}

export function getAnswerModel() {
  const provider = getAnswerProvider();

  if (provider === "openai") {
    return process.env.OPENAI_ANSWER_MODEL || process.env.OPENAI_MODEL || "gpt-5.1";
  }

  if (provider === "google") {
    return process.env.GEMINI_ANSWER_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-pro";
  }

  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
}

export function getJudgeProvider() {
  return normalizeProvider(process.env.JUDGE_PROVIDER || "anthropic");
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

export function getStyleRewriteProvider() {
  return normalizeProvider(process.env.STYLE_REWRITE_PROVIDER || getAnswerProvider());
}

export function getStyleRewriteModel() {
  const provider = getStyleRewriteProvider();
  if (process.env.STYLE_REWRITE_MODEL) return process.env.STYLE_REWRITE_MODEL;
  if (provider === "openai") return process.env.OPENAI_ANSWER_MODEL || process.env.OPENAI_MODEL || "gpt-5.1";
  if (provider === "google") return process.env.GEMINI_ANSWER_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-pro";
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
}

export function getDoubleSwappedPairwise() {
  return parseBoolean(process.env.DOUBLE_SWAPPED_PAIRWISE, false);
}

export function getPrimaryCondition() {
  return process.env.PRIMARY_CONDITION || "production_constraint_prompt";
}

export function getPairwiseComparisons() {
  const raw = process.env.PAIRWISE_COMPARISONS || `${getPrimaryCondition()}:baseline`;
  const pairs = raw.split(",").map(value => value.trim()).filter(Boolean).map(parseConditionPair);

  if (pairs.length === 0) {
    throw new Error("PAIRWISE_COMPARISONS must contain at least one comparison like production_constraint_prompt:baseline.");
  }

  // Sort by comparison_id so PAIRWISE_COMPARISONS="a:b,c:d" and "c:d,a:b" produce
  // identical run_config_sha256 values and can resume each other without collision.
  return dedupePairs(pairs).sort((a, b) => (a.comparison_id < b.comparison_id ? -1 : 1));
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

    if (!requested.includes("baseline")) {
      throw new Error("EVAL_CONDITIONS must include baseline for paired/pairwise analysis.");
    }

    const canonical = canonicalizeEvalConditions(requested);
    validatePrimaryAndPairwiseConditions(canonical);
    return canonical;
  }

  const canonical = getIncludeLengthControl()
    ? canonicalizeEvalConditions(LEGACY_INCLUDE_LENGTH_CONTROL_CONDITIONS)
    : canonicalizeEvalConditions(DEFAULT_EVAL_CONDITIONS);
  validatePrimaryAndPairwiseConditions(canonical);
  return canonical;
}

export function isSameVendorJudge() {
  return getJudgeProvider() === getAnswerProvider();
}

export function getRunConfig() {
  return {
    answer_provider: getAnswerProvider(),
    answer_model: getAnswerModel(),
    answer_temperature: getAnswerTemperature(),
    judge_provider: getJudgeProvider(),
    judge_model: getJudgeModel(),
    judge_temperature: getJudgeTemperature(),
    double_swapped_pairwise: getDoubleSwappedPairwise(),
    include_length_control: getIncludeLengthControl(),
    eval_conditions: getEvalConditions(),
    case_dir: process.env.CASE_DIR || "cases",
    primary_condition: getPrimaryCondition(),
    pairwise_comparisons: getPairwiseComparisons(),
    style_rewrite_provider: getStyleRewriteProvider(),
    style_rewrite_model: getStyleRewriteModel()
  };
}

export function getAllowedEvalConditions() {
  return [...ALL_EVAL_CONDITIONS];
}

export function getSupportedProviders() {
  return ["anthropic", "openai", "google"];
}

function validatePrimaryAndPairwiseConditions(conditions) {
  const conditionSet = new Set(conditions);
  const primaryCondition = getPrimaryCondition();

  if (!ALL_EVAL_CONDITIONS.includes(primaryCondition)) {
    throw new Error(`Unknown PRIMARY_CONDITION: ${primaryCondition}. Allowed: ${ALL_EVAL_CONDITIONS.join(", ")}`);
  }

  if (!conditionSet.has(primaryCondition)) {
    throw new Error(`EVAL_CONDITIONS must include PRIMARY_CONDITION=${primaryCondition}.`);
  }

  for (const pair of getPairwiseComparisons()) {
    if (!conditionSet.has(pair.left_condition) || !conditionSet.has(pair.right_condition)) {
      throw new Error(
        `PAIRWISE_COMPARISONS contains ${pair.left_condition}:${pair.right_condition}, but both conditions must be included in EVAL_CONDITIONS.`
      );
    }
  }
}

function parseConditionPair(value) {
  const parts = value.split(":").map(part => part.trim()).filter(Boolean);

  if (parts.length !== 2) {
    throw new Error(`Invalid pairwise comparison "${value}". Use left:right, for example production_constraint_prompt:baseline.`);
  }

  const [left_condition, right_condition] = parts;

  for (const condition of [left_condition, right_condition]) {
    if (!ALL_EVAL_CONDITIONS.includes(condition)) {
      throw new Error(`Unknown pairwise comparison condition: ${condition}. Allowed: ${ALL_EVAL_CONDITIONS.join(", ")}`);
    }
  }

  if (left_condition === right_condition) {
    throw new Error(`Invalid pairwise comparison ${value}: left and right must differ.`);
  }

  return { left_condition, right_condition, comparison_id: `${left_condition}_vs_${right_condition}` };
}

function dedupePairs(pairs) {
  const seen = new Set();
  const deduped = [];

  for (const pair of pairs) {
    const key = `${pair.left_condition}:${pair.right_condition}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(pair);
  }

  return deduped;
}

function canonicalizeEvalConditions(conditions) {
  const unique = [...new Set(conditions)];
  return ALL_EVAL_CONDITIONS.filter(condition => unique.includes(condition));
}

function normalizeProvider(provider) {
  const normalized = String(provider || "anthropic").toLowerCase();
  if (normalized === "gemini") return "google";
  if (["anthropic", "openai", "google"].includes(normalized)) return normalized;
  throw new Error(`Unsupported provider: ${provider}. Allowed: anthropic, openai, google.`);
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
