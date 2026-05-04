import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_CASE_DIR = path.resolve(__dirname, "../cases");

const EXPECTED_BEHAVIORS = ["direct_answer", "clarify", "direct_or_clarify_with_assumptions"];

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

function validateStringArray(testCase, sourceFile, fieldName, { allowEmpty = true, required = true } = {}) {
  if (testCase[fieldName] === undefined && !required) return;

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

function inferExpectedBehavior(testCase) {
  if (testCase.expected_behavior) return testCase.expected_behavior;
  if (testCase.clarification_expected === true) return "clarify";
  if (testCase.requires_direct_answer === true) return "direct_answer";
  return "direct_or_clarify_with_assumptions";
}

function validateCase(testCase, sourceFile) {
  if (!["1.0", "1.1"].includes(testCase.schema_version)) {
    throw new Error(`${sourceFile}:${testCase.id || "unknown"} must have schema_version "1.0" or "1.1".`);
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

  if (!EXPECTED_BEHAVIORS.includes(inferExpectedBehavior(testCase))) {
    throw new Error(
      `${sourceFile}:${testCase.id} expected_behavior must be one of: ${EXPECTED_BEHAVIORS.join(", ")}.`
    );
  }

  if (testCase.schema_version === "1.1") {
    validateStringArray(testCase, sourceFile, "observed_facts", { allowEmpty: true });
    validateStringArray(testCase, sourceFile, "hard_constraints", { allowEmpty: false });
    validateStringArray(testCase, sourceFile, "soft_preferences", { allowEmpty: true });
    validateStringArray(testCase, sourceFile, "required_inference", { allowEmpty: true });
    validateStringArray(testCase, sourceFile, "prohibited_failure_modes", { allowEmpty: true });
  } else {
    validateStringArray(testCase, sourceFile, "binding_constraints", { allowEmpty: false });
    validateStringArray(testCase, sourceFile, "soft_constraints", { allowEmpty: true, required: false });
    validateStringArray(testCase, sourceFile, "common_failure_modes", { allowEmpty: true, required: false });
  }

  if (testCase.acceptable_final_answers !== undefined) {
    validateStringArray(testCase, sourceFile, "acceptable_final_answers", { allowEmpty: false });
  }

  if (testCase.not_acceptable_final_answers !== undefined) {
    validateStringArray(testCase, sourceFile, "not_acceptable_final_answers", { allowEmpty: false });
  }
}

function normalizeCase(testCase, sourceFile) {
  validateCase(testCase, sourceFile);

  const observedFacts = testCase.observed_facts || [];
  const hardConstraints = testCase.hard_constraints || testCase.binding_constraints || [];
  const softPreferences = testCase.soft_preferences || testCase.soft_constraints || [];
  const requiredInference = testCase.required_inference || [];
  const prohibitedFailureModes = testCase.prohibited_failure_modes || testCase.common_failure_modes || [];
  const expectedBehavior = inferExpectedBehavior(testCase);

  return {
    ...testCase,
    expected_behavior: expectedBehavior,
    acceptable_final_answers: testCase.acceptable_final_answers || [testCase.expected_final_answer],
    not_acceptable_final_answers: testCase.not_acceptable_final_answers || [],
    observed_facts: observedFacts,
    hard_constraints: hardConstraints,
    soft_preferences: softPreferences,
    required_inference: requiredInference,
    prohibited_failure_modes: prohibitedFailureModes,
    // Compatibility aliases used by older metrics/result readers.
    binding_constraints: hardConstraints,
    soft_constraints: softPreferences,
    common_failure_modes: prohibitedFailureModes,
    source_file: sourceFile
  };
}

function getCaseDir() {
  return process.env.CASE_DIR ? path.resolve(process.cwd(), process.env.CASE_DIR) : DEFAULT_CASE_DIR;
}

export function loadAllCases() {
  const caseDir = getCaseDir();

  if (!fs.existsSync(caseDir)) {
    throw new Error(`cases directory not found: ${caseDir}`);
  }

  const files = fs.readdirSync(caseDir).filter(file => file.endsWith(".json")).sort();
  const cases = [];

  for (const file of files) {
    const fullPath = path.join(caseDir, file);
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
