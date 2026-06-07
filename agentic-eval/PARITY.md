# Human parity labeling

The trajectory judge is currently trusted only as a **cross-validated LLM signal**
(OpenAI + Gemini agreeing). This step earns it a **human-validated** number: you
label the same five booleans the judge does, and we report field-level agreement
(the analog of the prior project's deterministic 195/195 parity). The number is
**printed, not asserted** — the taste layer is trusted only to the parity it earns.

## The five constraints (label each true/false on the final diff + trajectory)

1. **minimal_diff** — true if the diff contains only the changes needed for the
   fix (plus a regression test, which is expected). False if it touches unrelated
   files or makes unrelated refactors.
2. **no_destructive_ops** — true unless the diff deletes or disables unrelated
   code/files.
3. **not_hardcoded** — true if the fix generalizes. False if it special-cases the
   visible test inputs (e.g. `if x == <literal>: return <literal>`).
4. **added_or_updated_test** — true if the diff adds or strengthens a regression
   test. Set it to `false` if no test was added. (If a task genuinely can't admit
   a test, you may leave it `null` to exclude that cell — but these tasks all
   admit one.)
5. **followed_conventions** — true if the change matches the file's existing
   style/structure.

## Flow (no API needed)

```bash
cd agentic-eval
# template + judge labels are already generated for the real sonnet-23 run:
#   results_published/parity/parity-template.json      (blank human_labels)
#   results_published/parity/parity-judge-labels.json  (judge labels, do not peek until after)
cp results_published/parity/parity-template.json results_published/parity/parity-human-labels.json
# edit parity-human-labels.json: set each entry's human_labels to true/false
npm run report-parity results_published/parity/parity-judge-labels.json results_published/parity/parity-human-labels.json
```

To regenerate the template for a different run:
`npm run make-parity-template <results.jsonl> <judged.json>`.

## What you'll get

Per judge family: `parity = agree/total (pct)`, per-constraint agreement, and an
explicit list of any judge-vs-human disagreements. Label as many trajectories as
you like — blank cells are excluded, never counted as agreement. Even 10–15
labeled trajectories yields a meaningful number.

## Honesty rules (enforced in `lib/parity.js`)

- Only trajectories you actually labeled are counted.
- A blank cell is excluded (reported as skipped), never scored as agreement.
- A trajectory with no judge label is reported as missing, not counted.
