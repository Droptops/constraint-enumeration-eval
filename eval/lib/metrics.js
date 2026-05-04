export function summarizeResults(results) {
  return {
    global: summarizeResultsGroup(results),
    by_category: summarizeByCategory(results, summarizeResultsGroup)
  };
}

function summarizeResultsGroup(results) {
  const byCondition = groupBy(results, result => result.condition);
  const baseline = summarizeCondition(byCondition.baseline || []);
  const skill = summarizeCondition(byCondition.skill || []);

  return {
    baseline,
    skill,
    lift: computeLift(baseline, skill)
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
      skill.explicit_constraint_enumeration_rate - baseline.explicit_constraint_enumeration_rate
  };
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
    by_category: summarizeByCategory(pairwiseResults, summarizePairwiseGroup)
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

function summarizeByCategory(results, summarizer) {
  const byCategory = groupBy(results, result => result.category || "uncategorized");

  return Object.fromEntries(
    Object.entries(byCategory)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, categoryResults]) => [category, summarizer(categoryResults)])
  );
}

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] ||= [];
    acc[key].push(item);
    return acc;
  }, {});
}
