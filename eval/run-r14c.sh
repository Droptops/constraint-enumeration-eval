#!/usr/bin/env bash
# r14c reproduction: v6.3 default vs v6.7 targeted, GPT-5.1 primary, Opus 4.7 rejudge
set -euo pipefail
set -a
. "C:/Users/m4vil/constraint-enumeration-eval/eval/.env.local"
set +a

export ANSWER_PROVIDER=anthropic
export ANTHROPIC_MODEL=claude-sonnet-4-6
export ANSWER_TEMPERATURE=0
export JUDGE_PROVIDER=openai
export OPENAI_JUDGE_MODEL=gpt-5.1
export JUDGE_TEMPERATURE=0
export CASE_DIR=cases_holdout
export TRIALS=3
export EVAL_CONDITIONS=baseline,production_blocker_first_v6.3_candidate,production_blocker_first_v6.7_candidate
export PRIMARY_CONDITION=production_blocker_first_v6.7_candidate
export PAIRWISE_COMPARISONS=production_blocker_first_v6.7_candidate:production_blocker_first_v6.3_candidate
export DOUBLE_SWAPPED_PAIRWISE=false

TS="$(date +%Y%m%dT%H%M%S)"
export RUN_ID="r14c-v67-targeted-${TS}"
echo "RUN_ID=${RUN_ID}" | tee run-r14c.runid.txt

echo "[r14c] Starting absolute-judge run with GPT-5.1 primary..."
node scripts/run-eval.js 2>&1 | tee "results/${RUN_ID}.run.log"
echo "[r14c] Absolute-judge run complete."

REJUDGE_TS="$(date +%Y%m%dT%H%M%S)"
export SOURCE_RUN_ID="${RUN_ID}"
unset RUN_ID
export REJUDGE_RUN_ID="${SOURCE_RUN_ID}.rejudge.opus47-${REJUDGE_TS}"
export RUN_ID="${REJUDGE_RUN_ID}"
export JUDGE_PROVIDER=anthropic
export JUDGE_MODEL=claude-opus-4-7
export OPENAI_JUDGE_MODEL=gpt-5.1
echo "REJUDGE_RUN_ID=${REJUDGE_RUN_ID}" | tee -a run-r14c.runid.txt

echo "[r14c] Starting Opus 4.7 rejudge..."
node scripts/rejudge-existing.js 2>&1 | tee "results/${REJUDGE_RUN_ID}.run.log"
echo "[r14c] Rejudge complete."

echo "[r14c] Done."
