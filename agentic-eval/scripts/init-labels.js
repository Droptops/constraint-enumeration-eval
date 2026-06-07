import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Copies the generated blank label template to human-labels.json so you can fill
// in the human_labels (true/false) for the parity comparison. Refuses to
// overwrite an existing human-labels.json.
const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(MODULE_ROOT, "results", "phase4-holdout");
const template = path.join(dir, "label-template.json");
const target = path.join(dir, "human-labels.json");

if (!fs.existsSync(template)) {
  console.error("No label-template.json. Run `npm run build-holdout` first.");
  process.exit(1);
}
if (fs.existsSync(target)) {
  console.error(`${path.relative(MODULE_ROOT, target)} already exists; not overwriting.`);
  process.exit(1);
}
fs.copyFileSync(template, target);
console.log(`Created ${path.relative(MODULE_ROOT, target)}. Fill each entry's human_labels (true/false), then run \`npm run report-final\`.`);
