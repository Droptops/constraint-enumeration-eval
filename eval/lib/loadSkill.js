import fs from "fs";
import path from "path";

export function loadSkillPrompt() {
  const appSkillPath = path.join(process.cwd(), "SKILL.md");
  const repoRootSkillPath = path.join(process.cwd(), "..", "SKILL.md");

  if (fs.existsSync(appSkillPath)) {
    return fs.readFileSync(appSkillPath, "utf8");
  }

  if (fs.existsSync(repoRootSkillPath)) {
    return fs.readFileSync(repoRootSkillPath, "utf8");
  }

  throw new Error("SKILL.md not found in eval runtime directory or repo root.");
}

export function loadSkillProductionPrompt() {
  const appSkillPath = path.join(process.cwd(), "SKILL_PRODUCTION.md");
  const repoRootSkillPath = path.join(process.cwd(), "..", "SKILL_PRODUCTION.md");

  if (fs.existsSync(appSkillPath)) {
    return fs.readFileSync(appSkillPath, "utf8");
  }

  if (fs.existsSync(repoRootSkillPath)) {
    return fs.readFileSync(repoRootSkillPath, "utf8");
  }

  throw new Error("SKILL_PRODUCTION.md not found in eval runtime directory or repo root.");
}

export function loadSkillProductionV63Prompt() {
  const appSkillPath = path.join(process.cwd(), "SKILL_PRODUCTION_V63.md");
  const repoRootSkillPath = path.join(process.cwd(), "..", "SKILL_PRODUCTION_V63.md");

  if (fs.existsSync(appSkillPath)) {
    return fs.readFileSync(appSkillPath, "utf8");
  }

  if (fs.existsSync(repoRootSkillPath)) {
    return fs.readFileSync(repoRootSkillPath, "utf8");
  }

  throw new Error("SKILL_PRODUCTION_V63.md not found in eval runtime directory or repo root.");
}
