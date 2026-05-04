import fs from "fs";
import path from "path";

const ROOTS = ["lib", "scripts", "pages"];
const EXTENSIONS = new Set([".js", ".jsx"]);

function walk(dir) {
  const entries = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) entries.push(...walk(fullPath));
    else if (EXTENSIONS.has(path.extname(entry.name))) entries.push(fullPath);
  }
  return entries;
}

function stripCommentsAndStrings(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/`(?:\\.|[^`])*`/g, "``")
    .replace(/"(?:\\.|[^"])*"/g, '""')
    .replace(/'(?:\\.|[^'])*'/g, "''");
}

const offenders = [];

for (const root of ROOTS) {
  for (const file of walk(path.join(process.cwd(), root))) {
    const source = stripCommentsAndStrings(fs.readFileSync(file, "utf8"));
    if (/\brequire\s*\(/.test(source)) offenders.push(file);
  }
}

if (offenders.length) {
  console.error("CommonJS require() found in runtime source files:");
  for (const offender of offenders) console.error(`- ${path.relative(process.cwd(), offender)}`);
  process.exit(1);
}

console.log("ESM check passed.");
