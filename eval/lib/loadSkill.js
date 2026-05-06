import fs from "fs";
import path from "path";

function readPromptFromCandidates(label, fileNames) {
  const candidates = fileNames.flatMap(fileName => [
    path.join(process.cwd(), fileName),
    path.join(process.cwd(), "..", fileName)
  ]);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, "utf8");
    }
  }
  throw new Error(`${label} not found. Checked: ${candidates.join(", ")}`);
}

export function loadSkillPrompt() {
  return readPromptFromCandidates("SKILL.md", ["SKILL.md"]);
}

export function loadSkillProductionV61Prompt() {
  return readPromptFromCandidates("v6.1 production prompt", [
    "SKILL_PRODUCTION_V61.md",
    "SKILL_PRODUCTION.md"
  ]);
}

export function loadSkillProductionV63Prompt() {
  return readPromptFromCandidates("v6.3 blocker-first production prompt", [
    "SKILL_PRODUCTION_V63.md"
  ]);
}

export function loadSkillProductionV64Prompt() {
  return readPromptFromCandidates("v6.4 blocker-first production prompt", [
    "SKILL_PRODUCTION_V64.md"
  ]);
}

export function loadSkillProductionV65Prompt() {
  return readPromptFromCandidates("v6.5 blocker-first production prompt", [
    "SKILL_PRODUCTION_V65.md"
  ]);
}

export function loadSkillProductionV65TracePrompt() {
  return readPromptFromCandidates("v6.5 blocker-first trace (diagnostic) prompt", [
    "SKILL_PRODUCTION_V65_TRACE.md"
  ]);
}
