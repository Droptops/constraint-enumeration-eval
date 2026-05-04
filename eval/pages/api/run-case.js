import { requireAuth } from "../../lib/auth.js";
import { getAnswerModel, getAnswerTemperature, getEvalConditions, getJudgeModel, getJudgeTemperature } from "../../lib/config.js";
import { loadCaseById } from "../../lib/loadCases.js";
import { generateAnswer } from "../../lib/runCase.js";
import { judgeAnswer } from "../../lib/judge.js";
import { scoreJudgment } from "../../lib/score.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!requireAuth(req, res)) return;

    const { caseId, condition } = req.body || {};

    if (!caseId || typeof caseId !== "string") {
      return res.status(400).json({ error: "Missing or invalid caseId" });
    }

    if (!getEvalConditions().includes(condition)) {
      return res.status(400).json({ error: "Invalid condition" });
    }

    const testCase = loadCaseById(caseId);

    if (!testCase) {
      return res.status(400).json({ error: "Unknown caseId" });
    }

    const answer = await generateAnswer({ testCase, condition });
    const judgment = await judgeAnswer({ testCase, answer });
    const score = scoreJudgment(judgment);

    return res.status(200).json({
      caseId,
      condition,
      category: testCase.category,
      prompt: testCase.prompt,
      expected_final_answer: testCase.expected_final_answer,
      acceptable_final_answers: testCase.acceptable_final_answers,
      model_under_test: getAnswerModel(),
      judge_model: getJudgeModel(),
      answer_temperature: getAnswerTemperature(),
      judge_temperature: getJudgeTemperature(),
      answer,
      judgment,
      score
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unknown server error" });
  }
}
