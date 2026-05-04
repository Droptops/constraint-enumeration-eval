import fs from "fs";
import path from "path";

import {
  getAnswerModel,
  getAnswerTemperature,
  getDoubleSwappedPairwise,
  getJudgeModel,
  getJudgeProvider,
  getJudgeTemperature,
  getEvalConditions,
  isSameVendorJudge
} from "./config.js";
import { loadSkillPrompt } from "./loadSkill.js";
import { generateAnswer } from "./runCase.js";
import { judgeAnswer } from "./judge.js";
import { judgePairwise, PAIRWISE_MODES } from "./pairwiseJudge.js";
import { scoreJudgment } from "./score.js";
import { summarizeResults, summarizePairwise } from "./metrics.js";
import { sha256, stableJson } from "./hash.js";
import {
  appendJsonl,
  assertResumeHashes,
  loadCompletedResults,
  pairwiseKey,
  resultKey
} from "./jsonl.js";

export function selectDiverseCases(allCases, limit) {
  const byCategory = new Map();

  for (const testCase of allCases) {
    if (!byCategory.has(testCase.category)) {
      byCategory.set(testCase.category, []);
    }
    byCategory.get(testCase.category).push(testCase);
  }

  const categories = Array.from(byCategory.keys()).sort();
  const selected = [];

  while (selected.length < limit) {
    let added = false;

    for (const category of categories) {
      const bucket = byCategory.get(category);
      const next = bucket.shift();

      if (next) {
        selected.push(next);
        added = true;
      }

      if (selected.length >= limit) break;
    }

    if (!added) break;
  }

  return selected;
}

function buildResultMap(results) {
  return new Map(results.map(result => [resultKey(result), result]));
}

function semanticCasesHash(casesForHash) {
  return sha256(stableJson(casesForHash.map(({ source_file, ...rest }) => rest)));
}

function makePairwisePaths(resultsDir, runId) {
  return Object.fromEntries(
    PAIRWISE_MODES.map(mode => [mode, path.join(resultsDir, `${runId}.pairwise.${mode}.jsonl`)])
  );
}

export async function runBatch({
  runId,
  cases,
  allCasesForHash = cases,
  trials = 1,
  resultsDir = path.join(process.cwd(), "results"),
  smokeTest = false,
  log = () => {}
}) {
  if (!runId || typeof runId !== "string") {
    throw new Error("runBatch requires a runId string.");
  }

  if (!Array.isArray(cases) || cases.length === 0) {
    throw new Error("runBatch requires at least one case.");
  }

  if (!Number.isInteger(trials) || trials < 1) {
    throw new Error("runBatch requires trials to be a positive integer.");
  }

  fs.mkdirSync(resultsDir, { recursive: true });

  const absolutePath = path.join(resultsDir, `${runId}.results.jsonl`);
  const summaryPath = path.join(resultsDir, `${runId}.summary.json`);
  const pairwisePaths = makePairwisePaths(resultsDir, runId);

  const skill = loadSkillPrompt();
  const skillHash = sha256(skill);
  const casesHash = semanticCasesHash(allCasesForHash);

  const absoluteState = loadCompletedResults(absolutePath, resultKey);
  assertResumeHashes(absoluteState.results, {
    skill_sha256: skillHash,
    cases_sha256: casesHash,
    fileLabel: absolutePath
  });

  const pairwiseStates = Object.fromEntries(
    PAIRWISE_MODES.map(mode => {
      const state = loadCompletedResults(pairwisePaths[mode], pairwiseKey);
      assertResumeHashes(state.results, {
        skill_sha256: skillHash,
        cases_sha256: casesHash,
        fileLabel: pairwisePaths[mode]
      });
      return [mode, state];
    })
  );

  const positionOrders = getDoubleSwappedPairwise() ? ["skill_a", "baseline_a"] : ["seeded"];
  const absoluteResults = absoluteState.results;
  const absoluteMap = buildResultMap(absoluteResults);

  log(`Run: ${runId}`);
  log(`Cases evaluated: ${cases.length}`);
  log(`Case corpus hashed: ${allCasesForHash.length}`);
  log(`Categories: ${[...new Set(cases.map(c => c.category))].join(", ")}`);
  log(`Trials: ${trials}`);
  log(`Answer model: ${getAnswerModel()} @ T=${getAnswerTemperature()}`);
  log(`Judge provider: ${getJudgeProvider()}`);
  log(`Judge model: ${getJudgeModel()} @ T=${getJudgeTemperature()}`);
  if (isSameVendorJudge()) {
    log("WARNING: same-vendor judge path. Treat results as directional unless confirmed by another judge family.");
  }
  log(`Existing absolute results: ${absoluteResults.length}`);

  for (const testCase of cases) {
    for (let trial = 1; trial <= trials; trial++) {
      for (const condition of getEvalConditions()) {
        const key = resultKey({ caseId: testCase.id, condition, trial });

        if (absoluteState.completedKeys.has(key)) {
          log(`Skipping completed absolute result: ${key}`);
          continue;
        }

        log(`Running ${key}`);

        const answer = await generateAnswer({ testCase, condition });
        const judgment = await judgeAnswer({ testCase, answer });
        const score = scoreJudgment(judgment);

        const result = {
          caseId: testCase.id,
          category: testCase.category,
          condition,
          trial,
          prompt: testCase.prompt,
          expected_final_answer: testCase.expected_final_answer,
          acceptable_final_answers: testCase.acceptable_final_answers,
          requires_direct_answer: testCase.requires_direct_answer,
          clarification_expected: testCase.clarification_expected,
          skill_sha256: skillHash,
          cases_sha256: casesHash,
          answer,
          judgment,
          score
        };

        appendJsonl(absolutePath, result);
        absoluteState.completedKeys.add(key);
        absoluteResults.push(result);
        absoluteMap.set(key, result);

        log(`Completed ${key}: pass=${score.pass}, constraint_failure=${score.constraint_failure}`);
      }
    }
  }

  for (const mode of PAIRWISE_MODES) {
    const state = pairwiseStates[mode];
    const pairwiseResults = state.results;
    log(`Existing ${mode} pairwise results: ${pairwiseResults.length}`);

    for (const testCase of cases) {
      for (let trial = 1; trial <= trials; trial++) {
        const baseline = absoluteMap.get(resultKey({ caseId: testCase.id, condition: "baseline", trial }));
        const skillResult = absoluteMap.get(resultKey({ caseId: testCase.id, condition: "skill", trial }));

        if (!baseline || !skillResult) {
          log(`Missing absolute results for pairwise case=${testCase.id}, trial=${trial}`);
          continue;
        }

        for (const positionOrder of positionOrders) {
          const key = pairwiseKey({ caseId: testCase.id, trial, position_order: positionOrder });

          if (state.completedKeys.has(key)) {
            log(`Skipping completed ${mode} pairwise result: ${key}`);
            continue;
          }

          log(`Running ${mode} pairwise ${key}`);

          const pairwise = await judgePairwise({
            testCase,
            baselineAnswer: baseline.answer,
            skillAnswer: skillResult.answer,
            runId,
            trial,
            mode,
            positionOrder
          });

          const pairwiseResult = {
            caseId: testCase.id,
            category: testCase.category,
            trial,
            requires_direct_answer: testCase.requires_direct_answer,
            clarification_expected: testCase.clarification_expected,
            mode,
            position_order: positionOrder,
            skill_sha256: skillHash,
            cases_sha256: casesHash,
            pairwise,
            winner_condition: pairwise.winner_condition
          };

          appendJsonl(pairwisePaths[mode], pairwiseResult);
          state.completedKeys.add(key);
          pairwiseResults.push(pairwiseResult);

          log(`Completed ${mode} pairwise ${key}: winner=${pairwise.winner_condition}`);
        }
      }
    }
  }

  const absoluteSummary = summarizeResults(absoluteResults);
  const pairwiseSummaries = Object.fromEntries(
    PAIRWISE_MODES.map(mode => [mode, summarizePairwise(pairwiseStates[mode].results)])
  );

  const artifact = {
    run_id: runId,
    created_at: new Date().toISOString(),
    smoke_test: smokeTest,
    model_under_test: getAnswerModel(),
    judge_provider: getJudgeProvider(),
    judge_model: getJudgeModel(),
    answer_temperature: getAnswerTemperature(),
    judge_temperature: getJudgeTemperature(),
    publishability_warning: isSameVendorJudge()
      ? "Default judge path is same-vendor Anthropic cross-tier. Treat as directional unless confirmed by a second judge family."
      : null,
    double_swapped_pairwise: getDoubleSwappedPairwise(),
    skill_sha256: skillHash,
    cases_sha256: casesHash,
    cases_sha256_scope: "all_cases_corpus",
    evaluated_case_ids: cases.map(testCase => testCase.id),
    total_case_corpus_count: allCasesForHash.length,
    num_cases: cases.length,
    num_trials_per_condition: trials,
    skipped_bad_jsonl_lines: {
      absolute: absoluteState.skipped_bad_lines,
      pairwise_gold_anchored: pairwiseStates.gold_anchored.skipped_bad_lines,
      pairwise_gold_blind: pairwiseStates.gold_blind.skipped_bad_lines
    },
    absolute_summary: absoluteSummary,
    pairwise_gold_anchored_summary: pairwiseSummaries.gold_anchored,
    pairwise_gold_blind_summary: pairwiseSummaries.gold_blind,
    result_files: {
      absolute_results_jsonl: `results/${runId}.results.jsonl`,
      pairwise_gold_anchored_jsonl: `results/${runId}.pairwise.gold_anchored.jsonl`,
      pairwise_gold_blind_jsonl: `results/${runId}.pairwise.gold_blind.jsonl`,
      summary_json: `results/${runId}.summary.json`
    }
  };

  fs.writeFileSync(summaryPath, JSON.stringify(artifact, null, 2));

  return {
    artifact,
    summaryPath,
    absolutePath,
    pairwisePaths
  };
}
