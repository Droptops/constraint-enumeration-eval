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

export function pairwiseKey({ caseId, trial, position_order = "seeded" }) {
  return `${caseId}:pairwise:${trial}:${position_order}`;
}

export function loadCompletedResults(jsonlPath, keyFn) {
  const { records, skipped_bad_lines } = readJsonlSafe(jsonlPath);

  return {
    completedKeys: new Set(records.map(keyFn)),
    results: records,
    skipped_bad_lines
  };
}

export function assertResumeHashes(records, { skill_sha256, cases_sha256, fileLabel }) {
  for (const record of records) {
    // Legacy records without per-result hashes are tolerated so old smoke files do not crash resume.
    // Publishable runs should start with a fresh RUN_ID after this field exists.
    if (record.skill_sha256 && record.skill_sha256 !== skill_sha256) {
      throw new Error(
        `${fileLabel} contains results from a different SKILL.md hash. Refusing to resume mixed-skill run. Start a new RUN_ID or delete the existing JSONL file.`
      );
    }

    if (record.cases_sha256 && record.cases_sha256 !== cases_sha256) {
      throw new Error(
        `${fileLabel} contains results from a different cases hash. Refusing to resume mixed-case run. Start a new RUN_ID or delete the existing JSONL file.`
      );
    }
  }
}
