import fs from "fs";
import path from "path";
import { readJsonlSafe } from "../lib/jsonl.js";
import { seededBoolean } from "../lib/seededRandom.js";

const runId = process.env.RUN_ID;
const leftCondition = process.env.LEFT_CONDITION || "production_constraint_prompt";
const rightCondition = process.env.RIGHT_CONDITION || "careful_control";
const maxItems = Number(process.env.HUMAN_REVIEW_N || 30);

if (!runId) {
  throw new Error("Set RUN_ID to the source run id, for example RUN_ID=2026-... npm run export:human-review");
}

const resultsDir = path.join(process.cwd(), "results");
const sourcePath = path.join(resultsDir, `${runId}.results.jsonl`);
const { records } = readJsonlSafe(sourcePath);
const byKey = new Map(records.map(r => [`${r.caseId}:${r.condition}:${r.trial}`, r]));
const candidates = [];

for (const left of records.filter(r => r.condition === leftCondition)) {
  const right = byKey.get(`${left.caseId}:${rightCondition}:${left.trial}`);
  if (!right) continue;
  const leftIsA = seededBoolean(`${runId}:${left.caseId}:${left.trial}:${leftCondition}_vs_${rightCondition}:human`);
  candidates.push({
    case_id: left.caseId,
    trial: left.trial,
    prompt: left.prompt,
    answer_a: leftIsA ? left.answer : right.answer,
    answer_b: leftIsA ? right.answer : left.answer,
    answer_a_condition_blinded: leftIsA ? leftCondition : rightCondition,
    answer_b_condition_blinded: leftIsA ? rightCondition : leftCondition,
    reviewer_winner: "",
    reviewer_notes: ""
  });
}

const sample = candidates.slice(0, maxItems).map(({ answer_a_condition_blinded, answer_b_condition_blinded, ...publicRow }) => publicRow);
const answerKey = candidates.slice(0, maxItems).map(({ case_id, trial, answer_a_condition_blinded, answer_b_condition_blinded }) => ({
  case_id,
  trial,
  answer_a_condition: answer_a_condition_blinded,
  answer_b_condition: answer_b_condition_blinded
}));

const outPath = path.join(resultsDir, `${runId}.human_review.${leftCondition}_vs_${rightCondition}.json`);
const keyPath = path.join(resultsDir, `${runId}.human_review_key.${leftCondition}_vs_${rightCondition}.json`);
fs.writeFileSync(outPath, JSON.stringify(sample, null, 2));
fs.writeFileSync(keyPath, JSON.stringify(answerKey, null, 2));
console.log(`Wrote blinded review file: ${outPath}`);
console.log(`Wrote private answer key: ${keyPath}`);
