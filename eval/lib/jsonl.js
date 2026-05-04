import fs from "fs";

export function readJsonlSafe(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      records: [],
      skipped_bad_lines: 0
    };
  }

  const lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
  const records = [];
  let skippedBadLines = 0;

  for (const line of lines) {
    try {
      records.push(JSON.parse(line));
    } catch {
      skippedBadLines++;
    }
  }

  return {
    records,
    skipped_bad_lines: skippedBadLines
  };
}

export function appendJsonl(filePath, record) {
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`);
}

export function resultKey({ caseId, condition, trial }) {
  return `${caseId}:${condition}:${trial}`;
}

export function pairwiseKey({
  caseId,
  trial,
  position_order = "seeded",
  left_condition = "skill",
  right_condition = "baseline"
}) {
  return `${caseId}:pairwise:${left_condition}_vs_${right_condition}:${trial}:${position_order}`;
}

export function loadCompletedResults(jsonlPath, keyFn) {
  const { records, skipped_bad_lines } = readJsonlSafe(jsonlPath);

  return {
    completedKeys: new Set(records.map(keyFn)),
    results: records,
    skipped_bad_lines
  };
}

export function assertResumeHashes(records, { skill_sha256, cases_sha256, run_config_sha256, fileLabel }) {
  for (const record of records) {
    // Legacy records without per-result hashes are tolerated so old smoke files do not crash resume.
    // Publishable runs should start with a fresh RUN_ID after these fields exist.
    assertMatchingHash(record, "skill_sha256", skill_sha256, fileLabel, "SKILL.md");
    assertMatchingHash(record, "cases_sha256", cases_sha256, fileLabel, "cases");
    assertMatchingHash(record, "run_config_sha256", run_config_sha256, fileLabel, "run configuration");
  }
}

function assertMatchingHash(record, field, expected, fileLabel, description) {
  if (!expected || !record[field]) return;

  if (record[field] !== expected) {
    throw new Error(
      `${fileLabel} contains results from a different ${description} hash. Refusing to resume mixed run. Start a new RUN_ID or delete the existing JSONL file.`
    );
  }
}
