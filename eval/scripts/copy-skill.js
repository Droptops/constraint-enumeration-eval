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
