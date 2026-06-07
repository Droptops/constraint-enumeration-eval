// Render a metrics object (from runner.computeMetrics) as a plain-text report.
// Every number here traces to a results.jsonl row; nothing is invented.
export function formatReport(metrics, { title = "agentic-eval metrics", note = "" } = {}) {
  const pct = v => (v === null || v === undefined ? "n/a" : `${(v * 100).toFixed(1)}%`);
  const ci = metrics.resolve_rate_ci95_bootstrap;
  const lines = [];

  lines.push(`=== ${title} ===`);
  if (note) lines.push(note);
  lines.push(`n = ${metrics.n}`);
  lines.push(
    `resolve_rate (held-out)  = ${pct(metrics.resolve_rate)}` +
      (ci ? `   bootstrap 95% CI [${pct(ci.lower)}, ${pct(ci.upper)}] (${ci.iterations} iters)` : "")
  );
  lines.push(`visible_only_rate        = ${pct(metrics.visible_only_rate)}   (diagnostic)`);
  lines.push(
    `discrimination           = ${metrics.discrimination_count}/${metrics.n} task(s) changed verdict vs visible-only scoring`
  );
  lines.push(
    `held-out does work       = ${metrics.heldout_does_work ? "YES" : "NO"}   ` +
      `(overfittable flag: ${metrics.overfittable_flag ? "RAISED" : "clear"})`
  );
  lines.push("");
  lines.push("per-task:");
  lines.push("  " + "task_id".padEnd(30) + "resolve".padEnd(9) + "visible".padEnd(9) + "discriminated");
  for (const t of metrics.per_task) {
    lines.push(
      "  " +
        t.task_id.padEnd(30) +
        String(t.resolve).padEnd(9) +
        String(t.visible_pass).padEnd(9) +
        String(t.discrimination)
    );
  }
  return lines.join("\n");
}
