import fs from "fs";
import path from "path";

const CASE_DIR = path.join(process.cwd(), "cases");

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function expectedCategoryForSource(sourceFile) {
  return path.basename(sourceFile, ".json");
}

function validateBooleanField(testCase, sourceFile, fieldName) {
  if (typeof testCase[fieldName] !== "boolean") {
    throw new Error(`${sourceFile}:${testCase.id} must define boolean ${fieldName}.`);
  }
}

function validateStringArray(testCase, sourceFile, fieldName, { allowEmpty = true } = {}) {
  if (!Array.isArray(testCase[fieldName])) {
    throw new Error(`${sourceFile}:${testCase.id} must have ${fieldName} array.`);
  }

  if (!allowEmpty && testCase[fieldName].length === 0) {
    throw new Error(`${sourceFile}:${testCase.id} must have at least one ${fieldName} entry.`);
  }

  for (const value of testCase[fieldName]) {
    if (!isNonEmptyString(value)) {
      throw new Error(`${sourceFile}:${testCase.id} has invalid ${fieldName} entry.`);
    }
  }
}

function validateCase(testCase, sourceFile) {
  if (testCase.schema_version !== "1.0") {
    throw new Error(`${sourceFile}:${testCase.id || "unknown"} must have schema_version "1.0".`);
  }

  if (!isNonEmptyString(testCase.id)) {
    throw new Error(`${sourceFile} has a case with missing or invalid id.`);
  }

  const expectedCategory = expectedCategoryForSource(sourceFile);

  if (testCase.category !== expectedCategory) {
    throw new Error(
      `${sourceFile}:${testCase.id} category must match its case file: expected "${expectedCategory}".`
    );
  }

  if (!isNonEmptyString(testCase.prompt)) {
    throw new Error(`${sourceFile}:${testCase.id} has missing prompt.`);
  }

  if (!isNonEmptyString(testCase.expected_final_answer)) {
    throw new Error(`${sourceFile}:${testCase.id} must have expected_final_answer.`);
  }

  validateBooleanField(testCase, sourceFile, "requires_direct_answer");
  validateBooleanField(testCase, sourceFile, "clarification_expected");

  if (testCase.requires_direct_answer === true && testCase.clarification_expected === true) {
    throw new Error(
      `${sourceFile}:${testCase.id} cannot set both requires_direct_answer and clarification_expected to true.`
    );
  }

  validateStringArray(testCase, sourceFile, "binding_constraints", { allowEmpty: false });

  if (testCase.soft_constraints !== undefined) {
    validateStringArray(testCase, sourceFile, "soft_constraints", { allowEmpty: true });
  }

  if (testCase.common_failure_modes !== undefined) {
    validateStringArray(testCase, sourceFile, "common_failure_modes", { allowEmpty: true });
  }

  if (testCase.acceptable_final_answers !== undefined) {
    validateStringArray(testCase, sourceFile, "acceptable_final_answers", { allowEmpty: false });
  }
}

function normalizeCase(testCase, sourceFile) {
  validateCase(testCase, sourceFile);

  return {
    ...testCase,
    acceptable_final_answers: testCase.acceptable_final_answers || [testCase.expected_final_answer],
    soft_constraints: testCase.soft_constraints || [],
    common_failure_modes: testCase.common_failure_modes || [],
    source_file: sourceFile
  };
}

export function loadAllCases() {
  if (!fs.existsSync(CASE_DIR)) {
    throw new Error("cases directory not found.");
  }

  const files = fs.readdirSync(CASE_DIR).filter(file => file.endsWith(".json")).sort();
  const cases = [];

  for (const file of files) {
    const fullPath = path.join(CASE_DIR, file);
    const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"));

    if (!Array.isArray(parsed)) {
      throw new Error(`${file} must export an array of cases.`);
    }

    for (const testCase of parsed) {
      cases.push(normalizeCase(testCase, file));
    }
  }

  if (cases.length === 0) {
    throw new Error("No eval cases found.");
  }

  const ids = new Set();

  for (const testCase of cases) {
    if (ids.has(testCase.id)) {
      throw new Error(`Duplicate case id: ${testCase.id}`);
    }

    ids.add(testCase.id);
  }

  return cases;
}

export function loadCaseById(caseId) {
  return loadAllCases().find(testCase => testCase.id === caseId) || null;
}
