import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { systemForCondition } from "../lib/runCase.js";
import { loadSkillProductionV63Prompt, loadSkillProductionV64Prompt } from "../lib/loadSkill.js";

const R6_CONDITIONS = [
  "baseline",
  "careful_control",
  "constraint_axis_prompting",
  "production_constraint_prompt_v6.1",
  "production_blocker_first_v6.3_candidate",
  "production_blocker_first_v6.4_candidate"
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
