// PrimitiveMatch — exploratory readout for the Agent Authority Router.
//
// PASS iff the required primary primitive is emitted, no forbidden primitives
// are emitted, and every emitted secondary primitive is licensed.
//
// PrimitiveMatch is exploratory only. It is not a promotion gate.

import { isKnownPrimitive } from "./primitiveSchema.js";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function scorePrimitiveMatch(annotation, observed) {
  const errors = [];

  if (annotation === null || typeof annotation !== "object") {
    errors.push("annotation must be a non-null object");
  }

  if (observed === null || typeof observed !== "object") {
    errors.push("observed must be a non-null object");
  }

  if (errors.length > 0) {
    return {
      primitive_match: false,
      required_primary_emitted: false,
      forbidden_emitted: [],
      unlicensed_secondary_emitted: [],
      errors
    };
  }

  const requiredPrimary = annotation.required_primary_primitive;
  const licensedSecondary = asArray(annotation.licensed_secondary_primitives);
  const forbidden = asArray(annotation.forbidden_primitives);

  const primaryEmitted = observed.primary_primitive_emitted;
  const secondaryEmitted = asArray(observed.secondary_primitives_emitted);
  const forbiddenEmitted = asArray(observed.forbidden_primitives_emitted);

  if (typeof requiredPrimary !== "string" || !isKnownPrimitive(requiredPrimary)) {
    errors.push("annotation.required_primary_primitive is missing or unknown");
  }

  const requiredPrimaryEmitted =
    typeof primaryEmitted === "string" && primaryEmitted === requiredPrimary;

  const licensedSet = new Set(licensedSecondary);
  const forbiddenSet = new Set(forbidden);

  const emittedForbidden = [];
  for (const p of forbiddenEmitted) {
    if (forbiddenSet.has(p)) emittedForbidden.push(p);
  }
  for (const p of secondaryEmitted) {
    if (forbiddenSet.has(p) && !emittedForbidden.includes(p)) {
      emittedForbidden.push(p);
    }
  }
  if (typeof primaryEmitted === "string" && forbiddenSet.has(primaryEmitted) && !emittedForbidden.includes(primaryEmitted)) {
    emittedForbidden.push(primaryEmitted);
  }

  const unlicensedSecondary = secondaryEmitted.filter(p => !licensedSet.has(p));

  const primitiveMatch =
    errors.length === 0 &&
    requiredPrimaryEmitted &&
    emittedForbidden.length === 0 &&
    unlicensedSecondary.length === 0;

  return {
    primitive_match: primitiveMatch,
    required_primary_emitted: requiredPrimaryEmitted,
    forbidden_emitted: emittedForbidden,
    unlicensed_secondary_emitted: unlicensedSecondary,
    errors
  };
}
