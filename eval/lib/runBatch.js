import fs from "fs";
import path from "path";

import {
  getAnswerProvider,
  getAnswerModel,
  getAnswerTemperature,
  getDoubleSwappedPairwise,
  getJudgeModel,
  getJudgeProvider,
  getJudgeTemperature,
  getEvalConditions,
  getPairwiseComparisons,
  getPrimaryCondition,
  getRunConfig,
  isSameVendorJudge
} from "./config.js";
import { loadSkillProductionPrompt, loadSkillPrompt } from "./loadSkill.js";
import {
  BASELINE_SYSTEM,
  CAREFUL_CONTROL_SYSTEM,
  CONSTRAINT_AXIS_PROMPTING_SYSTEM,
  CONSTRAINT_CHECK_NO_ENUMERATION_SYSTEM,
  STEP_BY_STEP_CONTROL_SYSTEM,
  STYLE_MATCHED_REWRITE_SYSTEM
} from "./runCase.js";
import { generateAnswerResult } from "./runCase.js";
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
import { validateRunId } from "./runId.js";

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
  let index = 0;

  while (selected.length < limit) {
    let added = false;

    for (const category of categories) {
      const bucket = byCategory.get(category);
      const next = bucket[index];

      if (next) {
        selected.push(next);
        added = true;
      }

      if (selected.length >= limit) break;
    }

    if (!added) break;
    index++;
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

function relativeResultPath(filePath) {
  return path.relative(process.cwd(), filePath).replaceAll(path.sep, "/");
}

export function textStats(text) {
  const normalized = String(text || "").trim();
  return {
    characters: normalized.length,
    approximate_words: normalized ? normalized.split(/\s+/).length : 0,
    approximate_tokens: normalized ? Math.ceil(normalized.length / 4) : 0
  };
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
  validateRunId(runId);

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
  const skillProduction = loadSkillProductionPrompt();
  const skillHash = sha256(skill);
  const skillProductionHash = sha256(skillProduction);
  const casesHash = semanticCasesHash(allCasesForHash);

  // run_config_sha256 now incorporates file-loaded system prompts so that edits
  // to SKILL.md or SKILL_PRODUCTION.md invalidate any in-progress resume.
  const runConfig = getRunConfig();
  const runConfigHash = sha256(stableJson({
    config: runConfig,
    file_prompt_sha256: { skill: skillHash, skill_production: skillProductionHash }
  }));

  const absoluteState = loadCompletedResults(absolutePath, resultKey);
  assertResumeHashes(absoluteState.results, {
    skill_sha256: skillHash,
    cases_sha256: casesHash,
    run_config_sha256: runConfigHash,
    fileLabel: absolutePath
  });

  const pairwiseStates = Object.fromEntries(
    PAIRWISE_MODES.map(mode => {
      const state = loadCompletedResults(pairwisePaths[mode], pairwiseKey);
      assertResumeHashes(state.results, {
        skill_sha256: skillHash,
        cases_sha256: casesHash,
        run_config_sha256: runConfigHash,
        fileLabel: pairwisePaths[mode]
      });
      return [mode, state];
    })
  );

  const positionOrders = getDoubleSwappedPairwise() ? ["left_a", "right_a"] : ["seeded"];
  const pairwiseComparisons = getPairwiseComparisons();
  const absoluteResults = absoluteState.results;
  const absoluteMap = buildResultMap(absoluteResults);

  log(`Run: ${runId}`);
  log(`Cases evaluated: ${cases.length}`);
  log(`Case corpus hashed: ${allCasesForHash.length}`);
  log(`Categories: ${[...new Set(cases.map(c => c.category))].join(", ")}`);
  log(`Trials: ${trials}`);
  log(`Answer provider: ${getAnswerProvider()}`);
  log(`Answer model: ${getAnswerModel()} @ T=${getAnswerTemperature()}`);
  log(`Judge provider: ${getJudgeProvider()}`);
  log(`Judge model: ${getJudgeModel()} @ T=${getJudgeTemperature()}`);
  if (isSameVendorJudge()) {
    log("WARNING: same-vendor judge path. Treat results as directional unless confirmed by another judge family.");
  }
  log(`Existing absolute results: ${absoluteResults.length}`);
  log(`Primary condition: ${getPrimaryCondition()}`);
  log(`Pairwise comparisons: ${pairwiseComparisons.map(pair => pair.comparison_id).join(", ")}`);

  for (const testCase of cases) {
    for (let trial = 1; trial <= trials; trial++) {
      for (const condition of getEvalConditions()) {
        const key = resultKey({ caseId: testCase.id, condition, trial });

        if (absoluteState.completedKeys.has(key)) {
          log(`Skipping completed absolute result: ${key}`);
          continue;
        }

        log(`Running ${key}`);

        const baselineForStyle = condition === "style_matched_baseline"
          ? absoluteMap.get(resultKey({ caseId: testCase.id, condition: "baseline", trial }))?.answer
          : null;
        const answerResult = await generateAnswerResult({ testCase, condition, baselineAnswer: baselineForStyle });
        const answer = answerResult.text;
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
          not_acceptable_final_answers: testCase.not_acceptable_final_answers,
          requires_direct_answer: testCase.requires_direct_answer,
          clarification_expected: testCase.clarification_expected,
          skill_sha256: skillHash,
          skill_production_sha256: skillProductionHash,
          cases_sha256: casesHash,
          run_config_sha256: runConfigHash,
          answer,
          judgment,
          score,
          answer_stats: textStats(answer),
          answer_stop_reason: answerResult.stop_reason,
          answer_truncated: answerResult.truncated,
          answer_generation_kind: answerResult.generation_kind,
          answer_generation_metadata: Object.fromEntries(
            Object.entries(answerResult).filter(([metadataKey]) =>
              !["text", "raw", "stop_reason", "truncated", "generation_kind"].includes(metadataKey)
            )
          )
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
        for (const comparison of pairwiseComparisons) {
          const left = absoluteMap.get(resultKey({ caseId: testCase.id, condition: comparison.left_condition, trial }));
          const right = absoluteMap.get(resultKey({ caseId: testCase.id, condition: comparison.right_condition, trial }));

          if (!left || !right) {
            log(`Missing absolute results for pairwise case=${testCase.id}, trial=${trial}, comparison=${comparison.comparison_id}`);
            continue;
          }

          for (const positionOrder of positionOrders) {
            const key = pairwiseKey({
              caseId: testCase.id,
              trial,
              position_order: positionOrder,
              left_condition: comparison.left_condition,
              right_condition: comparison.right_condition
            });

            if (state.completedKeys.has(key)) {
              log(`Skipping completed ${mode} pairwise result: ${key}`);
              continue;
            }

            log(`Running ${mode} pairwise ${key}`);

            const pairwise = await judgePairwise({
              testCase,
              leftAnswer: left.answer,
              rightAnswer: right.answer,
              leftCondition: comparison.left_condition,
              rightCondition: comparison.right_condition,
              seedRunId: runId,
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
              comparison_id: comparison.comparison_id,
              left_condition: comparison.left_condition,
              right_condition: comparison.right_condition,
              position_order: positionOrder,
              skill_sha256: skillHash,
              skill_production_sha256: skillProductionHash,
              cases_sha256: casesHash,
              run_config_sha256: runConfigHash,
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
  }

  const absoluteSummary = summarizeResults(absoluteResults);
  const pairwiseSummaries = Object.fromEntries(
    PAIRWISE_MODES.map(mode => [mode, summarizePairwise(pairwiseStates[mode].results)])
  );

  const artifact = {
    run_id: runId,
    created_at: new Date().toISOString(),
    smoke_test: smokeTest,
    answer_provider: getAnswerProvider(),
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
    skill_production_sha256: skillProductionHash,
    cases_sha256: casesHash,
    run_config_sha256: runConfigHash,
    run_config: runConfig,
    system_prompt_sha256: {
      baseline: sha256(BASELINE_SYSTEM),
      careful_control: sha256(CAREFUL_CONTROL_SYSTEM),
      step_by_step_control: sha256(STEP_BY_STEP_CONTROL_SYSTEM),
      constraint_axis_prompting: sha256(CONSTRAINT_AXIS_PROMPTING_SYSTEM),
      constraint_check_no_enumeration: sha256(CONSTRAINT_CHECK_NO_ENUMERATION_SYSTEM),
      production_constraint_prompt: skillProductionHash,
      style_matched_baseline: sha256(STYLE_MATCHED_REWRITE_SYSTEM),
      skill: skillHash,
      skill_concise: sha256(`${skill}\n\nApply the protocol, but keep the final user-facing response concise and avoid unnecessary prose.`)
    },
    system_prompt_stats: {
      baseline: textStats(BASELINE_SYSTEM),
      careful_control: textStats(CAREFUL_CONTROL_SYSTEM),
      step_by_step_control: textStats(STEP_BY_STEP_CONTROL_SYSTEM),
      constraint_axis_prompting: textStats(CONSTRAINT_AXIS_PROMPTING_SYSTEM),
      constraint_check_no_enumeration: textStats(CONSTRAINT_CHECK_NO_ENUMERATION_SYSTEM),
      production_constraint_prompt: textStats(skillProduction),
      style_matched_baseline: textStats(STYLE_MATCHED_REWRITE_SYSTEM),
      skill: textStats(skill),
      skill_concise: textStats(`${skill}\n\nApply the protocol, but keep the final user-facing response concise and avoid unnecessary prose.`)
    },
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
      absolute_results_jsonl: relativeResultPath(absolutePath),
      pairwise_gold_anchored_jsonl: relativeResultPath(pairwisePaths.gold_anchored),
      pairwise_gold_blind_jsonl: relativeResultPath(pairwisePaths.gold_blind),
      summary_json: relativeResultPath(summaryPath)
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
