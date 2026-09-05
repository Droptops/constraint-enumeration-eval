# Contributing

This repository contains evaluation protocols, frozen cases, scorers, research notes, and agent-routing artifacts. Changes must preserve the distinction between development work and frozen evidence.

## Before changing an evaluation

- Read the relevant preregistration/freeze document first.
- Do not modify a frozen case set, scorer, threshold, or protocol in place and then report the new output as the old experiment.
- Put follow-on experiments on a new version/round with their own freeze boundary.
- Preserve raw outputs and enough metadata to reproduce any public table.
- Label exploratory metrics as exploratory rather than silently promoting them to gates.

## Validation

From `eval/`:

```bash
npm ci
npm run ci
CASE_DIR=cases_holdout npm run check:cases
```

Run additional experiment-specific checks documented by the relevant protocol.

## Public-repo hygiene

Do not commit API keys, populated `.env` files, private session URLs, private transcripts, proprietary datasets, or internal handoff material. Use synthetic, public, or explicitly redistributable fixtures.

## Pull requests

Explain the evaluation boundary affected by the change, the validation commands run, and whether the change modifies any previously frozen or published claim. If it does, create a new experiment/version rather than rewriting historical evidence in place.
