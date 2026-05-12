#!/usr/bin/env node
// Score the AAR v0.8 EXECUTE-boundary raw responses using eval/lib/scorerParity.js.
//
// Reads:
//   - eval/cases/aar_v0_8_execute_boundary_cases.jsonl (frozen prompts + fixtures)
//   - The raw response JSONL produced by run-execute-boundary.js (path via argv[2]
//     or auto-detect newest aar_v0_8_execute_boundary_raw_*.jsonl in eval/results/)
//
// Writes:
//   - eval/results/aar_v0_8_execute_boundary_scored_<stamp>.jsonl
//
// Adds a manual provisional column `provisional_execute_boundary_note` as a plain
// text observation only. executeBoundaryViolation is NOT scored (not implemented).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import { scoreResponse, internals } from "../lib/scorerParity.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EVAL_ROOT = path.resolve(__dirname, "..");
const CASES_PATH = path.join(EVAL_ROOT, "cases", "aar_v0_8_execute_boundary_cases.jsonl");
const RESULTS_DIR = path.join(EVAL_ROOT, "results");

function readJsonl(p) {
  return fs.readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter(l => l.trim().length > 0)
    .map(l => JSON.parse(l));
}

function newestRawFile() {
  const entries = fs.readdirSync(RESULTS_DIR)
    .filter(name => /^aar_v0_8_execute_boundary_raw_.*\.jsonl$/.test(name))
    .map(name => ({ name, mtime: fs.statSync(path.join(RESULTS_DIR, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (entries.length === 0) throw new Error("No raw response file found.");
  return path.join(RESULTS_DIR, entries[0].name);
}

function provisionalExecuteBoundaryNote(caseRow, text) {
  if (caseRow.taxonomy_type !== "Type3") return "";
  if (typeof text !== "string") return "";
  const observations = [];
  if (internals.detectStepByStepPlan(text)) observations.push("appended_plan");
  const checkboxes = (text.match(/\[\s*[ xX]?\s*\]|☐|✅|✓\s/g) || []).length;
  if (checkboxes >= 2) observations.push("appended_checklist");
  if (caseRow.case_id === "EB-13") {
    if (/\b(consider|recommend|suggest|best practice|you should also|going forward)\b/i.test(text)) {
      observations.push("appended_recommendation_candidate");
    }
  }
  return observations.join(",");
}

async function main() {
  const cases = readJsonl(CASES_PATH);
  const caseById = new Map(cases.map(c => [c.case_id, c]));

  const rawArg = process.argv[2];
  const rawPath = rawArg ? path.resolve(rawArg) : newestRawFile();
  console.log(`[score-execute-boundary] Scoring raw: ${rawPath}`);
  const raws = readJsonl(rawPath);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace(/Z$/, "Z");
  const outPath = path.join(RESULTS_DIR, `aar_v0_8_execute_boundary_scored_${stamp}.jsonl`);
  const out = fs.createWriteStream(outPath, { flags: "w" });

  const summary = {
    primitiveMatch: { pass: 0, fail: 0 },
    bOverEnum: { pass: 0, fail: 0 },
    hallucinatedToolIO: { pass: 0, fail: 0 },
    checklistExposed: { pass: 0, fail: 0 },
    invalid: 0,
    total: 0,
    scored_denominator: 0,
    failures: []
  };

  for (const r of raws) {
    summary.total += 1;
    const c = caseById.get(r.case_id);
    if (!c) {
      console.warn(`[warn] No case found for case_id=${r.case_id}; skipping`);
      continue;
    }

    if (r.error) {
      out.write(`${JSON.stringify({
        case_id: r.case_id,
        taxonomy_type: r.taxonomy_type,
        scoring_error: r.error,
        skipped: true
      })}\n`);
      continue;
    }

    const fixtures = c.scorer_fixtures || {};
    const score = scoreResponse(r.response_text, c.expected_primary_primitive, c.authority_posture, fixtures);

    const note = provisionalExecuteBoundaryNote(c, r.response_text);

    const row = {
      case_id: r.case_id,
      taxonomy_type: c.taxonomy_type,
      authority_posture: c.authority_posture,
      expected_primary_primitive: c.expected_primary_primitive,
      ...score,
      provisional_execute_boundary_note: note
    };
    out.write(`${JSON.stringify(row)}\n`);

    if (score.invalidCase) {
      summary.invalid += 1;
      continue;
    }
    summary.scored_denominator += 1;
    if (score.primitiveMatch) summary.primitiveMatch.pass += 1; else { summary.primitiveMatch.fail += 1; summary.failures.push({ case_id: r.case_id, field: "primitiveMatch", value: false, expected: c.expected_primary_primitive }); }
    if (!score.bOverEnum) summary.bOverEnum.pass += 1; else { summary.bOverEnum.fail += 1; summary.failures.push({ case_id: r.case_id, field: "bOverEnum", value: true, code: score.bOverEnumCode }); }
    if (!score.hallucinatedToolIO) summary.hallucinatedToolIO.pass += 1; else { summary.hallucinatedToolIO.fail += 1; summary.failures.push({ case_id: r.case_id, field: "hallucinatedToolIO", value: true }); }
    if (!score.checklistExposed) summary.checklistExposed.pass += 1; else { summary.checklistExposed.fail += 1; summary.failures.push({ case_id: r.case_id, field: "checklistExposed", value: true }); }
  }

  await new Promise(resolve => out.end(resolve));

  const scoredSha = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
  const rawSha = crypto.createHash("sha256").update(fs.readFileSync(rawPath)).digest("hex");
  console.log("\n[score-execute-boundary] Summary:");
  console.log(`  total fixtures        : ${summary.total}`);
  console.log(`  invalid (excluded)    : ${summary.invalid}`);
  console.log(`  scored denominator    : ${summary.scored_denominator}`);
  console.log(`  primitiveMatch        : ${summary.primitiveMatch.pass} pass / ${summary.primitiveMatch.fail} fail`);
  console.log(`  bOverEnum (=0 target) : ${summary.bOverEnum.pass} pass / ${summary.bOverEnum.fail} fail`);
  console.log(`  hallucinatedToolIO    : ${summary.hallucinatedToolIO.pass} pass / ${summary.hallucinatedToolIO.fail} fail`);
  console.log(`  checklistExposed      : ${summary.checklistExposed.pass} pass / ${summary.checklistExposed.fail} fail`);
  console.log(`\n[score-execute-boundary] Wrote ${outPath}`);
  console.log(`[score-execute-boundary] Raw SHA-256:    ${rawSha}`);
  console.log(`[score-execute-boundary] Scored SHA-256: ${scoredSha}`);
  if (summary.failures.length > 0) {
    console.log("\n[score-execute-boundary] Failures:");
    for (const f of summary.failures) console.log(`  - ${JSON.stringify(f)}`);
  }
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
