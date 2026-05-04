import fs from "fs";
import path from "path";

const repoRootSkillPath = path.join(process.cwd(), "..", "SKILL.md");
const appSkillPath = path.join(process.cwd(), "SKILL.md");

if (!fs.existsSync(repoRootSkillPath)) {
  console.warn("No root SKILL.md found. Skipping copy.");
  process.exit(0);
}

fs.copyFileSync(repoRootSkillPath, appSkillPath);
console.log("Copied ../SKILL.md to ./SKILL.md");

const repoRootSkillProductionPath = path.join(process.cwd(), "..", "SKILL_PRODUCTION.md");
const appSkillProductionPath = path.join(process.cwd(), "SKILL_PRODUCTION.md");

if (fs.existsSync(repoRootSkillProductionPath)) {
  fs.copyFileSync(repoRootSkillProductionPath, appSkillProductionPath);
  console.log("Copied ../SKILL_PRODUCTION.md to ./SKILL_PRODUCTION.md");
}
