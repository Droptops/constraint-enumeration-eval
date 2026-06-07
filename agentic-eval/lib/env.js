import fs from "node:fs";

// Load KEY=VALUE pairs from local env files into process.env (without clobbering
// already-set vars). Uses process.loadEnvFile when available (Node >=20.12.0),
// otherwise a small parser — so on Node 20.0-20.11 (or 21.0-21.6) local key
// files are NOT silently ignored. Returns the list of files that were read.
export function loadEnvFiles(paths) {
  const loaded = [];
  for (const file of paths) {
    if (!fs.existsSync(file)) continue;
    if (typeof process.loadEnvFile === "function") {
      try {
        process.loadEnvFile(file);
        loaded.push(file);
        continue;
      } catch {
        /* fall through to the manual parser */
      }
    }
    parseEnvInto(file);
    loaded.push(file);
  }
  return loaded;
}

function parseEnvInto(file) {
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}
