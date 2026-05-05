import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

import { systemForCondition } from "../lib/runCase.js";
import { getAllowedEvalConditions } from "../lib/config.js";
import { loadSkillProductionV63Prompt } from "../lib/loadSkill.js";

test("every ALL_EVAL_CONDITIONS entry resolves to a non-empty system prompt without throwing", () => {
  const conditions = getAllowedEvalConditions();

  for (const condition of conditions) {
    if (condition === "style_matched_baseline") continue;

    let system;
    assert.doesNotThrow(
      () => { system = systemForCondition(condition); },
      `systemForCondition("${condition}") threw — likely a missing loader or import`
    );
    assert.equal(typeof system, "string", `systemForCondition("${condition}") must return a string`);
    assert.ok(system.length > 0, `systemForCondition("${condition}") must return non-empty content`);
  }
});

test("production_blocker_first_v6.3_candidate resolves to SKILL_PRODUCTION_V63.md content", () => {
  const repoRootPath = path.join(process.cwd(), "..", "SKILL_PRODUCTION_V63.md");
  const appPath = path.join(process.cwd(), "SKILL_PRODUCTION_V63.md");
  const sourcePath = fs.existsSync(appPath) ? appPath : repoRootPath;

  assert.ok(fs.existsSync(sourcePath), `SKILL_PRODUCTION_V63.md must exist at ${appPath} or ${repoRootPath}`);
  const expected = fs.readFileSync(sourcePath, "utf8");

  const fromLoader = loadSkillProductionV63Prompt();
  assert.equal(fromLoader, expected, "loadSkillProductionV63Prompt did not return SKILL_PRODUCTION_V63.md content");

  const fromCondition = systemForCondition("production_blocker_first_v6.3_candidate");
  assert.equal(fromCondition, expected, "production_blocker_first_v6.3_candidate condition did not return SKILL_PRODUCTION_V63.md content");
});
