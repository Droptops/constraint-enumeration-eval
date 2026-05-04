import fs from "fs";
import path from "path";

import { loadAllCases } from "../lib/loadCases.js";
import { loadSkillPrompt } from "../lib/loadSkill.js";
import { judgeAnswer } from "../lib/judge.js";
import { judgePairwise, PAIRWISE_MODES } from "../lib/pairwiseJudge.js";
import { scoreJudgment } from "../lib/score.js";
import { summarizeResults, summarizePairwise } from "../lib/metrics.js";
import { sha256, stableJson } from "../lib/hash.js";
import { appendJsonl, readJsonlSafe, resultKey } from "../lib/jsonl.js";
import {
  getAnswerModel,
  getAnswerTemperature,
  getDoubleSwappedPairwise,
  getJudgeModel,
  getJudgeProvider,
  getJudgeTemperature
} from "../lib/config.js";

const sourceRunId = process.env.SOURCE_RUN_ID;

if (!sourceRunId) {
  throw new Error("SOURCE_RUN_ID is required. Example: SOURCE_RUN_ID=run-123 JUDGE_PROVIDER=openai npm run rejudge");
}

const runId = process.env.RUN_ID || `${sourceRunId}.rejudge.${getJudgeProvider()}.${new Date().toISOString().replace(/[:.]/g, "-")}`;
const resultsDir = path.join(process.cwd(), "results");
const sourcePath = path.join(resultsDir, `${sourceRunId}.results.jsonl`);
const outputPath = path.join(resultsDir, `${runId}.results.jsonl`);
const summaryPath = path.join(resultsDir, `${runId}.summary.json`);

const source = readJsonlSafe(sourcePath);

if (source.records.length === 0) {
  throw new Error(`No source records found at ${sourcePath}`);
}

const allCases = loadAllCases();
const caseById = new Map(allCases.map(testCase => [testCase.id, testCase]));
const skillHash = sha256(loadSkillPrompt());
const casesHash = sha256(stableJson(allCases.map(({ source_file, ...rest }) => rest)));

fs.mkdirSync(resultsDir, { recursive: true });

const rejudgedResults = [];

console.log(`Rejudging source run: ${sourceRunId}`);
console.log(`New run: ${runId}`);
console.log(`Judge provider: ${getJudgeProvider()}`);
console.log(`Judge model: ${getJudgeModel()} @ T=${getJudgeTemperature()}`);

for (const record of source.records) {
  const testCase = caseById.get(record.caseId);

  if (!testCase) {
    console.warn(`Skipping unknown case: ${record.caseId}`);
    continue;
  }

  console.log(`Rejudging ${record.caseId}:${record.condition}:${record.trial}`);

  const judgment = await judgeAnswer({ testCase, answer: record.answer });
  const score = scoreJudgment(judgment);

  const result = {
    ...record,
    rejudged_from_run_id: sourceRunId,
    judge_provider: getJudgeProvider(),
    judge_model: getJudgeModel(),
    judge_temperature: getJudgeTemperature(),
    skill_sha256: skillHash,
    cases_sha256: casesHash,
    judgment,
    score
  };

  appendJsonl(outputPath, result);
  rejudgedResults.push(result);
}

const byKey = new Map(rejudgedResults.map(result => [resultKey(result), result]));
const positionOrders = getDoubleSwappedPairwise() ? ["skill_a", "baseline_a"] : ["seeded"];
const pairwiseSummaries = {};
const pairwiseFiles = {};

for (const mode of PAIRWISE_MODES) {
  const pairwisePath = path.join(resultsDir, `${runId}.pairwise.${mode}.jsonl`);
  const pairwiseResults = [];

  for (const testCase of allCases) {
    const trials = new Set(
      rejudgedResults
        .filter(result => result.caseId === testCase.id)
        .map(result => result.trial)
    );

    for (const trial of trials) {
      const baseline = byKey.get(resultKey({ caseId: testCase.id, condition: "baseline", trial }));
      const skill = byKey.get(resultKey({ caseId: testCase.id, condition: "skill", trial }));

      if (!baseline || !skill) continue;

      for (const positionOrder of positionOrders) {
        const pairwise = await judgePairwise({
          testCase,
          baselineAnswer: baseline.answer,
          skillAnswer: skill.answer,
          runId,
          trial,
          mode,
          positionOrder
        });

        const pairwiseResult = {
          caseId: testCase.id,
          category: testCase.category,
          trial,
          mode,
          position_order: positionOrder,
          requires_direct_answer: testCase.requires_direct_answer,
          clarification_expected: testCase.clarification_expected,
          skill_sha256: skillHash,
          cases_sha256: casesHash,
          pairwise,
          winner_condition: pairwise.winner_condition
        };

        appendJsonl(pairwisePath, pairwiseResult);
        pairwiseResults.push(pairwiseResult);
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
  model_under_test: getAnswerModel(),
  original_answer_temperature: getAnswerTemperature(),
  judge_provider: getJudgeProvider(),
  judge_model: getJudgeModel(),
  judge_temperature: getJudgeTemperature(),
  double_swapped_pairwise: getDoubleSwappedPairwise(),
  skill_sha256: skillHash,
  cases_sha256: casesHash,
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
