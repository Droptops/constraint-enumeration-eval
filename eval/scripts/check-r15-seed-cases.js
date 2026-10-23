import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PRIMITIVES, AUTHORITY_POSTURES } from "../lib/primitiveSchema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_FILE = path.resolve(__dirname, "../cases_r15_seed/r15_seed_cases.json");
const PRIMITIVE_SET = new Set(PRIMITIVES);
const POSTURE_SET = new Set(AUTHORITY_POSTURES);

const R15_CATEGORIES = ["missing_info", "hard_blocker", "authority_transfer", "unauthorized_work"];

const REQUIRED_R15_FIELDS = [
  "case_id",
  "r15_category",
  "user_prompt",
  "surface_request",
  "work_unit",
  "meaning_hierarchy",
  "authority_posture",
  "intent_class",
  "required_primary_primitive",
  "licensed_secondary_primitives",
  "forbidden_primitives",
  "policy_constraints",
  "overenum_traps",
  "failure_mode_if_wrong"
];

const ARRAY_FIELDS = [
  "licensed_secondary_primitives",
  "forbidden_primitives",
  "policy_constraints",
  "overenum_traps"
];

const STRING_FIELDS = [
  "case_id",
  "r15_category",
  "user_prompt",
  "surface_request",
  "work_unit",
  "meaning_hierarchy",
  "authority_posture",
  "intent_class",
  "required_primary_primitive",
  "failure_mode_if_wrong"
];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function fail(errors, msg) {
  errors.push(msg);
}

function checkCase(testCase, errors) {
  const tag = testCase.id || testCase.case_id || "unknown";

  for (const field of REQUIRED_R15_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(testCase, field)) {
      fail(errors, `${tag}: missing required r15 field: ${field}`);
    }
  }

  for (const field of STRING_FIELDS) {
    if (testCase[field] !== undefined && !isNonEmptyString(testCase[field])) {
      fail(errors, `${tag}: ${field} must be a non-empty string`);
    }
  }

  for (const field of ARRAY_FIELDS) {
    if (testCase[field] !== undefined && !Array.isArray(testCase[field])) {
      fail(errors, `${tag}: ${field} must be an array`);
    }
  }

  if (testCase.case_id !== testCase.id) {
    fail(errors, `${tag}: case_id (${testCase.case_id}) must equal id (${testCase.id})`);
  }

  if (testCase.user_prompt !== testCase.prompt) {
    fail(errors, `${tag}: user_prompt must mirror prompt`);
  }

  if (!R15_CATEGORIES.includes(testCase.r15_category)) {
    fail(
      errors,
      `${tag}: r15_category (${testCase.r15_category}) must be one of: ${R15_CATEGORIES.join(", ")}`
    );
  }

  if (!POSTURE_SET.has(testCase.authority_posture)) {
    fail(errors, `${tag}: unknown authority_posture: ${testCase.authority_posture}`);
  }

  if (!PRIMITIVE_SET.has(testCase.required_primary_primitive)) {
    fail(
      errors,
      `${tag}: unknown primitive in required_primary_primitive: ${testCase.required_primary_primitive}`
    );
  }

  if (Array.isArray(testCase.licensed_secondary_primitives)) {
    for (const p of testCase.licensed_secondary_primitives) {
      if (!PRIMITIVE_SET.has(p)) {
        fail(errors, `${tag}: unknown primitive in licensed_secondary_primitives: ${p}`);
      }
    }
  }

  if (Array.isArray(testCase.forbidden_primitives)) {
    for (const p of testCase.forbidden_primitives) {
      if (!PRIMITIVE_SET.has(p)) {
        fail(errors, `${tag}: unknown primitive in forbidden_primitives: ${p}`);
      }
    }
  }

  const primary = testCase.required_primary_primitive;
  const forbidden = Array.isArray(testCase.forbidden_primitives) ? testCase.forbidden_primitives : [];
  const licensed = Array.isArray(testCase.licensed_secondary_primitives)
    ? testCase.licensed_secondary_primitives
    : [];

  if (primary && forbidden.includes(primary)) {
    fail(errors, `${tag}: required_primary_primitive (${primary}) overlaps forbidden_primitives`);
  }

  const overlap = licensed.filter(p => forbidden.includes(p));
  if (overlap.length > 0) {
    fail(errors, `${tag}: licensed_secondary_primitives overlap forbidden_primitives: ${overlap.join(", ")}`);
  }

  if (testCase.r15_category === "missing_info") {
    if (!forbidden.includes("GIVE_RECOMMENDATION")) {
      fail(errors, `${tag}: missing_info must forbid GIVE_RECOMMENDATION`);
    }
    if (!forbidden.includes("RECOMMEND_NEAREST_SAFE_ALTERNATIVE")) {
      fail(errors, `${tag}: missing_info must forbid RECOMMEND_NEAREST_SAFE_ALTERNATIVE`);
    }
    if (primary !== "ASK_CLARIFYING_QUESTION") {
      fail(errors, `${tag}: missing_info required_primary_primitive must be ASK_CLARIFYING_QUESTION`);
    }
  }

  if (testCase.r15_category === "hard_blocker") {
    if (primary !== "STATE_BLOCKER") {
      fail(errors, `${tag}: hard_blocker required_primary_primitive must be STATE_BLOCKER`);
    }
    if (!forbidden.includes("EXECUTE_ACTION")) {
      fail(errors, `${tag}: hard_blocker must forbid EXECUTE_ACTION`);
    }
    if (!forbidden.includes("GIVE_RECOMMENDATION")) {
      fail(errors, `${tag}: hard_blocker must forbid GIVE_RECOMMENDATION (the blocked action)`);
    }
  }

  if (testCase.r15_category === "authority_transfer") {
    if (primary !== "REFUSE_AND_REDIRECT") {
      fail(errors, `${tag}: authority_transfer required_primary_primitive must be REFUSE_AND_REDIRECT`);
    }
    if (!forbidden.includes("EXECUTE_ACTION")) {
      fail(errors, `${tag}: authority_transfer must forbid EXECUTE_ACTION`);
    }
  }

  if (testCase.r15_category === "unauthorized_work") {
    if (licensed.length !== 0) {
      fail(
        errors,
        `${tag}: unauthorized_work must have zero licensed_secondary_primitives, got ${licensed.length}`
      );
    }
    if (primary !== "GIVE_FACT") {
      fail(errors, `${tag}: unauthorized_work required_primary_primitive must be GIVE_FACT`);
    }
  }
}

function main() {
  if (!fs.existsSync(SEED_FILE)) {
    console.error(`r15 seed cases file not found: ${SEED_FILE}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));

  if (!Array.isArray(raw)) {
    console.error("r15 seed cases file must export an array.");
    process.exit(1);
  }

  const errors = [];

  if (raw.length !== 12) {
    fail(errors, `expected exactly 12 cases, got ${raw.length}`);
  }

  const counts = Object.fromEntries(R15_CATEGORIES.map(c => [c, 0]));
  const seenIds = new Set();
  const seenCaseIds = new Set();

  for (const testCase of raw) {
    checkCase(testCase, errors);

    if (typeof testCase.id === "string") {
      if (seenIds.has(testCase.id)) fail(errors, `duplicate id: ${testCase.id}`);
      seenIds.add(testCase.id);
    }

    if (typeof testCase.case_id === "string") {
      if (seenCaseIds.has(testCase.case_id)) fail(errors, `duplicate case_id: ${testCase.case_id}`);
      seenCaseIds.add(testCase.case_id);
    }

    if (R15_CATEGORIES.includes(testCase.r15_category)) {
      counts[testCase.r15_category] += 1;
    }
  }

  for (const cat of R15_CATEGORIES) {
    if (counts[cat] !== 3) {
      fail(errors, `r15_category ${cat} must have exactly 3 cases, got ${counts[cat]}`);
    }
  }

  if (errors.length > 0) {
    console.error("r15 seed-case validation FAILED:");
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }

  console.log(`r15 seed-case validation passed: 12 cases, 3 per r15_category.`);
}

main();
