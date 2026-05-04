import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { makeTimestampRunId, validateRunId } from "../lib/runId.js";

const caseDir = process.env.CASE_DIR || "cases_holdout_large";
const trials = process.env.TRIALS || "3";
const primaryCondition = process.env.PRIMARY_CONDITION || "production_constraint_prompt";
const evalConditions = process.env.EVAL_CONDITIONS || "baseline,careful_control,constraint_axis_prompting,style_matched_baseline,skill,production_constraint_prompt";
const pairwiseComparisons = process.env.PAIRWISE_COMPARISONS || "production_constraint_prompt:baseline,production_constraint_prompt:careful_control,production_constraint_prompt:constraint_axis_prompting,production_constraint_prompt:style_matched_baseline,production_constraint_prompt:skill";
const answerSpecs = parseSpecs(process.env.LAB_ANSWER_SPECS || "anthropic:claude-sonnet-4-6");
const judgeSpecs = parseSpecs(process.env.LAB_JUDGE_SPECS || "anthropic:claude-opus-4-7,openai:gpt-5.1,google:gemini-2.5-pro");
const primaryJudge = parseSpec(process.env.LAB_PRIMARY_JUDGE_SPEC || serializeSpec(judgeSpecs[0]));
const dryRun = process.env.DRY_RUN === "true";
const forceRerun = process.env.FORCE_RERUN === "true";
const runPrefix = validateRunId(process.env.LAB_RUN_PREFIX || makeTimestampRunId("frontier-lab"), "LAB_RUN_PREFIX");
const resultsDir = path.join(process.cwd(), "results");

fs.mkdirSync(resultsDir, { recursive: true });

const manifest = {
  created_at: new Date().toISOString(),
  lab_run_prefix: runPrefix,
  case_dir: caseDir,
  trials: Number(trials),
  primary_condition: primaryCondition,
  eval_conditions: evalConditions.split(","),
  pairwise_comparisons: pairwiseComparisons.split(","),
  answer_specs: answerSpecs,
  judge_specs: judgeSpecs,
  primary_judge: primaryJudge,
  runs: []
};

console.log(`# Frontier matrix: ${runPrefix}`);
console.log(`Cases: ${caseDir}; trials=${trials}`);
console.log(`Primary condition: ${primaryCondition}`);
console.log(`Answer specs: ${answerSpecs.map(serializeSpec).join(", ")}`);
console.log(`Judge specs: ${judgeSpecs.map(serializeSpec).join(", ")}`);
console.log("");

for (const answerSpec of answerSpecs) {
  const answerSlug = slug(`${answerSpec.provider}-${answerSpec.model}`);
  const runId = validateRunId(`${runPrefix}.${answerSlug}.${slug(`${primaryJudge.provider}-${primaryJudge.model}`)}`, "RUN_ID");
  const baseEnv = {
    ...process.env,
    RUN_ID: runId,
    CASE_DIR: caseDir,
    TRIALS: trials,
    PRIMARY_CONDITION: primaryCondition,
    EVAL_CONDITIONS: evalConditions,
    PAIRWISE_COMPARISONS: pairwiseComparisons,
    ANSWER_PROVIDER: answerSpec.provider,
    JUDGE_PROVIDER: primaryJudge.provider
  };
  applyModelEnv(baseEnv, "answer", answerSpec);
  applyModelEnv(baseEnv, "judge", primaryJudge);

  const source = {
    kind: "source_eval",
    answer_spec: answerSpec,
    judge_spec: primaryJudge,
    run_id: runId,
    summary_json: `results/${runId}.summary.json`,
    command: "npm run eval"
  };
  manifest.runs.push(source);
  runCommand("npm", ["run", "eval"], baseEnv, source);
  writePartialManifest();

  for (const judgeSpec of judgeSpecs) {
    if (judgeSpec.provider === primaryJudge.provider && judgeSpec.model === primaryJudge.model) continue;

    const rejudgeRunId = validateRunId(`${runId}.rejudge.${slug(`${judgeSpec.provider}-${judgeSpec.model}`)}`, "RUN_ID");
    const rejudgeEnv = {
      ...process.env,
      SOURCE_RUN_ID: runId,
      RUN_ID: rejudgeRunId,
      CASE_DIR: caseDir,
      PRIMARY_CONDITION: primaryCondition,
      EVAL_CONDITIONS: evalConditions,
      PAIRWISE_COMPARISONS: pairwiseComparisons,
      JUDGE_PROVIDER: judgeSpec.provider
    };
    applyModelEnv(rejudgeEnv, "judge", judgeSpec);

    const rejudge = {
      kind: "rejudge",
      answer_spec: answerSpec,
      source_run_id: runId,
      judge_spec: judgeSpec,
      run_id: rejudgeRunId,
      summary_json: `results/${rejudgeRunId}.summary.json`,
      command: "npm run rejudge"
    };
    manifest.runs.push(rejudge);
    runCommand("npm", ["run", "rejudge"], rejudgeEnv, rejudge);
    writePartialManifest();
  }
}

const manifestPath = path.join(resultsDir, `${runPrefix}.manifest.json`);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`\nManifest: ${manifestPath}`);
console.log(`Run report: LAB_MANIFEST=${manifestPath} npm run report:frontier`);

function runCommand(command, args, env, manifestEntry) {
  const printable = `${formatEnvForDisplay(env)} ${command} ${args.join(" ")}`;
  manifestEntry.command_preview = printable;

  if (!dryRun && !forceRerun && hasCompatibleSummary(manifestEntry)) {
    manifestEntry.status = "skipped_existing_summary";
    manifestEntry.exit_status = 0;
    console.log(`\n# Skipping completed run: ${manifestEntry.run_id}`);
    console.log(`# Existing summary: ${manifestEntry.summary_json}`);
    return;
  }

  console.log(`\n$ ${printable}`);

  if (dryRun) {
    manifestEntry.status = "dry_run";
    return;
  }

  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
    shell: false
  });

  manifestEntry.exit_status = result.status;
  manifestEntry.signal = result.signal || null;
  manifestEntry.status = result.status === 0 ? "completed" : "failed";

  if (result.status !== 0) {
    writePartialManifest();
    throw new Error(`Command failed (${result.status}): ${printable}`);
  }
}

function writePartialManifest() {
  fs.writeFileSync(path.join(resultsDir, `${runPrefix}.manifest.partial.json`), JSON.stringify(manifest, null, 2));
}

function hasCompatibleSummary(manifestEntry) {
  const summaryPath = path.resolve(process.cwd(), manifestEntry.summary_json);
  if (!fs.existsSync(summaryPath)) return false;

  try {
    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
    if (summary.run_id !== manifestEntry.run_id) return false;
    if (summary.judge_provider !== manifestEntry.judge_spec.provider) return false;
    if (summary.judge_model !== manifestEntry.judge_spec.model) return false;

    if (manifestEntry.kind === "source_eval") {
      const answerProvider = summary.answer_provider || summary.run_config?.answer_provider;
      const answerModel = summary.model_under_test || summary.run_config?.answer_model;
      return answerProvider === manifestEntry.answer_spec.provider
        && answerModel === manifestEntry.answer_spec.model
        && summary.run_config?.case_dir === caseDir
        && summary.run_config?.primary_condition === primaryCondition;
    }

    if (manifestEntry.kind === "rejudge") {
      return summary.rejudged_from_run_id === manifestEntry.source_run_id
        && summary.rejudge_config?.source_run_id === manifestEntry.source_run_id
        && summary.rejudge_config?.pairwise_seed_run_id === manifestEntry.source_run_id;
    }

    return false;
  } catch {
    return false;
  }
}

function parseSpecs(raw) {
  return raw.split(",").map(value => value.trim()).filter(Boolean).map(parseSpec);
}

function parseSpec(raw) {
  const [provider, ...modelParts] = raw.split(":");
  const model = modelParts.join(":");
  if (!provider || !model) throw new Error(`Invalid spec "${raw}". Use provider:model.`);
  const normalizedProvider = provider.toLowerCase() === "gemini" ? "google" : provider.toLowerCase();
  if (!["anthropic", "openai", "google"].includes(normalizedProvider)) {
    throw new Error(`Unsupported provider in spec "${raw}".`);
  }
  return { provider: normalizedProvider, model };
}

function serializeSpec(spec) {
  return `${spec.provider}:${spec.model}`;
}

function applyModelEnv(env, role, spec) {
  if (role === "answer") {
    if (spec.provider === "anthropic") env.ANTHROPIC_MODEL = spec.model;
    if (spec.provider === "openai") env.OPENAI_ANSWER_MODEL = spec.model;
    if (spec.provider === "google") env.GEMINI_ANSWER_MODEL = spec.model;
  } else if (role === "judge") {
    if (spec.provider === "anthropic") env.JUDGE_MODEL = spec.model;
    if (spec.provider === "openai") env.OPENAI_JUDGE_MODEL = spec.model;
    if (spec.provider === "google") env.GEMINI_JUDGE_MODEL = spec.model;
  }
}

function slug(value) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function formatEnvForDisplay(env) {
  const keys = [
    "RUN_ID",
    "SOURCE_RUN_ID",
    "CASE_DIR",
    "TRIALS",
    "ANSWER_PROVIDER",
    "ANTHROPIC_MODEL",
    "OPENAI_ANSWER_MODEL",
    "GEMINI_ANSWER_MODEL",
    "JUDGE_PROVIDER",
    "JUDGE_MODEL",
    "OPENAI_JUDGE_MODEL",
    "GEMINI_JUDGE_MODEL",
    "PRIMARY_CONDITION",
    "FORCE_RERUN"
  ];

  return keys
    .filter(key => env[key])
    .map(key => `${key}=${shellQuote(env[key])}`)
    .join(" ");
}

function shellQuote(value) {
  const stringValue = String(value);
  if (/^[A-Za-z0-9_.,:+=/@-]+$/.test(stringValue)) return stringValue;
  return `'${stringValue.replaceAll("'", "'\\''")}'`;
}
