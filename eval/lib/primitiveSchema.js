// Agent Authority Router — Work Unit / Authority / Primitive schema.
//
// PrimitiveMatch is exploratory only. It is not a promotion gate. The legacy
// OverEnum metric remains the r15 gate metric.

export const PRIMITIVES = Object.freeze([
  "GIVE_FACT",
  "GIVE_RECOMMENDATION",
  "ASK_CLARIFYING_QUESTION",
  "STATE_BLOCKER",
  "RECOMMEND_NEAREST_SAFE_ALTERNATIVE",
  "COMPARE_OPTIONS",
  "MAKE_PLAN",
  "EXECUTE_ACTION",
  "REFUSE_AND_REDIRECT",
  "SUMMARIZE"
]);

const PRIMITIVE_SET = new Set(PRIMITIVES);

export const AUTHORITY_POSTURES = Object.freeze(["ADVISE", "EXECUTE", "DEFER", "STOP"]);

const POSTURE_SET = new Set(AUTHORITY_POSTURES);

export const REQUIRED_ANNOTATION_FIELDS = Object.freeze([
  "surface_request",
  "work_unit",
  "meaning_hierarchy",
  "authority_posture",
  "intent_class",
  "required_primary_primitive",
  "licensed_secondary_primitives",
  "forbidden_primitives",
  "policy_constraints",
  "overenum_traps"
]);

const ARRAY_FIELDS = Object.freeze([
  "licensed_secondary_primitives",
  "forbidden_primitives",
  "policy_constraints",
  "overenum_traps"
]);

const STRING_FIELDS = Object.freeze([
  "surface_request",
  "work_unit",
  "meaning_hierarchy",
  "intent_class"
]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function isKnownPrimitive(value) {
  return typeof value === "string" && PRIMITIVE_SET.has(value);
}

export function isKnownAuthorityPosture(value) {
  return typeof value === "string" && POSTURE_SET.has(value);
}

export function validatePrimitiveCaseAnnotation(annotation) {
  const errors = [];

  if (annotation === null || typeof annotation !== "object" || Array.isArray(annotation)) {
    return { ok: false, errors: ["annotation must be a non-null object"] };
  }

  for (const field of REQUIRED_ANNOTATION_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(annotation, field)) {
      errors.push(`missing required field: ${field}`);
    }
  }

  for (const field of STRING_FIELDS) {
    if (annotation[field] !== undefined && !isNonEmptyString(annotation[field])) {
      errors.push(`${field} must be a non-empty string`);
    }
  }

  if (annotation.authority_posture !== undefined && !isKnownAuthorityPosture(annotation.authority_posture)) {
    errors.push(`unknown authority_posture: ${String(annotation.authority_posture)}`);
  }

  if (annotation.required_primary_primitive !== undefined) {
    if (!isNonEmptyString(annotation.required_primary_primitive)) {
      errors.push("required_primary_primitive must be a non-empty string");
    } else if (!isKnownPrimitive(annotation.required_primary_primitive)) {
      errors.push(`unknown primitive in required_primary_primitive: ${annotation.required_primary_primitive}`);
    }
  }

  for (const field of ARRAY_FIELDS) {
    if (annotation[field] === undefined) continue;
    if (!Array.isArray(annotation[field])) {
      errors.push(`${field} must be an array`);
    }
  }

  const arrayPrimitiveFields = ["licensed_secondary_primitives", "forbidden_primitives"];
  for (const field of arrayPrimitiveFields) {
    if (!Array.isArray(annotation[field])) continue;
    for (const value of annotation[field]) {
      if (!isKnownPrimitive(value)) {
        errors.push(`unknown primitive in ${field}: ${String(value)}`);
      }
    }
  }

  const primary = annotation.required_primary_primitive;
  const forbidden = Array.isArray(annotation.forbidden_primitives) ? annotation.forbidden_primitives : [];
  const licensed = Array.isArray(annotation.licensed_secondary_primitives)
    ? annotation.licensed_secondary_primitives
    : [];

  if (primary && forbidden.includes(primary)) {
    errors.push(`required_primary_primitive (${primary}) overlaps forbidden_primitives`);
  }

  const overlap = licensed.filter(p => forbidden.includes(p));
  if (overlap.length > 0) {
    errors.push(`licensed_secondary_primitives overlap forbidden_primitives: ${overlap.join(", ")}`);
  }

  return { ok: errors.length === 0, errors };
}
