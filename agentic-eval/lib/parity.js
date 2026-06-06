import { CLEAN_SOLVE_CONSTRAINTS } from "./trajectoryGate.js";

export { CLEAN_SOLVE_CONSTRAINTS as PARITY_CONSTRAINTS };

// Deterministic judge-vs-human parity (the analog of the prior project's
// 195/195 deterministic-scorer-vs-human parity, ported to LLM-judge-vs-human).
//
// judgeLabels / humanLabels: { [trajectory_id]: { [constraint]: boolean | null } }
// where each constraint value is the SATISFIED boolean (test N/A folded to true).
//
// Honesty rules baked in:
//   - Only trajectories the human actually labeled are counted.
//   - A cell the human left blank (null/undefined) is EXCLUDED and counted as
//     skipped — never scored as agreement.
//   - Trajectories with no judge label are reported as missing, not counted.
// This is the analog of the prior project's deterministic parity. It prints a
// number; it does not assert trust.
export function computeParity(judgeLabels, humanLabels) {
  const labeledIds = Object.keys(humanLabels);
  const ids = labeledIds.filter(id => judgeLabels[id]);
  const missingJudgeLabels = labeledIds.filter(id => !judgeLabels[id]);

  const perConstraint = Object.fromEntries(CLEAN_SOLVE_CONSTRAINTS.map(k => [k, { agree: 0, total: 0 }]));
  const disagreements = [];
  let agree = 0;
  let total = 0;
  let skipped = 0;

  for (const id of ids) {
    for (const key of CLEAN_SOLVE_CONSTRAINTS) {
      const human = humanLabels[id][key];
      const judge = judgeLabels[id][key];
      if (human === null || human === undefined) {
        skipped += 1;
        continue;
      }
      total += 1;
      perConstraint[key].total += 1;
      if (human === judge) {
        agree += 1;
        perConstraint[key].agree += 1;
      } else {
        disagreements.push({ trajectory_id: id, constraint: key, judge, human });
      }
    }
  }

  return {
    n_trajectories: ids.length,
    n_cells: total,
    agree_cells: agree,
    parity: total ? agree / total : null,
    skipped_unlabeled_cells: skipped,
    missing_judge_labels: missingJudgeLabels,
    per_constraint: Object.fromEntries(
      CLEAN_SOLVE_CONSTRAINTS.map(key => {
        const { agree: a, total: t } = perConstraint[key];
        return [key, { agree: a, total: t, parity: t ? a / t : null }];
      })
    ),
    disagreements
  };
}

// Convert a scored judgment (from trajectoryGate) into the flat label shape this
// harness compares: the per-constraint SATISFIED booleans.
export function judgmentToLabels(score) {
  if (!score || score.valid_judge_response !== true) return null;
  return { ...score.constraints };
}
