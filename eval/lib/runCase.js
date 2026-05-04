import { callClaude } from "./anthropic.js";
import { getAnswerModel, getAnswerTemperature } from "./config.js";
import { loadSkillPrompt } from "./loadSkill.js";

const BASELINE_SYSTEM = "You are a helpful assistant.";

export async function generateAnswer({ testCase, condition }) {
  if (!["baseline", "skill"].includes(condition)) {
    throw new Error(`Invalid condition: ${condition}`);
  }

  const system = condition === "skill" ? loadSkillPrompt() : BASELINE_SYSTEM;

  const result = await callClaude({
    model: getAnswerModel(),
    system,
    messages: [
      {
        role: "user",
        content: testCase.prompt
      }
    ],
    maxTokens: 1200,
    temperature: getAnswerTemperature()
  });

  return result.text;
}
