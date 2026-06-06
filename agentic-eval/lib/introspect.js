import { z } from "zod";
import { callJudgeModel } from "../../eval/lib/judgeModel.js";

// Failure taxonomy. The introspection pass runs ONLY on failed runs
// (oracle_pass=false) and buckets each into exactly one category.
export const ERROR_TAXONOMY = [
  "budget_exhausted_no_fix",
  "hardcoded_to_tests",
  "incomplete_or_wrong_fix",
  "broke_unrelated_code",
  "never_edited",
  "tooling_error",
  "other"
];

export const IntrospectionSchema = z.object({
  bucket: z.enum(ERROR_TAXONOMY),
  rationale: z.string(),
  suggested_fix: z.string()
});

export const introspectionOutputConfig = {
  format: {
    type: "json_schema",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        bucket: { type: "string", enum: ERROR_TAXONOMY, description: "The single best-fitting failure category." },
        rationale: { type: "string", description: "One or two sentences: why this run failed." },
        suggested_fix: { type: "string", description: "What the agent should have done differently." }
      },
      required: ["bucket", "rationale", "suggested_fix"]
    }
  }
};

export const INTROSPECTION_SCHEMA_NAME = "failure_introspection";

export function buildIntrospectionPrompt(run) {
  return `You are reviewing a FAILED attempt to fix a bug (the tests did not pass). Classify why it failed.

TASK SPEC:
${run.spec}

WHAT THE AGENT DID (trajectory):
${run.trajectory_summary}

OUTCOME:
- hard-oracle tests passed: ${run.oracle_pass}
- loop ended because: ${run.loop_stop_reason}
${run.diff ? `FINAL DIFF:\n${run.diff}` : "(no diff: no successful edit was made)"}

Pick exactly one failure bucket from the allowed list and explain briefly.
Return only the structured JSON object.`;
}

const INVALID_STOP = new Set(["refusal", "max_tokens", "incomplete"]);

export function parseIntrospection(result) {
  if (INVALID_STOP.has(result.stop_reason)) {
    return { valid: false, error: `invalid stop_reason: ${result.stop_reason}`, raw: result.text };
  }
  try {
    return { valid: true, fields: IntrospectionSchema.parse(JSON.parse(result.text)), raw: result.text };
  } catch (error) {
    return { valid: false, error: error.message, raw: result.text };
  }
}

export async function classifyFailure({ run, callIntrospect }) {
  return parseIntrospection(await callIntrospect(run));
}

export function aggregateTaxonomy(classifications) {
  const counts = Object.fromEntries(ERROR_TAXONOMY.map(bucket => [bucket, 0]));
  let invalid = 0;
  for (const c of classifications) {
    if (c.valid) counts[c.fields.bucket] += 1;
    else invalid += 1;
  }
  return { counts, invalid, total: classifications.length };
}

// Real introspector: the agent's own family (Anthropic) reflects on its
// trajectory. Reuses the generic callJudgeModel transport with the provider set
// to anthropic and the agent model.
export function makeRealIntrospector({ model } = {}) {
  return async function callIntrospect(run) {
    const prevProvider = process.env.JUDGE_PROVIDER;
    const prevModel = process.env.JUDGE_MODEL;
    process.env.JUDGE_PROVIDER = "anthropic";
    if (model) process.env.JUDGE_MODEL = model;
    try {
      const result = await callJudgeModel({
        system: "You are a precise post-mortem classifier. Return only the structured judgment.",
        prompt: buildIntrospectionPrompt(run),
        maxTokens: 600,
        temperature: 0,
        outputConfig: introspectionOutputConfig,
        schemaName: INTROSPECTION_SCHEMA_NAME
      });
      return { text: result.text, stop_reason: result.stop_reason };
    } finally {
      restore("JUDGE_PROVIDER", prevProvider);
      restore("JUDGE_MODEL", prevModel);
    }
  };
}

function restore(key, value) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
