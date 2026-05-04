import fs from "fs";
import path from "path";

import { loadAllCases } from "../lib/loadCases.js";
import { loadSkillPrompt } from "../lib/loadSkill.js";
import { judgeAnswer } from "../lib/judge.js";
import { judgePairwise, PAIRWISE_MODES } from "../lib/pairwiseJudge.js";
import { scoreJudgment } from "../lib/score.js";
import { summarizeResults, summarizePairwise } from "../lib/metrics.js";
import { sha256, stableJson } from "../lib/hash.js";
import {
  appendJsonl,
  assertResumeHashes,
  loadCompletedResults,
  pairwiseKey,
  readJsonlSafe,
  resultKey
} from "../lib/jsonl.js";
import {
  getDoubleSwappedPairwise,
  getPairwiseComparisons,
  getJudgeModel,
  getJudgeProvider,
  getJudgeTemperature
} from "../lib/config.js";
import { makeTimestampRunId, validateRunId } from "../lib/runId.js";
import { textStats } from "../lib/runBatch.js";

const sourceRunId = validateRunId(process.env.SOURCE_RUN_ID, "SOURCE_RUN_ID");
const runId = validateRunId(
  process.env.RUN_ID || `${sourceRunId}.rejudge.${getJudgeProvider()}.${makeTimestampRunId()}`,
  "RUN_ID"
);

const resultsDir = path.join(process.cwd(), "results");
const sourcePath = path.join(resultsDir, `${sourceRunId}.results.jsonl`);
const sourceSummaryPath = path.join(resultsDir, `${sourceRunId}.summary.json`);
const outputPath = path.join(resultsDir, `${runId}.results.jsonl`);
const summaryPath = path.join(resultsDir, `${runId}.summary.json`);

const source = readJsonlSafe(sourcePath);

if (source.records.length === 0) {
  throw new Error(`No source records found at ${sourcePath}`);
}

const sourceSummary = fs.existsSync(sourceSummaryPath)
  ? JSON.parse(fs.readFileSync(sourceSummaryPath, "utf8"))
  : null;

const allCases = loadAllCases();
const caseById = new Map(allCases.map(testCase => [testCase.id, testCase]));
const skillHash = sha256(loadSkillPrompt());
const casesHash = sha256(stableJson(allCases.map(({ source_file, ...rest }) => rest)));

const sourceRunConfig = sourceSummary?.run_config || null;
const sourceRunConfigHash = sourceSummary?.run_config_sha256 || source.records[0]?.run_config_sha256 || null;
const sourceModelUnderTest = sourceSummary?.model_under_test || sourceRunConfig?.answer_model || null;
const sourceAnswerTemperature = sourceSummary?.answer_temperature ?? sourceRunConfig?.answer_temperature ?? null;
const sourceEvaluatedCaseIds = sourceSummary?.evaluated_case_ids || [...new Set(source.records.map(record => record.caseId))];

const pairwiseComparisons = getPairwiseComparisons();

const rejudgeConfig = {
  rejudge_only: true,
  source_run_id: sourceRunId,
  source_run_config_sha256: sourceRunConfigHash,
  judge_provider: getJudgeProvider(),
  judge_model: getJudgeModel(),
  judge_temperature: getJudgeTemperature(),
  double_swapped_pairwise: getDoubleSwappedPairwise(),
  pairwise_seed_run_id: sourceRunId,
  pairwise_comparisons: pairwiseComparisons
};
const rejudgeConfigHash = sha256(stableJson(rejudgeConfig));

assertResumeHashes(source.records, {
  skill_sha256: skillHash,
  cases_sha256: casesHash,
  fileLabel: sourcePath
});

fs.mkdirSync(resultsDir, { recursive: true });

const outputState = loadCompletedResults(outputPath, resultKey);
assertResumeHashes(outputState.results, {
  skill_sha256: skillHash,
  cases_sha256: casesHash,
  run_config_sha256: rejudgeConfigHash,
  fileLabel: outputPath
});

const rejudgedResults = outputState.results;
const completedAbsolute = outputState.completedKeys;

console.log(`Rejudging source run: ${sourceRunId}`);
console.log(`New run: ${runId}`);
console.log(`Judge provider: ${getJudgeProvider()}`);
console.log(`Judge model: ${getJudgeModel()} @ T=${getJudgeTemperature()}`);
console.log(`Pairwise seed run: ${sourceRunId}`);
console.log(`Existing rejudged absolute results: ${rejudgedResults.length}`);

for (const record of source.records) {
  const key = resultKey(record);

  if (completedAbsolute.has(key)) {
    console.log(`Skipping completed rejudge result: ${key}`);
    continue;
  }

  const testCase = caseById.get(record.caseId);

  if (!testCase) {
    console.warn(`Skipping unknown case: ${record.caseId}`);
    continue;
  }

  console.log(`Rejudging ${key}`);

  const judgment = await judgeAnswer({ testCase, answer: record.answer });
  const score = scoreJudgment(judgment);

  const result = {
    ...record,
    rejudged_from_run_id: sourceRunId,
    source_run_config_sha256: sourceRunConfigHash,
    judge_provider: getJudgeProvider(),
    judge_model: getJudgeModel(),
    judge_temperature: getJudgeTemperature(),
    skill_sha256: skillHash,
    cases_sha256: casesHash,
    run_config_sha256: rejudgeConfigHash,
    rejudge_config_sha256: rejudgeConfigHash,
    answer_stats: record.answer_stats || textStats(record.answer),
    judgment,
    score
  };

  appendJsonl(outputPath, result);
  completedAbsolute.add(key);
  rejudgedResults.push(result);
}

const byKey = new Map(rejudgedResults.map(result => [resultKey(result), result]));
const positionOrders = getDoubleSwappedPairwise() ? ["left_a", "right_a"] : ["seeded"];
const pairwiseSummaries = {};
const pairwiseFiles = {};
const skippedBadPairwiseLines = {};

for (const mode of PAIRWISE_MODES) {
  const pairwisePath = path.join(resultsDir, `${runId}.pairwise.${mode}.jsonl`);
  const pairwiseState = loadCompletedResults(pairwisePath, pairwiseKey);
  assertResumeHashes(pairwiseState.results, {
    skill_sha256: skillHash,
    cases_sha256: casesHash,
    run_config_sha256: rejudgeConfigHash,
    fileLabel: pairwisePath
  });

  const pairwiseResults = pairwiseState.results;
  const completedPairwise = pairwiseState.completedKeys;
  skippedBadPairwiseLines[mode] = pairwiseState.skipped_bad_lines;

  console.log(`Existing ${mode} pairwise rejudge results: ${pairwiseResults.length}`);

  for (const testCase of allCases) {
    const trials = new Set(
      rejudgedResults
        .filter(result => result.caseId === testCase.id)
        .map(result => result.trial)
    );

    for (const trial of trials) {
      for (const comparison of pairwiseComparisons) {
        const left = byKey.get(resultKey({ caseId: testCase.id, condition: comparison.left_condition, trial }));
        const right = byKey.get(resultKey({ caseId: testCase.id, condition: comparison.right_condition, trial }));

        if (!left || !right) continue;

        for (const positionOrder of positionOrders) {
          const key = pairwiseKey({
            caseId: testCase.id,
            trial,
            position_order: positionOrder,
            left_condition: comparison.left_condition,
            right_condition: comparison.right_condition
          });

          if (completedPairwise.has(key)) {
            console.log(`Skipping completed ${mode} pairwise rejudge: ${key}`);
            continue;
          }

          const pairwise = await judgePairwise({
            testCase,
            leftAnswer: left.answer,
            rightAnswer: right.answer,
            leftCondition: comparison.left_condition,
            rightCondition: comparison.right_condition,
            seedRunId: sourceRunId,
            trial,
            mode,
            positionOrder
          });

          const pairwiseResult = {
            caseId: testCase.id,
            category: testCase.category,
            trial,
            mode,
            comparison_id: comparison.comparison_id,
            left_condition: comparison.left_condition,
            right_condition: comparison.right_condition,
            position_order: positionOrder,
            pairwise_seed_run_id: sourceRunId,
            requires_direct_answer: testCase.requires_direct_answer,
            clarification_expected: testCase.clarification_expected,
            skill_sha256: skillHash,
            cases_sha256: casesHash,
            run_config_sha256: rejudgeConfigHash,
            rejudge_config_sha256: rejudgeConfigHash,
            source_run_config_sha256: sourceRunConfigHash,
            pairwise,
            winner_condition: pairwise.winner_condition
          };

          appendJsonl(pairwisePath, pairwiseResult);
          completedPairwise.add(key);
          pairwiseResults.push(pairwiseResult);
        }
      }
    }
  }

  pairwiseFiles[mode] = `results/${runId}.pairwise.${mode}.jsonl`;
  pairwiseSummaries[mode] = summarizePairwise(pairwiseResults);
}

const artifact = {
  run_id: runId,
  rejudged_from_run_id: sourceRunId,
  created_at: new Date().toISOString(),
  rejudge_only: true,
  model_under_test: sourceModelUnderTest,
  original_answer_temperature: sourceAnswerTemperature,
  judge_provider: getJudgeProvider(),
  judge_model: getJudgeModel(),
  judge_temperature: getJudgeTemperature(),
  double_swapped_pairwise: getDoubleSwappedPairwise(),
  pairwise_seed_run_id: sourceRunId,
  pairwise_comparisons: pairwiseComparisons,
  skill_sha256: skillHash,
  cases_sha256: casesHash,
  source_run_config_sha256: sourceRunConfigHash,
  run_config_sha256: rejudgeConfigHash,
  rejudge_config_sha256: rejudgeConfigHash,
  source_run_config: sourceRunConfig,
  rejudge_config: rejudgeConfig,
  evaluated_case_ids: sourceEvaluatedCaseIds,
  skipped_bad_jsonl_lines: {
    source_absolute: source.skipped_bad_lines,
    rejudged_absolute: outputState.skipped_bad_lines,
    pairwise_gold_anchored: skippedBadPairwiseLines.gold_anchored,
    pairwise_gold_blind: skippedBadPairwiseLines.gold_blind
  },
  absolute_summary: summarizeResults(rejudgedResults),
  pairwise_gold_anchored_summary: pairwiseSummaries.gold_anchored,
  pairwise_gold_blind_summary: pairwiseSummaries.gold_blind,
  result_files: {
    absolute_results_jsonl: `results/${runId}.results.jsonl`,
    pairwise_gold_anchored_jsonl: pairwiseFiles.gold_anchored,
    pairwise_gold_blind_jsonl: pairwiseFiles.gold_blind,
    summary_json: `results/${runId}.summary.json`
  }
};

fs.writeFileSync(summaryPath, JSON.stringify(artifact, null, 2));

console.log(`Rejudge complete: ${summaryPath}`);
