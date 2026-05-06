import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { systemForCondition } from "../lib/runCase.js";
import {
  loadSkillProductionV63Prompt,
  loadSkillProductionV64Prompt,
  loadSkillProductionV65Prompt,
  loadSkillProductionV65TracePrompt,
  loadSkillProductionV66Prompt,
  loadSkillProductionV67Prompt,
  loadSkillMarkReasonLongformControlPrompt
} from "../lib/loadSkill.js";

const R6_CONDITIONS = [
  "baseline",
  "careful_control",
  "constraint_axis_prompting",
  "production_constraint_prompt_v6.1",
  "production_blocker_first_v6.3_candidate",
  "production_blocker_first_v6.4_candidate",
  "production_blocker_first_v6.5_candidate",
  "production_blocker_first_v6.5_trace",
  "production_blocker_first_v6.6_candidate",
  "production_blocker_first_v6.7_candidate",
  "mark_reason_longform_control"
];

function findPromptFile(fileName) {
  const candidates = [
    path.join(process.cwd(), fileName),
    path.join(process.cwd(), "..", fileName)
  ];
  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

test("r6 condition loaders resolve to non-empty system prompts", () => {
  for (const condition of R6_CONDITIONS) {
    const system = systemForCondition(condition);
    assert.equal(typeof system, "string", `${condition} should resolve to a string`);
    assert.ok(system.trim().length > 0, `${condition} should resolve to a non-empty prompt`);
  }
});

test("production_blocker_first_v6.3_candidate resolves SKILL_PRODUCTION_V63.md", () => {
  const expectedPath = findPromptFile("SKILL_PRODUCTION_V63.md");
  assert.ok(expectedPath, "SKILL_PRODUCTION_V63.md must exist in eval/ or repo root");
  const expected = fs.readFileSync(expectedPath, "utf8");
  assert.equal(loadSkillProductionV63Prompt(), expected);
  assert.equal(systemForCondition("production_blocker_first_v6.3_candidate"), expected);
});

test("production_blocker_first_v6.4_candidate resolves SKILL_PRODUCTION_V64.md", () => {
  const expectedPath = findPromptFile("SKILL_PRODUCTION_V64.md");
  assert.ok(expectedPath, "SKILL_PRODUCTION_V64.md must exist in eval/ or repo root");
  const expected = fs.readFileSync(expectedPath, "utf8");
  assert.equal(loadSkillProductionV64Prompt(), expected);
  assert.equal(systemForCondition("production_blocker_first_v6.4_candidate"), expected);
});

test("production_blocker_first_v6.5_candidate resolves SKILL_PRODUCTION_V65.md", () => {
  const expectedPath = findPromptFile("SKILL_PRODUCTION_V65.md");
  assert.ok(expectedPath, "SKILL_PRODUCTION_V65.md must exist in eval/ or repo root");
  const expected = fs.readFileSync(expectedPath, "utf8");
  assert.equal(loadSkillProductionV65Prompt(), expected);
  assert.equal(systemForCondition("production_blocker_first_v6.5_candidate"), expected);
});

test("production_blocker_first_v6.5_trace resolves SKILL_PRODUCTION_V65_TRACE.md", () => {
  const expectedPath = findPromptFile("SKILL_PRODUCTION_V65_TRACE.md");
  assert.ok(expectedPath, "SKILL_PRODUCTION_V65_TRACE.md must exist in eval/ or repo root");
  const expected = fs.readFileSync(expectedPath, "utf8");
  assert.equal(loadSkillProductionV65TracePrompt(), expected);
  assert.equal(systemForCondition("production_blocker_first_v6.5_trace"), expected);
});

test("v6.5 trace prompt is distinct from v6.5 candidate prompt", () => {
  assert.notEqual(loadSkillProductionV65TracePrompt(), loadSkillProductionV65Prompt());
});

test("production_blocker_first_v6.6_candidate resolves SKILL_PRODUCTION_V66.md", () => {
  const expectedPath = findPromptFile("SKILL_PRODUCTION_V66.md");
  assert.ok(expectedPath, "SKILL_PRODUCTION_V66.md must exist in eval/ or repo root");
  const expected = fs.readFileSync(expectedPath, "utf8");
  assert.equal(loadSkillProductionV66Prompt(), expected);
  assert.equal(systemForCondition("production_blocker_first_v6.6_candidate"), expected);
});

test("v6.6 prompt is distinct from v6.3 prompt", () => {
  assert.notEqual(loadSkillProductionV66Prompt(), loadSkillProductionV63Prompt());
});

test("production_blocker_first_v6.7_candidate resolves SKILL_PRODUCTION_V67.md", () => {
  const expectedPath = findPromptFile("SKILL_PRODUCTION_V67.md");
  assert.ok(expectedPath, "SKILL_PRODUCTION_V67.md must exist in eval/ or repo root");
  const expected = fs.readFileSync(expectedPath, "utf8");
  assert.equal(loadSkillProductionV67Prompt(), expected);
  assert.equal(systemForCondition("production_blocker_first_v6.7_candidate"), expected);
});

test("v6.7 prompt is distinct from v6.6 prompt", () => {
  assert.notEqual(loadSkillProductionV67Prompt(), loadSkillProductionV66Prompt());
});

test("mark_reason_longform_control resolves SKILL_MARK_REASON_LONGFORM_CONTROL.md", () => {
  const expectedPath = findPromptFile("SKILL_MARK_REASON_LONGFORM_CONTROL.md");
  assert.ok(expectedPath, "SKILL_MARK_REASON_LONGFORM_CONTROL.md must exist in eval/ or repo root");
  const expected = fs.readFileSync(expectedPath, "utf8");
  assert.equal(loadSkillMarkReasonLongformControlPrompt(), expected);
  assert.equal(systemForCondition("mark_reason_longform_control"), expected);
});
