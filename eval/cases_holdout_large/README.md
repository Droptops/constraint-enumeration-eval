# Large held-out case set

Place the 100-300 independently authored held-out cases here.

Expected files:

```text
physical.json
ambiguity.json
business.json
safety.json
```

Each file must contain one JSON array only. Do not include a wrapper object.

Generate the case-authoring prompt with:

```bash
cd eval
NUM_CASES=100 npm run make:large-holdout-prompt
```

Validate with:

```bash
CASE_DIR=cases_holdout_large npm run check:cases
```

Do not author these cases after reading `SKILL.md` or `SKILL_PRODUCTION.md`; the value is independent holdout pressure.
