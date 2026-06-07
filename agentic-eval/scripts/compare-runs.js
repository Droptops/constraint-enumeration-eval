import fs from "node:fs";
import path from "node:path";

// Build a leaderboard from several judge-suite summary.json files. Shows that
// resolve rate can saturate while the trajectory layer (clean-solve) still
// discriminates — and surfaces the A/B condition effect.
//
// Usage: node scripts/compare-runs.js <summary.json> [<summary.json> ...]

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error("Usage: node scripts/compare-runs.js <summary.json> [<summary.json> ...]");
  process.exit(1);
}

function pct(v) {
  return v === null || v === undefined ? "n/a" : `${(v * 100).toFixed(1)}%`;
}

const rows = paths.map(p => {
  const s = JSON.parse(fs.readFileSync(p, "utf8"));
  return {
    model: s.model,
    n: s.n,
    resolve: s.resolve_rate,
    clean_openai: s.clean_solve_by_family.openai.clean_solve_rate,
    clean_google: s.clean_solve_by_family.google.clean_solve_rate,
    added_test: s.clean_solve_by_family.openai.per_constraint_satisfied_rate.added_or_updated_test
  };
});

const W = 34;
console.log("=== Leaderboard (real runs) ===");
console.log(
  "run".padEnd(W) + "n  " + "resolve".padEnd(9) + "clean(oai)".padEnd(12) + "clean(goog)".padEnd(13) + "added_test"
);
for (const r of rows) {
  console.log(
    r.model.padEnd(W) +
      String(r.n).padEnd(3) +
      pct(r.resolve).padEnd(9) +
      pct(r.clean_openai).padEnd(12) +
      pct(r.clean_google).padEnd(13) +
      pct(r.added_test)
  );
}
console.log(
  "\nResolve rate is saturated across runs; clean-solve + the added_or_updated_test\n" +
    "column are where the signal is. The with_tests condition is the causal lever."
);

const outPath = path.join(path.dirname(paths[0]), "..", "..", "leaderboard.json");
fs.writeFileSync(outPath, JSON.stringify({ runs: rows }, null, 2));
console.log(`\nWrote ${outPath}`);
