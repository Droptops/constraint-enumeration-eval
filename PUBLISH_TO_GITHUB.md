# Publish to GitHub

## 1. Create a new GitHub repo

Create an empty GitHub repository, for example:

```text
constraint-enumeration-eval
```

Do not initialize it with a README, license, or `.gitignore`; this repo already includes those files.

## 2. Push from your machine

From the unzipped repo root:

```bash
git init
git add .
git commit -m "Initial release: constraint enumeration eval"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/constraint-enumeration-eval.git
git push -u origin main
```

## 3. Install and validate locally

```bash
cd eval
npm ci
npm run ci
CASE_DIR=cases_holdout npm run check:cases
```

## 4. Configure API keys

```bash
cp .env.example .env.local
```

Add the API keys and model IDs you want to use. Then verify model access:

```bash
npm run check:models
```

## 5. Run the held-out eval

```bash
CASE_DIR=cases_holdout EVAL_CONDITIONS=careful_control,constraint_axis_prompting,style_matched_baseline,skill npm run eval
```

## 6. Rejudge cross-vendor before making public claims

Run at least one cross-vendor rejudge before presenting results as more than directional. Store the raw `.jsonl` and summary files from `eval/results/`.

## 7. Suggested disclosure

For a public write-up, disclose:

- The exact commit hash.
- Model names and dates of access verification.
- The case directory used: `cases_holdout` or `cases`.
- All conditions run.
- Number of trials.
- Judge vendor/model.
- Whether the run was same-vendor or cross-vendor judged.
- The summary JSON and raw JSONL artifacts.
