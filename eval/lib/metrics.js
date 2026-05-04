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

  return {
    conditions,
    baseline,
    skill,
    careful_control: conditions.careful_control || undefined,
    lift: computeLift(baseline, skill),
    paired_analysis: summarizePairedBaselineSkill(results)
  };
}

function summarizeCondition(results) {
  const total = results.length;

  if (total === 0) {
    return {
      total: 0,
      pass_rate: null,
      constraint_failure_rate: null,
      final_answer_accuracy: null,
      implicit_constraint_consideration_rate: null,
      explicit_constraint_enumeration_rate: null,
      constraint_application_rate: null,
      hard_constraint_violation_rate: null,
      unnecessary_clarification_rate: null,
      over_enumeration_rate: null,
      ignored_relevant_soft_constraints_rate: null,
      invalid_judge_response_rate: null
    };
  }

  const count = predicate => results.filter(predicate).length;

  return {
    total,
    pass_rate: count(r => r.score.pass) / total,
    constraint_failure_rate: count(r => r.score.constraint_failure) / total,
    final_answer_accuracy: count(r => r.score.fields?.final_answer_correct === true) / total,
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
    invalid_judge_response_rate: count(r => r.score.invalid_judge_response === true) / total
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

function summarizePairedBaselineSkill(results) {
  const pairs = buildBaselineSkillPairs(results);

  return {
    pairs: pairs.length,
    pass: summarizePairedBinary(
      pairs,
      pair => pair.baseline.score.pass === true,
      pair => pair.skill.score.pass === true,
      "skill_minus_baseline"
    ),
    constraint_failure_reduction: summarizePairedBinary(
      pairs,
      pair => pair.baseline.score.constraint_failure === true,
      pair => pair.skill.score.constraint_failure === true,
      "baseline_minus_skill"
    )
  };
}

function buildBaselineSkillPairs(results) {
  const byKey = groupBy(results.filter(r => ["baseline", "skill"].includes(r.condition)), r => `${r.caseId}:${r.trial}`);
  const pairs = [];

  for (const group of Object.values(byKey)) {
    const baseline = group.find(r => r.condition === "baseline");
    const skill = group.find(r => r.condition === "skill");
    if (baseline && skill) pairs.push({ baseline, skill });
  }

  return pairs;
}

function summarizePairedBinary(pairs, baselineFn, skillFn, deltaDirection) {
  const n = pairs.length;

  if (n === 0) {
    return {
      n_pairs: 0,
      baseline_rate: null,
      skill_rate: null,
      mean_delta: null,
      ci95_normal: null,
      mcnemar: null,
      delta_direction: deltaDirection
    };
  }

  const baselineValues = pairs.map(pair => (baselineFn(pair) ? 1 : 0));
  const skillValues = pairs.map(pair => (skillFn(pair) ? 1 : 0));

  const baselineRate = mean(baselineValues);
  const skillRate = mean(skillValues);
  const deltas = pairs.map((_, i) =>
    deltaDirection === "baseline_minus_skill"
      ? baselineValues[i] - skillValues[i]
      : skillValues[i] - baselineValues[i]
  );

  return {
    n_pairs: n,
    baseline_rate: baselineRate,
    skill_rate: skillRate,
    mean_delta: mean(deltas),
    ci95_normal: normalCi95(deltas),
    mcnemar: mcnemar(baselineValues, skillValues),
    delta_direction: deltaDirection
  };
}

function normalCi95(values) {
  if (values.length < 2) return null;
  const m = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1);
  const se = Math.sqrt(variance / values.length);
  return {
    lower: m - 1.96 * se,
    upper: m + 1.96 * se
  };
}

function mcnemar(baselineValues, skillValues) {
  let baselineFailSkillPass = 0;
  let baselinePassSkillFail = 0;

  for (let i = 0; i < baselineValues.length; i++) {
    if (baselineValues[i] === 0 && skillValues[i] === 1) baselineFailSkillPass++;
    if (baselineValues[i] === 1 && skillValues[i] === 0) baselinePassSkillFail++;
  }

  const discordant = baselineFailSkillPass + baselinePassSkillFail;

  if (discordant === 0) {
    return {
      baseline_fail_skill_pass: baselineFailSkillPass,
      baseline_pass_skill_fail: baselinePassSkillFail,
      discordant_pairs: 0,
      chi_square_continuity_corrected: null,
      approximate_p_value: null
    };
  }

  const chiSquare = ((Math.abs(baselineFailSkillPass - baselinePassSkillFail) - 1) ** 2) / discordant;

  return {
    baseline_fail_skill_pass: baselineFailSkillPass,
    baseline_pass_skill_fail: baselinePassSkillFail,
    discordant_pairs: discordant,
    chi_square_continuity_corrected: chiSquare,
    approximate_p_value: erfc(Math.sqrt(chiSquare / 2))
  };
}

function erfc(x) {
  // Abramowitz and Stegun approximation. Good enough for reporting an approximate McNemar p-value.
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

function marginWeight(margin) {
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
      return 0;
  }
}

export function summarizePairwise(pairwiseResults) {
  return {
    global: summarizePairwiseGroup(pairwiseResults),
    by_category: summarizeBy(pairwiseResults, result => result.category || "uncategorized", summarizePairwiseGroup),
    by_behavior_policy: summarizeBy(pairwiseResults, behaviorPolicyKey, summarizePairwiseGroup)
  };
}

function summarizePairwiseGroup(pairwiseResults) {
  const total = pairwiseResults.length;

  if (total === 0) {
    return emptyPairwiseSummary(0, 0, null);
  }

  const valid = pairwiseResults.filter(r => r.pairwise?.valid_pairwise_response === true);
  const validTotal = valid.length;
  const count = predicate => pairwiseResults.filter(predicate).length;
  const validCount = predicate => valid.filter(predicate).length;

  if (validTotal === 0) {
    return emptyPairwiseSummary(
      total,
      0,
      count(r => r.pairwise?.valid_pairwise_response !== true) / total
    );
  }

  const skillWeighted = valid.reduce((sum, r) => {
    if (r.winner_condition !== "skill") return sum;
    return sum + marginWeight(r.pairwise.parsed.margin);
  }, 0);

  const baselineWeighted = valid.reduce((sum, r) => {
    if (r.winner_condition !== "baseline") return sum;
    return sum + marginWeight(r.pairwise.parsed.margin);
  }, 0);

  return {
    total,
    valid_total: validTotal,
    skill_win_rate: validCount(r => r.winner_condition === "skill") / validTotal,
    baseline_win_rate: validCount(r => r.winner_condition === "baseline") / validTotal,
    tie_rate: validCount(r => r.winner_condition === "tie") / validTotal,
    invalid_pairwise_rate: count(r => r.pairwise?.valid_pairwise_response !== true) / total,
    skill_margin_weighted_score: skillWeighted / validTotal,
    baseline_margin_weighted_score: baselineWeighted / validTotal,
    net_margin_weighted_skill_advantage: (skillWeighted - baselineWeighted) / validTotal,
    large_margin_skill_win_rate:
      validCount(r => r.winner_condition === "skill" && r.pairwise.parsed.margin === "large") / validTotal,
    large_margin_baseline_win_rate:
      validCount(r => r.winner_condition === "baseline" && r.pairwise.parsed.margin === "large") / validTotal,
    ...summarizeDoubleSwaps(valid)
  };
}

function summarizeDoubleSwaps(validResults) {
  const groups = groupBy(
    validResults.filter(r => ["skill_a", "baseline_a"].includes(r.position_order)),
    r => `${r.caseId}:${r.trial}`
  );

  const completeGroups = Object.values(groups).filter(group => {
    const orders = new Set(group.map(r => r.position_order));
    return orders.has("skill_a") && orders.has("baseline_a");
  });

  const total = completeGroups.length;

  if (total === 0) {
    return {
      double_swap_pairs: 0,
      position_agreement_rate: null,
      skill_wins_both_positions_rate: null,
      baseline_wins_both_positions_rate: null,
      split_decision_rate: null
    };
  }

  let agreements = 0;
  let skillBoth = 0;
  let baselineBoth = 0;
  let splits = 0;

  for (const group of completeGroups) {
    const skillA = group.find(r => r.position_order === "skill_a");
    const baselineA = group.find(r => r.position_order === "baseline_a");
    const winners = [skillA?.winner_condition, baselineA?.winner_condition];

    if (winners[0] === winners[1]) {
      agreements++;
      if (winners[0] === "skill") skillBoth++;
      if (winners[0] === "baseline") baselineBoth++;
    } else {
      splits++;
    }
  }

  return {
    double_swap_pairs: total,
    position_agreement_rate: agreements / total,
    skill_wins_both_positions_rate: skillBoth / total,
    baseline_wins_both_positions_rate: baselineBoth / total,
    split_decision_rate: splits / total
  };
}

function emptyPairwiseSummary(total, validTotal, invalidRate) {
  return {
    total,
    valid_total: validTotal,
    skill_win_rate: null,
    baseline_win_rate: null,
    tie_rate: null,
    invalid_pairwise_rate: invalidRate,
    skill_margin_weighted_score: null,
    baseline_margin_weighted_score: null,
    net_margin_weighted_skill_advantage: null,
    large_margin_skill_win_rate: null,
    large_margin_baseline_win_rate: null,
    double_swap_pairs: 0,
    position_agreement_rate: null,
    skill_wins_both_positions_rate: null,
    baseline_wins_both_positions_rate: null,
    split_decision_rate: null
  };
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

  return "unspecified";
}

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] ||= [];
    acc[key].push(item);
    return acc;
  }, {});
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
