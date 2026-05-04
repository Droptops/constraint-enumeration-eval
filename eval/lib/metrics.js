import { getPrimaryCondition } from "./config.js";
import { GATE_VARIANTS } from "./score.js";

export function summarizeResults(results) {
  return {
    global: summarizeResultsGroup(results),
    by_category: summarizeBy(results, result => result.category || "uncategorized", summarizeResultsGroup),
    by_behavior_policy: summarizeBy(results, behaviorPolicyKey, summarizeResultsGroup)
  };
}

function summarizeResultsGroup(results) {
  const byCondition = groupBy(results, result => result.condition);
  const conditions = Object.fromEntries(
    Object.entries(byCondition)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([condition, conditionResults]) => [condition, summarizeCondition(conditionResults)])
  );

  const baseline = conditions.baseline || summarizeCondition([]);
  const skill = conditions.skill || summarizeCondition([]);
  const primaryCondition = getPrimaryCondition();
  const primary = conditions[primaryCondition] || summarizeCondition([]);
  const pairedPrimaryBaseline = summarizePairedConditionDelta(results, "baseline", primaryCondition);

  return {
    conditions,
    baseline,
    skill,
    primary_condition: primaryCondition,
    primary,
    careful_control: conditions.careful_control || null,
    lift: computeLift(baseline, skill),
    primary_lift_vs_baseline: computeLift(baseline, primary),
    gate_sensitivity: summarizeGateSensitivity(results),
    paired_condition_deltas: summarizeAllPairedConditionDeltas(results),
    paired_delta_summary: pairedPrimaryBaseline,
    paired_analysis: pairedPrimaryBaseline,
    paired_baseline_vs_skill: summarizePairedConditionDelta(results, "baseline", "skill"),
    paired_skill_vs_careful_control:
      conditions.careful_control ? summarizePairedConditionDelta(results, "careful_control", "skill") : null
  };
}

function summarizeCondition(results) {
  const total = results.length;

  if (total === 0) {
    return {
      total: 0,
      pass_rate: null,
      constraint_failure_rate: null,
      final_answer_rate: null,
      implicit_constraint_consideration_rate: null,
      explicit_constraint_enumeration_rate: null,
      constraint_application_rate: null,
      hard_constraint_violation_rate: null,
      unnecessary_clarification_rate: null,
      over_enumeration_rate: null,
      ignored_relevant_soft_constraints_rate: null,
      invalid_judge_response_rate: null,
      answer_truncation_rate: null,
      answer_length: null,
      pass_rate_by_answer_length_quartile: null
    };
  }

  const count = predicate => results.filter(predicate).length;

  return {
    total,
    pass_rate: count(r => r.score.pass) / total,
    constraint_failure_rate: count(r => r.score.constraint_failure) / total,
    final_answer_rate: count(r => r.score.fields?.final_answer_correct === true) / total,
    implicit_constraint_consideration_rate:
      count(r => r.score.fields?.considers_binding_constraints_implicitly === true) / total,
    explicit_constraint_enumeration_rate:
      count(r => r.score.fields?.enumerates_binding_constraints_explicitly === true) / total,
    constraint_application_rate:
      count(r => r.score.fields?.applies_constraints_correctly === true) / total,
    hard_constraint_violation_rate: count(r => r.score.fields?.violates_hard_constraint === true) / total,
    unnecessary_clarification_rate: count(r => r.score.fields?.asks_unnecessary_clarification === true) / total,
    over_enumeration_rate: count(r => r.score.fields?.over_enumerates_irrelevant_constraints === true) / total,
    ignored_relevant_soft_constraints_rate:
      count(r => r.score.fields?.ignored_relevant_soft_constraints === true) / total,
    invalid_judge_response_rate: count(r => r.score.invalid_judge_response === true) / total,
    answer_truncation_rate: count(r => r.answer_truncated === true) / total,
    answer_length: summarizeAnswerLength(results),
    pass_rate_by_answer_length_quartile: summarizePassRateByLengthQuartile(results)
  };
}

function computeLift(baseline, skill) {
  if (baseline.total === 0 || skill.total === 0) {
    return null;
  }

  return {
    pass_rate_delta: skill.pass_rate - baseline.pass_rate,
    constraint_failure_rate_delta: skill.constraint_failure_rate - baseline.constraint_failure_rate,
    constraint_failure_reduction_percentage_points:
      (baseline.constraint_failure_rate - skill.constraint_failure_rate) * 100,
    implicit_constraint_consideration_rate_delta:
      skill.implicit_constraint_consideration_rate - baseline.implicit_constraint_consideration_rate,
    explicit_constraint_enumeration_rate_delta:
      skill.explicit_constraint_enumeration_rate - baseline.explicit_constraint_enumeration_rate,
    constraint_application_rate_delta:
      skill.constraint_application_rate - baseline.constraint_application_rate
  };
}

function summarizeGateSensitivity(results) {
  const variants = Object.keys(GATE_VARIANTS);
  const byCondition = groupBy(results, result => result.condition);
  const primaryCondition = getPrimaryCondition();

  const conditionSummaries = Object.fromEntries(
    Object.entries(byCondition)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([condition, conditionResults]) => {
        const total = conditionResults.length;
        return [
          condition,
          Object.fromEntries(
            variants.map(variant => [
              variant,
              total === 0
                ? null
                : conditionResults.filter(result => result.score.gate_variants?.[variant] === true).length / total
            ])
          )
        ];
      })
  );

  const conditions = Object.keys(byCondition).sort();
  const primaryMinusAllConditions = Object.fromEntries(
    conditions
      .filter(condition => condition !== primaryCondition)
      .map(condition => [`${primaryCondition}_minus_${condition}`, summarizeVariantDeltas(results, condition, primaryCondition)])
  );

  return {
    note: "Sensitivity table for alternate pass gates. Default pass uses v31_decision_quality_default, which drops the subjective implicit-consideration gate.",
    primary_condition: primaryCondition,
    conditions: conditionSummaries,
    primary_minus_all_conditions: primaryMinusAllConditions,
    primary_minus_baseline: summarizeVariantDeltas(results, "baseline", primaryCondition),
    primary_minus_careful_control: summarizeVariantDeltas(results, "careful_control", primaryCondition),
    primary_minus_constraint_axis_prompting: summarizeVariantDeltas(results, "constraint_axis_prompting", primaryCondition),
    primary_minus_style_matched_baseline: summarizeVariantDeltas(results, "style_matched_baseline", primaryCondition),
    primary_minus_skill: primaryCondition === "skill" ? null : summarizeVariantDeltas(results, "skill", primaryCondition),
    skill_minus_baseline: summarizeVariantDeltas(results, "baseline", "skill"),
    skill_minus_careful_control: summarizeVariantDeltas(results, "careful_control", "skill")
  };
}

function summarizeVariantDeltas(results, leftCondition, rightCondition) {
  const pairs = buildConditionPairs(results, leftCondition, rightCondition);
  if (pairs.length === 0) return null;

  return Object.fromEntries(
    Object.keys(GATE_VARIANTS).map(variant => {
      const leftRate = mean(pairs.map(pair => (pair.left.score.gate_variants?.[variant] === true ? 1 : 0)));
      const rightRate = mean(pairs.map(pair => (pair.right.score.gate_variants?.[variant] === true ? 1 : 0)));
      return [variant, rightRate - leftRate];
    })
  );
}

function summarizePairedConditionDelta(results, leftCondition, rightCondition) {
  const pairs = buildConditionPairs(results, leftCondition, rightCondition);

  return {
    pairs: pairs.length,
    comparison_id: `${leftCondition}_vs_${rightCondition}`,
    left_condition: leftCondition,
    right_condition: rightCondition,
    pass: summarizePairedBinary({
      pairs,
      leftFn: pair => pair.left.score.pass === true,
      rightFn: pair => pair.right.score.pass === true,
      deltaDirection: `${rightCondition}_minus_${leftCondition}`,
      subtract: "right_minus_left",
      positiveDeltaMeaning: `${rightCondition} has a higher pass rate than ${leftCondition}.`
    }),
    constraint_failure_reduction: summarizePairedBinary({
      pairs,
      leftFn: pair => pair.left.score.constraint_failure === true,
      rightFn: pair => pair.right.score.constraint_failure === true,
      deltaDirection: `${leftCondition}_minus_${rightCondition}`,
      subtract: "left_minus_right",
      positiveDeltaMeaning: `${rightCondition} has a lower constraint-failure rate than ${leftCondition}.`
    }),
    hard_constraint_violation_reduction: summarizePairedBinary({
      pairs,
      leftFn: pair => pair.left.score.fields?.violates_hard_constraint === true,
      rightFn: pair => pair.right.score.fields?.violates_hard_constraint === true,
      deltaDirection: `${leftCondition}_minus_${rightCondition}`,
      subtract: "left_minus_right",
      positiveDeltaMeaning: `${rightCondition} has a lower hard-constraint violation rate than ${leftCondition}.`
    }),
    unnecessary_clarification_reduction: summarizePairedBinary({
      pairs,
      leftFn: pair => pair.left.score.fields?.asks_unnecessary_clarification === true,
      rightFn: pair => pair.right.score.fields?.asks_unnecessary_clarification === true,
      deltaDirection: `${leftCondition}_minus_${rightCondition}`,
      subtract: "left_minus_right",
      positiveDeltaMeaning: `${rightCondition} has a lower unnecessary-clarification rate than ${leftCondition}.`
    }),
    constraint_application: summarizePairedBinary({
      pairs,
      leftFn: pair => pair.left.score.fields?.applies_constraints_correctly === true,
      rightFn: pair => pair.right.score.fields?.applies_constraints_correctly === true,
      deltaDirection: `${rightCondition}_minus_${leftCondition}`,
      subtract: "right_minus_left",
      positiveDeltaMeaning: `${rightCondition} has a higher constraint-application rate than ${leftCondition}.`
    })
  };
}


function summarizeAllPairedConditionDeltas(results) {
  const conditions = [...new Set(results.map(result => result.condition))].sort();
  const output = {};

  for (let i = 0; i < conditions.length; i++) {
    for (let j = 0; j < conditions.length; j++) {
      if (i === j) continue;
      const leftCondition = conditions[i];
      const rightCondition = conditions[j];
      const pairs = buildConditionPairs(results, leftCondition, rightCondition);
      if (pairs.length === 0) continue;

      output[`${rightCondition}_minus_${leftCondition}`] = {
        pass: summarizePairedBinary({
          pairs,
          leftFn: pair => pair.left.score.pass === true,
          rightFn: pair => pair.right.score.pass === true,
          deltaDirection: `${rightCondition}_minus_${leftCondition}`,
          subtract: "right_minus_left",
          positiveDeltaMeaning: `${rightCondition} has a higher pass rate than ${leftCondition}.`
        }),
        hard_constraint_violation_reduction: summarizePairedBinary({
          pairs,
          leftFn: pair => pair.left.score.fields?.violates_hard_constraint === true,
          rightFn: pair => pair.right.score.fields?.violates_hard_constraint === true,
          deltaDirection: `${leftCondition}_minus_${rightCondition}`,
          subtract: "left_minus_right",
          positiveDeltaMeaning: `${rightCondition} has a lower hard-constraint violation rate than ${leftCondition}.`
        }),
        unnecessary_clarification_reduction: summarizePairedBinary({
          pairs,
          leftFn: pair => pair.left.score.fields?.asks_unnecessary_clarification === true,
          rightFn: pair => pair.right.score.fields?.asks_unnecessary_clarification === true,
          deltaDirection: `${leftCondition}_minus_${rightCondition}`,
          subtract: "left_minus_right",
          positiveDeltaMeaning: `${rightCondition} has a lower unnecessary-clarification rate than ${leftCondition}.`
        })
      };
    }
  }

  return output;
}

function buildConditionPairs(results, leftCondition, rightCondition) {
  const byKey = groupBy(
    results.filter(r => [leftCondition, rightCondition].includes(r.condition)),
    r => `${r.caseId}:${r.trial}`
  );
  const pairs = [];

  for (const group of Object.values(byKey)) {
    const left = group.find(r => r.condition === leftCondition);
    const right = group.find(r => r.condition === rightCondition);
    if (left && right) pairs.push({ left, right, leftCondition, rightCondition });
  }

  return pairs;
}

export function summarizePairedBinary({
  pairs,
  leftFn,
  rightFn,
  deltaDirection,
  subtract,
  positiveDeltaMeaning
}) {
  const n = pairs.length;
  const leftCondition = pairs[0]?.leftCondition || null;
  const rightCondition = pairs[0]?.rightCondition || null;

  if (!["left_minus_right", "right_minus_left"].includes(subtract)) {
    throw new Error(`Invalid paired subtraction mode: ${subtract}`);
  }

  if (n === 0) {
    return {
      n_pairs: 0,
      left_condition: leftCondition,
      right_condition: rightCondition,
      left_rate: null,
      right_rate: null,
      mean_delta: null,
      ci95_bootstrap: null,
      ci95_normal_diagnostic: null,
      mcnemar: null,
      delta_direction: deltaDirection,
      subtract,
      positive_delta_meaning: positiveDeltaMeaning
    };
  }

  const leftValues = pairs.map(pair => (leftFn(pair) ? 1 : 0));
  const rightValues = pairs.map(pair => (rightFn(pair) ? 1 : 0));

  const leftRate = mean(leftValues);
  const rightRate = mean(rightValues);
  const deltas = pairs.map((_, i) =>
    subtract === "left_minus_right"
      ? leftValues[i] - rightValues[i]
      : rightValues[i] - leftValues[i]
  );

  return {
    n_pairs: n,
    left_condition: leftCondition,
    right_condition: rightCondition,
    left_rate: leftRate,
    right_rate: rightRate,
    mean_delta: mean(deltas),
    ci95_bootstrap: bootstrapCi95(deltas),
    ci95_normal_diagnostic: normalCi95(deltas),
    mcnemar: mcnemar(leftValues, rightValues, leftCondition, rightCondition),
    delta_direction: deltaDirection,
    subtract,
    positive_delta_meaning: positiveDeltaMeaning
  };
}

export function normalCi95(values) {
  if (values.length < 2) return null;
  const m = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1);
  const se = Math.sqrt(variance / values.length);
  return {
    lower: m - 1.96 * se,
    upper: m + 1.96 * se
  };
}

export function bootstrapCi95(values, iterations = 2000) {
  if (values.length < 2) return null;

  const estimates = [];
  const rand = deterministicRandom("bootstrap-ci95");

  for (let i = 0; i < iterations; i++) {
    let sum = 0;
    for (let j = 0; j < values.length; j++) {
      sum += values[Math.floor(rand() * values.length)];
    }
    estimates.push(sum / values.length);
  }

  estimates.sort((a, b) => a - b);

  return {
    lower: quantileSorted(estimates, 0.025),
    upper: quantileSorted(estimates, 0.975),
    iterations
  };
}

export function mcnemar(leftValues, rightValues, leftCondition, rightCondition) {
  let leftZeroRightOne = 0;
  let leftOneRightZero = 0;

  for (let i = 0; i < leftValues.length; i++) {
    if (leftValues[i] === 0 && rightValues[i] === 1) leftZeroRightOne++;
    if (leftValues[i] === 1 && rightValues[i] === 0) leftOneRightZero++;
  }

  const discordant = leftZeroRightOne + leftOneRightZero;

  if (discordant === 0) {
    return {
      left_condition: leftCondition,
      right_condition: rightCondition,
      left_zero_right_one: leftZeroRightOne,
      left_one_right_zero: leftOneRightZero,
      discordant_pairs: 0,
      chi_square_continuity_corrected: null,
      approximate_p_value: null
    };
  }

  const chiSquare = ((Math.abs(leftZeroRightOne - leftOneRightZero) - 1) ** 2) / discordant;

  return {
    left_condition: leftCondition,
    right_condition: rightCondition,
    left_zero_right_one: leftZeroRightOne,
    left_one_right_zero: leftOneRightZero,
    discordant_pairs: discordant,
    chi_square_continuity_corrected: chiSquare,
    approximate_p_value: erfc(Math.sqrt(chiSquare / 2))
  };
}

export function erfc(x) {
  // Abramowitz and Stegun approximation; covered by unit tests against known chi-square survival values.
  const z = Math.abs(x);
  const t = 1 / (1 + z / 2);
  const r = t * Math.exp(
    -z * z -
      1.26551223 +
      t * (
        1.00002368 +
          t * (
            0.37409196 +
              t * (
                0.09678418 +
                  t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))
              )
          )
      )
  );
  return x >= 0 ? r : 2 - r;
}

export function marginWeight(margin) {
  switch (margin) {
    case "large":
      return 1.0;
    case "medium":
      return 0.66;
    case "small":
      return 0.33;
    case "tie":
      return 0;
    default:
      throw new Error(`Invalid pairwise margin: ${margin}`);
  }
}

export function summarizePairwise(pairwiseResults) {
  return {
    global: summarizePairwiseGroup(pairwiseResults),
    by_comparison: summarizeBy(pairwiseResults, comparisonKey, summarizePairwiseGroup),
    by_category: summarizeBy(pairwiseResults, result => result.category || "uncategorized", summarizePairwiseGroup),
    by_behavior_policy: summarizeBy(pairwiseResults, behaviorPolicyKey, summarizePairwiseGroup)
  };
}

function summarizePairwiseGroup(pairwiseResults) {
  const total = pairwiseResults.length;

  if (total === 0) {
    return emptyPairwiseSummary(0, 0, null, null, null);
  }

  const valid = pairwiseResults.filter(r => r.pairwise?.valid_pairwise_response === true);
  const validTotal = valid.length;
  const count = predicate => pairwiseResults.filter(predicate).length;
  const validCount = predicate => valid.filter(predicate).length;
  const leftCondition = inferSingleValue(pairwiseResults, r => r.left_condition || "skill");
  const rightCondition = inferSingleValue(pairwiseResults, r => r.right_condition || "baseline");

  if (validTotal === 0) {
    return emptyPairwiseSummary(
      total,
      0,
      count(r => r.pairwise?.valid_pairwise_response !== true) / total,
      leftCondition,
      rightCondition
    );
  }

  const leftWeighted = valid.reduce((sum, r) => {
    if (r.winner_condition !== (r.left_condition || leftCondition)) return sum;
    return sum + marginWeight(r.pairwise.parsed.margin);
  }, 0);

  const rightWeighted = valid.reduce((sum, r) => {
    if (r.winner_condition !== (r.right_condition || rightCondition)) return sum;
    return sum + marginWeight(r.pairwise.parsed.margin);
  }, 0);

  const summary = {
    total,
    valid_total: validTotal,
    comparison_id: leftCondition && rightCondition ? `${leftCondition}_vs_${rightCondition}` : "mixed",
    left_condition: leftCondition,
    right_condition: rightCondition,
    left_win_rate: validCount(r => r.winner_condition === (r.left_condition || leftCondition)) / validTotal,
    right_win_rate: validCount(r => r.winner_condition === (r.right_condition || rightCondition)) / validTotal,
    tie_rate: validCount(r => r.winner_condition === "tie") / validTotal,
    invalid_pairwise_rate: count(r => r.pairwise?.valid_pairwise_response !== true) / total,
    margin_weighted_metrics_note: "Diagnostic only; large=1.0, medium=0.66, small=0.33, tie=0 are uncalibrated convenience weights. Use win/loss/tie rates for headline claims.",
    left_margin_weighted_score: leftWeighted / validTotal,
    right_margin_weighted_score: rightWeighted / validTotal,
    net_margin_weighted_left_advantage: (leftWeighted - rightWeighted) / validTotal,
    large_margin_left_win_rate:
      validCount(r => r.winner_condition === (r.left_condition || leftCondition) && r.pairwise.parsed.margin === "large") / validTotal,
    large_margin_right_win_rate:
      validCount(r => r.winner_condition === (r.right_condition || rightCondition) && r.pairwise.parsed.margin === "large") / validTotal,
    ...summarizeDoubleSwaps(valid)
  };

  // Backward-compatible field names for old dashboards and README snippets.
  summary.skill_win_rate = validCount(r => r.winner_condition === "skill") / validTotal;
  summary.baseline_win_rate = validCount(r => r.winner_condition === "baseline") / validTotal;
  summary.skill_margin_weighted_score = valid.reduce((sum, r) => {
    if (r.winner_condition !== "skill") return sum;
    return sum + marginWeight(r.pairwise.parsed.margin);
  }, 0) / validTotal;
  summary.baseline_margin_weighted_score = valid.reduce((sum, r) => {
    if (r.winner_condition !== "baseline") return sum;
    return sum + marginWeight(r.pairwise.parsed.margin);
  }, 0) / validTotal;
  summary.net_margin_weighted_skill_advantage = summary.skill_margin_weighted_score - summary.baseline_margin_weighted_score;
  summary.large_margin_skill_win_rate = validCount(r => r.winner_condition === "skill" && r.pairwise.parsed.margin === "large") / validTotal;
  summary.large_margin_baseline_win_rate = validCount(r => r.winner_condition === "baseline" && r.pairwise.parsed.margin === "large") / validTotal;

  return summary;
}

function summarizeDoubleSwaps(validResults) {
  const groups = groupBy(
    validResults.filter(r => ["left_a", "right_a", "skill_a", "baseline_a"].includes(r.position_order)),
    r => `${comparisonKey(r)}:${r.caseId}:${r.trial}`
  );

  const completeGroups = Object.values(groups).filter(group => {
    const orders = new Set(group.map(r => normalizePositionOrder(r.position_order)));
    return orders.has("left_a") && orders.has("right_a");
  });

  const total = completeGroups.length;

  if (total === 0) {
    return {
      double_swap_pairs: 0,
      position_agreement_rate: null,
      left_wins_both_positions_rate: null,
      right_wins_both_positions_rate: null,
      split_decision_rate: null,
      skill_wins_both_positions_rate: null,
      baseline_wins_both_positions_rate: null
    };
  }

  let agreements = 0;
  let leftBoth = 0;
  let rightBoth = 0;
  let skillBoth = 0;
  let baselineBoth = 0;
  let splits = 0;

  for (const group of completeGroups) {
    const leftA = group.find(r => normalizePositionOrder(r.position_order) === "left_a");
    const rightA = group.find(r => normalizePositionOrder(r.position_order) === "right_a");
    const winners = [leftA?.winner_condition, rightA?.winner_condition];
    const leftCondition = leftA?.left_condition || rightA?.left_condition || "skill";
    const rightCondition = leftA?.right_condition || rightA?.right_condition || "baseline";

    if (winners[0] === winners[1]) {
      agreements++;
      if (winners[0] === leftCondition) leftBoth++;
      if (winners[0] === rightCondition) rightBoth++;
      if (winners[0] === "skill") skillBoth++;
      if (winners[0] === "baseline") baselineBoth++;
    } else {
      splits++;
    }
  }

  return {
    double_swap_pairs: total,
    position_agreement_rate: agreements / total,
    left_wins_both_positions_rate: leftBoth / total,
    right_wins_both_positions_rate: rightBoth / total,
    split_decision_rate: splits / total,
    skill_wins_both_positions_rate: skillBoth / total,
    baseline_wins_both_positions_rate: baselineBoth / total
  };
}

function emptyPairwiseSummary(total, validTotal, invalidRate, leftCondition, rightCondition) {
  return {
    total,
    valid_total: validTotal,
    comparison_id: leftCondition && rightCondition ? `${leftCondition}_vs_${rightCondition}` : null,
    left_condition: leftCondition,
    right_condition: rightCondition,
    left_win_rate: null,
    right_win_rate: null,
    skill_win_rate: null,
    baseline_win_rate: null,
    tie_rate: null,
    invalid_pairwise_rate: invalidRate,
    margin_weighted_metrics_note: "Diagnostic only; use win/loss/tie rates for headline claims.",
    left_margin_weighted_score: null,
    right_margin_weighted_score: null,
    net_margin_weighted_left_advantage: null,
    skill_margin_weighted_score: null,
    baseline_margin_weighted_score: null,
    net_margin_weighted_skill_advantage: null,
    large_margin_left_win_rate: null,
    large_margin_right_win_rate: null,
    large_margin_skill_win_rate: null,
    large_margin_baseline_win_rate: null,
    double_swap_pairs: 0,
    position_agreement_rate: null,
    left_wins_both_positions_rate: null,
    right_wins_both_positions_rate: null,
    skill_wins_both_positions_rate: null,
    baseline_wins_both_positions_rate: null,
    split_decision_rate: null
  };
}

function comparisonKey(result) {
  return result.comparison_id || `${result.left_condition || "skill"}_vs_${result.right_condition || "baseline"}`;
}

function normalizePositionOrder(positionOrder) {
  if (positionOrder === "skill_a") return "left_a";
  if (positionOrder === "baseline_a") return "right_a";
  return positionOrder;
}

function inferSingleValue(items, valueFn) {
  const values = [...new Set(items.map(valueFn).filter(value => value !== undefined && value !== null))];
  return values.length === 1 ? values[0] : null;
}

function summarizeBy(results, keyFn, summarizer) {
  const byKey = groupBy(results, keyFn);

  return Object.fromEntries(
    Object.entries(byKey)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, keyResults]) => [key, summarizer(keyResults)])
  );
}

function behaviorPolicyKey(result) {
  if (result.requires_direct_answer === true && result.clarification_expected === false) {
    return "direct_required";
  }

  if (result.requires_direct_answer === false && result.clarification_expected === true) {
    return "clarification_expected";
  }

  if (result.requires_direct_answer === false && result.clarification_expected === false) {
    return "either_acceptable";
  }

  throw new Error("Invalid behavior policy: requires_direct_answer and clarification_expected must be booleans.");
}

export function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = String(keyFn(item));
    if (!Object.hasOwn(acc, key)) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, Object.create(null));
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarizeAnswerLength(results) {
  const stats = results
    .map(result => result.answer_stats)
    .filter(Boolean);

  if (stats.length === 0) return null;

  const characters = stats.map(stat => stat.characters || 0);
  const words = stats.map(stat => stat.approximate_words || 0);
  const tokens = stats.map(stat => stat.approximate_tokens || 0);

  return {
    mean_characters: mean(characters),
    p50_characters: quantile(characters, 0.5),
    p90_characters: quantile(characters, 0.9),
    mean_approximate_words: mean(words),
    p50_approximate_words: quantile(words, 0.5),
    p90_approximate_words: quantile(words, 0.9),
    mean_approximate_tokens: mean(tokens),
    p50_approximate_tokens: quantile(tokens, 0.5),
    p90_approximate_tokens: quantile(tokens, 0.9)
  };
}

function summarizePassRateByLengthQuartile(results) {
  const withTokens = results
    .filter(result => result.answer_stats?.approximate_tokens !== undefined)
    .map(result => ({ result, tokens: result.answer_stats.approximate_tokens }))
    .sort((a, b) => a.tokens - b.tokens);

  if (withTokens.length === 0) return null;

  return [0, 1, 2, 3].map(quartileIndex => {
    const start = Math.floor((quartileIndex * withTokens.length) / 4);
    const end = Math.floor(((quartileIndex + 1) * withTokens.length) / 4);
    const bucket = withTokens.slice(start, Math.max(end, start + 1));
    return {
      quartile: quartileIndex + 1,
      n: bucket.length,
      min_approximate_tokens: bucket[0]?.tokens ?? null,
      max_approximate_tokens: bucket[bucket.length - 1]?.tokens ?? null,
      pass_rate: bucket.filter(item => item.result.score.pass === true).length / bucket.length
    };
  });
}

function quantile(values, q) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return quantileSorted(sorted, q);
}

function quantileSorted(sorted, q) {
  if (sorted.length === 0) return null;
  const index = (sorted.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function deterministicRandom(seed) {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
