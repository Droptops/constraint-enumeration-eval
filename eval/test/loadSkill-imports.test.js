import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("all loadSkill.js imports across eval/lib/*.js are actually exported", async () => {
  const libDir = path.join(process.cwd(), "lib");
  const files = fs.readdirSync(libDir).filter(f => f.endsWith(".js"));
  const loadSkillExports = Object.keys(await import("../lib/loadSkill.js"));

  const importPattern = /import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*["']\.\/loadSkill\.js["']/g;
  let importerCount = 0;

  for (const file of files) {
    const src = fs.readFileSync(path.join(libDir, file), "utf8");
    let match;
    while ((match = importPattern.exec(src)) !== null) {
      importerCount += 1;
      const imported = match[1]
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => s.split(/\s+as\s+/)[0].trim());

      for (const symbol of imported) {
        assert.ok(
          loadSkillExports.includes(symbol),
          `${file} imports "${symbol}" from loadSkill.js, but that export does not exist. Exports: ${loadSkillExports.join(", ")}`
        );
      }
    }
  }

  assert.ok(importerCount > 0, "expected at least one eval/lib/*.js file to import from ./loadSkill.js");
});

test("loadSkill.js exports each versioned production prompt loader", async () => {
  const loadSkillExports = Object.keys(await import("../lib/loadSkill.js"));
  const requiredExports = [
    "loadSkillPrompt",
    "loadSkillProductionV61Prompt",
    "loadSkillProductionV63Prompt",
    "loadSkillProductionV64Prompt",
    "loadSkillProductionV65Prompt",
    "loadSkillProductionV65TracePrompt",
    "loadSkillMarkReasonLongformControlPrompt"
  ];
  for (const symbol of requiredExports) {
    assert.ok(
      loadSkillExports.includes(symbol),
      `loadSkill.js must export ${symbol}. Exports: ${loadSkillExports.join(", ")}`
    );
  }
});
