# Held-out cases

This directory contains a 20-case candidate held-out set split into four category files:

- `physical.json`
- `ambiguity.json`
- `business.json`
- `safety.json`

Each file must contain one JSON array only. Do not wrap these files in a top-level object.

Validate the held-out set:

```bash
cd eval
CASE_DIR=cases_holdout npm run check:cases
```

Run the recommended publishable comparison on the held-out set:

```bash
CASE_DIR=cases_holdout EVAL_CONDITIONS=careful_control,constraint_axis_prompting,style_matched_baseline,skill npm run eval
```

For the strongest public claim, freeze this directory before running the final eval and disclose how the held-out cases were authored and reviewed.
