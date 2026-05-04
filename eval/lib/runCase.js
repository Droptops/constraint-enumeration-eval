import { callClaude } from "./anthropic.js";
import { getAnswerModel, getAnswerTemperature, getEvalConditions } from "./config.js";
import { loadSkillPrompt } from "./loadSkill.js";

const BASELINE_SYSTEM = "You are a helpful assistant.";

const CAREFUL_CONTROL_SYSTEM = `You are a helpful assistant. For real-world questions, slow down and be careful. State any important assumptions, consider practical tradeoffs, avoid overconfident answers, and give a useful recommendation. Be concise and do not use a special constraint-enumeration format unless it is naturally helpful.`;

export async function generateAnswer({ testCase, condition }) {
  if (!getEvalConditions().includes(condition)) {
    throw new Error(`Invalid condition: ${condition}`);
  }

  const system =
    condition === "skill"
      ? loadSkillPrompt()
      : condition === "careful_control"
        ? CAREFUL_CONTROL_SYSTEM
        : BASELINE_SYSTEM;

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
