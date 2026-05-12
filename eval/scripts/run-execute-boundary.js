#!/usr/bin/env node
// Minimal glue runner for the AAR v0.8 EXECUTE-boundary regression set.
//
// Reads eval/cases/aar_v0_8_execute_boundary_cases.jsonl, calls the Anthropic
// API once per fixture at temperature 0 with the repo's SKILL.md as the system
// prompt, and writes raw responses to a timestamped JSONL under eval/results/.
//
// Not a general-purpose runner. Not part of the existing pairwise / judge harness.
// Does not modify any v0.8 artifact, only reads SKILL.md and the case JSONL.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { callClaude } from "../lib/anthropic.js";
import { loadSkillPrompt } from "../lib/loadSkill.js";

function loadSkillFromZip(zipPath) {
  if (!fs.existsSync(zipPath)) {
    throw new Error(`SKILL_ZIP_PATH not found: ${zipPath}`);
  }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aar-skill-zip-"));
  try {
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Expand-Archive -LiteralPath "${zipPath}" -DestinationPath "${tmpDir}" -Force`
      ],
      { stdio: "pipe" }
    );
    const skillPath = path.join(tmpDir, "SKILL.md");
    if (!fs.existsSync(skillPath)) {
      throw new Error(`SKILL.md not found inside ZIP: ${zipPath}`);
    }
    return fs.readFileSync(skillPath, "utf8");
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EVAL_ROOT = path.resolve(__dirname, "..");

const CASES_PATH = path.join(EVAL_ROOT, "cases", "aar_v0_8_execute_boundary_cases.jsonl");
const RESULTS_DIR = path.join(EVAL_ROOT, "results");

function isoStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").replace(/Z$/, "Z");
}

function sha256OfFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function readCases() {
  const raw = fs.readFileSync(CASES_PATH, "utf8");
  return raw
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .map((line, idx) => {
      try {
        return JSON.parse(line);
      } catch (err) {
        throw new Error(`Invalid JSON on line ${idx + 1}: ${err.message}`);
      }
    });
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ERROR: ANTHROPIC_API_KEY is not set. Aborting.");
    process.exit(2);
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const temperature = 0;
  const zipPath = process.env.SKILL_ZIP_PATH;
  let systemPrompt;
  let systemPromptSource;
  if (zipPath) {
    systemPrompt = loadSkillFromZip(zipPath);
    systemPromptSource = `zip:${zipPath}`;
  } else {
    const cwd = process.cwd();
    process.chdir(EVAL_ROOT);
    systemPrompt = loadSkillPrompt();
    process.chdir(cwd);
    systemPromptSource = "eval/SKILL.md";
  }

  const cases = readCases();
  console.log(`[run-execute-boundary] Loaded ${cases.length} fixtures from ${CASES_PATH}`);
  console.log(`[run-execute-boundary] Model: ${model}, temperature: ${temperature}`);
  console.log(`[run-execute-boundary] System prompt source: ${systemPromptSource} (${systemPrompt.length} chars)`);

  const stamp = isoStamp();
  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const outPath = path.join(RESULTS_DIR, `aar_v0_8_execute_boundary_raw_${stamp}.jsonl`);
  const out = fs.createWriteStream(outPath, { flags: "w" });

  const startedAt = new Date().toISOString();
  let okCount = 0;
  let errCount = 0;

  for (const c of cases) {
    const t0 = Date.now();
    try {
      const result = await callClaude({
        model,
        system: systemPrompt,
        messages: [{ role: "user", content: c.prompt }],
        maxTokens: 1200,
        temperature
      });
      const row = {
        case_id: c.case_id,
        taxonomy_type: c.taxonomy_type,
        authority_posture: c.authority_posture,
        expected_primary_primitive: c.expected_primary_primitive,
        prompt_sha256: crypto.createHash("sha256").update(c.prompt).digest("hex"),
        response_text: result.text,
        stop_reason: result.stop_reason,
        model,
        temperature,
        latency_ms: Date.now() - t0,
        timestamp: new Date().toISOString()
      };
      out.write(`${JSON.stringify(row)}\n`);
      okCount += 1;
      console.log(`[ok ] ${c.case_id} (${row.latency_ms} ms, stop=${row.stop_reason})`);
    } catch (err) {
      const row = {
        case_id: c.case_id,
        taxonomy_type: c.taxonomy_type,
        error: String(err && err.message ? err.message : err),
        model,
        temperature,
        latency_ms: Date.now() - t0,
        timestamp: new Date().toISOString()
      };
      out.write(`${JSON.stringify(row)}\n`);
      errCount += 1;
      console.error(`[err] ${c.case_id}: ${row.error}`);
    }
  }

  await new Promise(resolve => out.end(resolve));

  const finishedAt = new Date().toISOString();
  const rawSha = sha256OfFile(outPath);
  const summary = {
    run_id: stamp,
    case_count: cases.length,
    ok_count: okCount,
    error_count: errCount,
    started_at: startedAt,
    finished_at: finishedAt,
    model,
    temperature,
    system_prompt_source: systemPromptSource,
    system_prompt_length_chars: systemPrompt.length,
    cases_file: path.relative(EVAL_ROOT, CASES_PATH),
    raw_results_file: path.relative(EVAL_ROOT, outPath),
    raw_results_sha256: rawSha
  };
  const summaryPath = path.join(RESULTS_DIR, `aar_v0_8_execute_boundary_run_${stamp}.json`);
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`\n[run-execute-boundary] Wrote ${outPath}`);
  console.log(`[run-execute-boundary] SHA-256: ${rawSha}`);
  console.log(`[run-execute-boundary] Summary: ${summaryPath}`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
