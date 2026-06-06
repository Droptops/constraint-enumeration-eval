// Deterministic fake introspector for the offline proof. Classifies a failed run
// from its recorded signals (stop reason, diff). Returns { text, stop_reason }
// like the real transport so both share the parse/aggregate path. Stand-in for
// the model's reflection, sufficient to label the crafted/recorded fixtures.
export function heuristicIntrospectionFields(run) {
  if (run.loop_stop_reason === "budget_exhausted") {
    return { bucket: "budget_exhausted_no_fix", rationale: "Ran out of steps without making the tests pass.", suggested_fix: "Locate and fix the bug within the step budget." };
  }
  if (/\bif\b.*==/.test(run.diff || "")) {
    return { bucket: "hardcoded_to_tests", rationale: "Special-cased a specific input instead of fixing the general logic.", suggested_fix: "Implement the general behavior described in the spec." };
  }
  if (!run.diff) {
    return { bucket: "never_edited", rationale: "No successful edit was made to the source.", suggested_fix: "Edit the buggy source after reading it." };
  }
  return { bucket: "incomplete_or_wrong_fix", rationale: "Edited the source but the fix did not satisfy the tests.", suggested_fix: "Re-read the spec and address the actual defect." };
}

export async function heuristicIntrospect(run) {
  return { text: JSON.stringify(heuristicIntrospectionFields(run)), stop_reason: "completed" };
}
