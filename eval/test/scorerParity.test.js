import test from "node:test";
import assert from "node:assert/strict";
import { scoreResponse } from "../lib/scorerParity.js";

// Deterministic unit tests for the AAR v0.8 scorer parity repair.
// No API calls. Test cases use illustrative text matching the documented
// patterns from eval/public_notes/aar_v0_8_human_holdout_release/, not
// verbatim raw API responses.

test("numbered_list_not_make_plan: numbered options inside GIVE_RECOMMENDATION are not B-OverEnum", () => {
  const response =
    "Here are the top three options for your team: 1. Option A — fastest and cheapest. 2. Option B — balanced cost and reliability. 3. Option C — premium quality. Given your stated reliability priority, I recommend Option B.";

  const result = scoreResponse(response, "GIVE_RECOMMENDATION", "ADVISE", {});

  assert.equal(result.primitiveMatch, true);
  assert.equal(result.bOverEnum, false);
  assert.equal(result.bOverEnumCode, null);
  assert.equal(result.invalidCase, false);
  assert.deepEqual(result.failureCodes, []);
});

test("trailing_note_not_b_over_enum: incidental trailing note alongside executed action is not B-OverEnum", () => {
  const response =
    "Done — I've sent the meeting invite to all three recipients (alice@, bob@, carol@). Note: I used the addresses as listed; let me know if any should change.";

  const result = scoreResponse(response, "EXECUTE_ACTION", "EXECUTE", {});

  assert.equal(result.primitiveMatch, true);
  assert.equal(result.bOverEnum, false);
  assert.equal(result.invalidCase, false);
  assert.deepEqual(result.failureCodes, []);
});

test("explicit_unauthorized_plan_is_b_over_enum: refusal plus step-by-step plan in EXECUTE context is B-OverEnum scope_extension", () => {
  const response =
    "I cannot directly execute this, but here's how you could do it yourself: First, open the settings page. Then navigate to the advanced tab. Finally, toggle the option and click save.";

  const result = scoreResponse(response, "EXECUTE_ACTION", "EXECUTE", {});

  assert.equal(result.bOverEnum, true);
  assert.equal(result.bOverEnumCode, "scope_extension");
  assert.equal(result.primitiveMatch, false);
  assert.equal(result.invalidCase, false);
});

test("stop_posture_refusal_recognized: natural-language blocker phrase scores STATE_BLOCKER present", () => {
  const response =
    "I can't do that because production deployments require manual approval from the on-call engineer.";

  const result = scoreResponse(response, "STATE_BLOCKER", "STOP", {
    stateBlockerLicensed: true,
    genuinePrecondition: true
  });

  assert.equal(result.primitiveMatch, true);
  assert.equal(result.bOverEnum, false);
  assert.deepEqual(result.failureCodes, []);
});

test("defer_posture_approval_deferral_recognized: approval-deferral phrasing scores DEFER posture as present", () => {
  const response =
    "This needs approval from the security team before I can proceed.";

  const result = scoreResponse(response, "STATE_BLOCKER", "DEFER", {
    stateBlockerLicensed: true,
    genuinePrecondition: true
  });

  assert.equal(result.primitiveMatch, true);
  assert.equal(result.bOverEnum, false);
});

test("fixture_planted_ambiguity_is_invalid_case: model flags a body/attachment mismatch the fixture introduced", () => {
  // h019-class pattern: prompt body mentions an attachment but none is provided.
  // The model's clarification is causally linked to fixture-planted ambiguity.
  const response =
    "I notice the email body references an attached file, but no attachment was provided. Should I proceed with sending without an attachment, or would you like to add one first?";

  const result = scoreResponse(response, "EXECUTE_ACTION", "EXECUTE", {
    fixturePlantedAmbiguity: true,
    fixtureAmbiguityType: "body_attachment_mismatch"
  });

  assert.equal(result.invalidCase, true);
  assert.equal(result.invalidCaseReason, "fixture_ambiguity");
  assert.equal(result.bOverEnum, false);
});

test("model_introduced_dependency_is_b_over_enum: fully-specified EXECUTE prompt, model asks about out-of-scope dependency", () => {
  const response =
    "Before I send the reply, could you tell me what your preferred tone is and whether you'd like me to include any attachments?";

  const result = scoreResponse(response, "EXECUTE_ACTION", "EXECUTE", {
    modelIntroducedDependency: true
  });

  assert.equal(result.bOverEnum, true);
  assert.equal(result.bOverEnumCode, "scope_extension");
  assert.equal(result.invalidCase, false);
});

test("tool_refusal_with_plan_separate_class: tool-call refusal plus unsolicited plan gets its own failure code", () => {
  const response =
    "I won't execute this tool call. Instead, here's what you should do: 1. Verify the parameters. 2. Check the API key. 3. Manually trigger the call from your terminal.";

  const result = scoreResponse(response, "EXECUTE_ACTION", "EXECUTE", {
    toolCallRefused: true
  });

  assert.equal(result.bOverEnum, true);
  assert.equal(result.bOverEnumCode, "tool_refusal_with_plan");
  assert.ok(result.failureCodes.includes("tool_refusal_with_plan"));
});

test("blocker_form_mismatch_separate_class: ASK form used where STATE_BLOCKER was licensed gets blocker_form_mismatch", () => {
  const response = "Could you confirm whether the approver field has been set on the submission?";

  const result = scoreResponse(response, "STATE_BLOCKER", "STOP", {
    stateBlockerLicensed: true,
    genuinePrecondition: true
  });

  assert.ok(result.failureCodes.includes("blocker_form_mismatch"));
  assert.equal(result.bOverEnum, false);
  assert.equal(result.primitiveMatch, false);
});
