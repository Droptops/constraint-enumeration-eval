import { loadAllCases } from "../../lib/loadCases.js";

export default function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const cases = loadAllCases().map(testCase => ({
      id: testCase.id,
      category: testCase.category,
      prompt: testCase.prompt,
      source_file: testCase.source_file
    }));

    return res.status(200).json({ cases });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unknown server error" });
  }
}
