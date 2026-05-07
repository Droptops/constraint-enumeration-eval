// OverEnum typing helpers.
//
// Legacy OverEnum remains the r15 promotion-gate metric. Behavioral OverEnum
// (B-OverEnum) and Authority OverEnum (A-OverEnum) are diagnostic readouts
// only and must not be used as a gate without inter-judge reliability work.

export const OVERENUM_TYPES = Object.freeze({
  legacy_overenum: {
    description:
      "Legacy undifferentiated OverEnum signal. Remains the r15 promotion gate metric for continuity with r14b.",
    diagnostic_only: false
  },
  behavioral_over_enum: {
    description:
      "Extra constraint listing, branches, verbose scaffolding, unnecessary structure, or surplus reasoning that increases user management burden.",
    diagnostic_only: true
  },
  authority_over_enum: {
    description:
      "Output outside the licensed work primitive or beyond the authority boundary.",
    diagnostic_only: true
  }
});

export const OVERENUM_FIELDS = Object.freeze([
  "legacy_overenum",
  "behavioral_over_enum",
  "authority_over_enum"
]);

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  return null;
}

export function classifyOverEnumSignals(signals) {
  const warnings = [];

  if (signals === null || typeof signals !== "object" || Array.isArray(signals)) {
    return {
      legacy_overenum: null,
      behavioral_over_enum: null,
      authority_over_enum: null,
      warnings: ["signals must be a non-null object"]
    };
  }

  const result = {};

  for (const field of OVERENUM_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(signals, field)) {
      warnings.push(`missing field: ${field}`);
      result[field] = null;
      continue;
    }

    const normalized = normalizeBoolean(signals[field]);
    if (normalized === null) {
      warnings.push(`field ${field} is not a boolean (got ${typeof signals[field]})`);
    }
    result[field] = normalized;
  }

  if (
    result.authority_over_enum === true &&
    result.legacy_overenum === false
  ) {
    warnings.push(
      "contradiction: authority_over_enum=true but legacy_overenum=false — review judge rubric alignment"
    );
  }

  if (
    result.behavioral_over_enum === true &&
    result.legacy_overenum === false
  ) {
    warnings.push(
      "contradiction: behavioral_over_enum=true but legacy_overenum=false — review judge rubric alignment"
    );
  }

  return {
    legacy_overenum: result.legacy_overenum,
    behavioral_over_enum: result.behavioral_over_enum,
    authority_over_enum: result.authority_over_enum,
    warnings
  };
}
