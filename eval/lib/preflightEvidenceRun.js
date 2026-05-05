import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { systemForCondition } from "./runCase.js";

const VALID_PROVIDERS = new Set(["openai", "anthropic", "google", "gemini"]);

function splitList(value) {
  if (typeof value !== "string") return [];
  return value.split(",").map(s => s.trim()).filter(Boolean);
}

function isPresent(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function parsePairwise(raw) {
  return splitList(raw).map(token => {
    const parts = token.split(":").map(s => s.trim());
    return {
      raw: token,
      left: parts[0] || "",
      right: parts[1] || "",
      malformed: parts.length !== 2 || !parts[0] || !parts[1]
    };
  });
}

function parseJudgeSpecs(raw) {
  return splitList(raw).map(token => {
    const idx = token.indexOf(":");
    const provider = (idx === -1 ? token : token.slice(0, idx)).trim().toLowerCase();
    const model = idx === -1 ? "" : token.slice(idx + 1).trim();
    return { raw: token, provider, model, malformed: idx === -1 || !model };
  });
}

function locateCaseDir(caseDir) {
  const candidates = [
    path.resolve(process.cwd(), caseDir),
    path.resolve(process.cwd(), "..", caseDir),
    path.resolve(process.cwd(), "cases", caseDir),
    path.resolve(process.cwd(), "..", "cases", caseDir)
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        return candidate;
      }
    } catch {
      // ignore stat errors and keep searching
    }
  }
  return null;
}

function safeExec(cmd) {
  try {
    return { ok: true, output: execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }) };
  } catch (err) {
    return { ok: false, output: "", error: err.message };
  }
}

export function runPreflight(env) {
  const errors = [];
  const warnings = [];

  const evalConditionsRaw = env.EVAL_CONDITIONS;
  if (!isPresent(evalConditionsRaw)) {
    errors.push("EVAL_CONDITIONS is not set. Set it explicitly to lock the run plan.");
  }
  const conditions = splitList(evalConditionsRaw);

  const pairwiseRaw = env.PAIRWISE_COMPARISONS;
  if (!isPresent(pairwiseRaw)) {
    errors.push("PAIRWISE_COMPARISONS is not set. Set it explicitly to lock pair comparisons.");
  }
  const pairs = parsePairwise(pairwiseRaw);

  if (!isPresent(env.LAB_PRIMARY_JUDGE_SPEC)) {
    errors.push("LAB_PRIMARY_JUDGE_SPEC is not set.");
  }

  if (!isPresent(env.LAB_JUDGE_SPECS)) {
    errors.push("LAB_JUDGE_SPECS is not set.");
  }

  const promptIdentities = {};
  for (const condition of conditions) {
    try {
      const system = systemForCondition(condition);
      if (typeof system !== "string" || system.trim().length === 0) {
        errors.push(`Condition "${condition}" resolves to an empty system prompt.`);
        continue;
      }
      promptIdentities[condition] = {
        preview: system.slice(0, 60),
        sha256: crypto.createHash("sha256").update(system).digest("hex"),
        length: system.length
      };
    } catch (err) {
      errors.push(`Condition "${condition}" could not be resolved: ${err.message}`);
    }
  }

  const conditionSet = new Set(conditions);
  for (const pair of pairs) {
    if (pair.malformed) {
      errors.push(`PAIRWISE_COMPARISONS entry "${pair.raw}" is malformed (expected left:right).`);
      continue;
    }
    if (!conditionSet.has(pair.left)) {
      errors.push(
        `PAIRWISE_COMPARISONS "${pair.raw}" references "${pair.left}", which is not in EVAL_CONDITIONS.`
      );
    }
    if (!conditionSet.has(pair.right)) {
      errors.push(
        `PAIRWISE_COMPARISONS "${pair.raw}" references "${pair.right}", which is not in EVAL_CONDITIONS.`
      );
    }
  }

  const judgeSpecs = parseJudgeSpecs(env.LAB_JUDGE_SPECS);
  const keyPresence = {};
  const seenProviders = new Set();
  for (const spec of judgeSpecs) {
    if (spec.malformed) {
      errors.push(`LAB_JUDGE_SPECS entry "${spec.raw}" is malformed (expected provider:model).`);
      continue;
    }
    if (!VALID_PROVIDERS.has(spec.provider)) {
      errors.push(
        `LAB_JUDGE_SPECS provider "${spec.provider}" is unsupported. Allowed: openai, anthropic, google, gemini.`
      );
      continue;
    }
    if (seenProviders.has(spec.provider)) continue;
    seenProviders.add(spec.provider);

    if (spec.provider === "openai") {
      const present = isPresent(env.OPENAI_API_KEY);
      keyPresence.openai = present;
      if (!present) {
        errors.push(`LAB_JUDGE_SPECS uses provider "openai" but OPENAI_API_KEY is not set.`);
      }
    } else if (spec.provider === "anthropic") {
      const present = isPresent(env.ANTHROPIC_API_KEY);
      keyPresence.anthropic = present;
      if (!present) {
        errors.push(`LAB_JUDGE_SPECS uses provider "anthropic" but ANTHROPIC_API_KEY is not set.`);
      }
    } else if (spec.provider === "google" || spec.provider === "gemini") {
      const present = isPresent(env.GEMINI_API_KEY) || isPresent(env.GOOGLE_API_KEY);
      keyPresence[spec.provider] = present;
      if (!present) {
        errors.push(
          `LAB_JUDGE_SPECS includes "${spec.raw}" but neither GEMINI_API_KEY nor GOOGLE_API_KEY is set. ` +
            `If Gemini is not intended, remove it from LAB_JUDGE_SPECS.`
        );
      }
    }
  }

  const trialsPerCase = isPresent(env.TRIALS_PER_CASE) ? Number(env.TRIALS_PER_CASE) : 3;
  if (!Number.isFinite(trialsPerCase) || trialsPerCase <= 0) {
    errors.push(`TRIALS_PER_CASE must be a positive number; got "${env.TRIALS_PER_CASE}".`);
  }

  const caseDir = isPresent(env.CASE_DIR) ? env.CASE_DIR : "cases";
  let caseCount = "unknown";
  let caseFileCount = 0;
  let resolvedCaseDir = null;
  const located = locateCaseDir(caseDir);
  if (!located) {
    warnings.push(`Could not locate CASE_DIR "${caseDir}" — caseCount=unknown, expectedRows cannot be computed.`);
  } else {
    try {
      const files = fs.readdirSync(located).filter(name => name.endsWith(".json"));
      caseFileCount = files.length;
      let total = 0;
      for (const file of files) {
        const fullPath = path.join(located, file);
        try {
          const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"));
          if (Array.isArray(parsed)) {
            total += parsed.length;
          } else if (parsed && Array.isArray(parsed.cases)) {
            total += parsed.cases.length;
          } else {
            warnings.push(`CASE_DIR file "${file}" has unrecognized structure (not an array or { cases: [...] }); counting 0 cases.`);
          }
        } catch (err) {
          warnings.push(`Could not parse CASE_DIR file "${file}": ${err.message}`);
        }
      }
      caseCount = total;
      resolvedCaseDir = located;
    } catch (err) {
      warnings.push(`Could not read CASE_DIR "${located}": ${err.message}`);
    }
  }

  const expectedRows =
    caseCount === "unknown" || !Number.isFinite(trialsPerCase)
      ? "unknown"
      : caseCount * conditions.length * trialsPerCase;

  const gitHeadResult = safeExec("git rev-parse HEAD");
  const gitStatusResult = safeExec("git status --short");
  if (!gitHeadResult.ok) warnings.push(`git rev-parse HEAD failed: ${gitHeadResult.error}`);
  if (!gitStatusResult.ok) warnings.push(`git status --short failed: ${gitStatusResult.error}`);

  const runId = isPresent(env.RUN_ID) ? env.RUN_ID : `preflight-${new Date().toISOString().replace(/[:.]/g, "-")}`;

  const plan = {
    runId,
    caseDir,
    resolvedCaseDir,
    conditions,
    pairwiseComparisons: pairs.map(p => `${p.left}:${p.right}`),
    primaryJudge: isPresent(env.LAB_PRIMARY_JUDGE_SPEC) ? env.LAB_PRIMARY_JUDGE_SPEC : null,
    judgeSpecs: judgeSpecs.map(s => s.raw),
    judgeProviders: [...seenProviders],
    expectedRows,
    caseCount,
    caseFileCount,
    trialsPerCase: Number.isFinite(trialsPerCase) ? trialsPerCase : null,
    keyPresence,
    gitHead: gitHeadResult.ok ? gitHeadResult.output.trim() : null,
    gitStatus: gitStatusResult.ok ? gitStatusResult.output : null,
    promptIdentities
  };

  return { ok: errors.length === 0, errors, warnings, plan };
}
