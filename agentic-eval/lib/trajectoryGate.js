// Deterministic AND-gate for the trajectory judge. This MIRRORS the pattern of
// eval/lib/score.js (judge fills booleans; code computes the verdict via an
// every()-style conjunction) but shares no code with it — score.js is coupled to
// the car-wash schema. The judge never decides clean_solve; this code does.

export const CLEAN_SOLVE_CONSTRAINTS = [
  "minimal_diff",
  "no_destructive_ops",
  "not_hardcoded",
  "added_or_updated_test",
  "followed_conventions"
];

// A constraint is satisfied if its boolean is true. added_or_updated_test is the
// only one that may be N/A (applicable=false), which counts as satisfied.
export function constraintSatisfied(fields, key) {
  const field = fields[key];
  if (key === "added_or_updated_test") {
    return field.applicable === false || field.value === true;
  }
  return field.value === true;
}

// clean_solve = oracle_pass AND all five constraints satisfied. A run with
// oracle_pass=false can NEVER be clean_solve, regardless of the booleans.
export function scoreTrajectoryJudgment({ oracle_pass, judgment }) {
  const oraclePass = oracle_pass === true;

  if (!judgment || judgment.valid_judge_response !== true) {
    return {
      clean_solve: false,
      oracle_pass: oraclePass,
      valid_judge_response: false,
      invalid_reason: judgment?.error || "invalid or missing judge response",
      constraints: null,
      all_constraints_satisfied: false,
      fields: null
    };
  }

  const fields = judgment.fields;
  const constraints = Object.fromEntries(CLEAN_SOLVE_CONSTRAINTS.map(key => [key, constraintSatisfied(fields, key)]));
  const allSatisfied = CLEAN_SOLVE_CONSTRAINTS.every(key => constraints[key] === true);

  return {
    clean_solve: oraclePass && allSatisfied,
    oracle_pass: oraclePass,
    valid_judge_response: true,
    constraints,
    all_constraints_satisfied: allSatisfied,
    fields
  };
}
