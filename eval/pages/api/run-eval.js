import path from "path";

import { requireAuth } from "../../lib/auth.js";
import { loadAllCases } from "../../lib/loadCases.js";
import { runBatch } from "../../lib/runBatch.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!requireAuth(req, res)) return;

    const trials = Number.isInteger(req.body?.trials) ? req.body.trials : 1;

    if (trials < 1 || trials > 20) {
      return res.status(400).json({ error: "trials must be between 1 and 20" });
    }

    const runId = req.body?.runId || new Date().toISOString().replace(/[:.]/g, "-");
    const cases = loadAllCases();

    const { artifact } = await runBatch({
      runId,
      cases,
      allCasesForHash: cases,
      trials,
      resultsDir: path.join(process.cwd(), "results"),
      smokeTest: false
    });

    return res.status(200).json(artifact);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unknown server error" });
  }
}
