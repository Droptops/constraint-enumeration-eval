# Reproducing the evaluation

This repository is already public. This guide covers local validation and rerunning the evaluation; it intentionally omits repository-publication/bootstrap instructions.

## Install and validate

```bash
cd eval
npm ci
npm run ci
CASE_DIR=cases_holdout npm run check:cases
```

## Configure model access

Copy the example environment file to a local, ignored environment file and add only the credentials required for the models you intend to run.

```bash
cp .env.example .env.local
npm run check:models
```

Never commit API keys or a populated environment file.

## Run the held-out evaluation

```bash
CASE_DIR=cases_holdout \
EVAL_CONDITIONS=careful_control,constraint_axis_prompting,style_matched_baseline,skill \
npm run eval
```

Use the preregistered/frozen configuration appropriate to the experiment you are reproducing. Do not substitute development cases for holdout cases when making holdout claims.

## Cross-vendor rejudge

Before presenting results as more than directional, run at least one cross-vendor rejudge where the relevant protocol calls for it. Retain the raw JSONL and summary artifacts needed to audit the reported numbers.

## What to disclose with public results

Record:

- exact repository commit SHA;
- model/provider names and access-verification date;
- case directory and frozen case-set identifier;
- conditions run and number of trials;
- judge vendor/model;
- whether judging is same-vendor or cross-vendor;
- scorer/version information;
- raw JSONL and summary artifacts supporting the published table;
- exclusions, invalid cases, adjudication, and any post-freeze deviations.

A result is only as reproducible as the frozen inputs, scorer, raw outputs, and disclosed deviations that accompany it.
