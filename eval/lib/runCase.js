import { callAnswerModel } from "./answerModel.js";
import {
  getAnswerModel,
  getAnswerProvider,
  getAnswerTemperature,
  getEvalConditions,
  getStyleRewriteModel,
  getStyleRewriteProvider
} from "./config.js";
import {
  loadSkillPrompt,
  loadSkillProductionV61Prompt,
  loadSkillProductionV63Prompt,
  loadSkillProductionV64Prompt,
  loadSkillProductionV65Prompt,
  loadSkillProductionV65TracePrompt,
  loadSkillMarkReasonLongformControlPrompt
} from "./loadSkill.js";

export const BASELINE_SYSTEM = "You are a helpful assistant.";

export const CAREFUL_CONTROL_SYSTEM = `You are a helpful assistant. For real-world questions, slow down and be careful. State any important assumptions, consider practical tradeoffs, avoid overconfident answers, and give a useful recommendation. Be concise and do not use a special constraint-enumeration format unless it is naturally helpful.`;

export const STEP_BY_STEP_CONTROL_SYSTEM = `You are a helpful assistant. For real-world decisions, reason step by step privately and then give a concise, practical recommendation. Do not use a special constraint-enumeration format unless it is naturally helpful.`;

export const CONSTRAINT_AXIS_PROMPTING_SYSTEM = `You are a helpful assistant. For real-world decisions, consider the relevant dimensions: safety, feasibility, resource cost, time, and preservation of the user's goal state. Answer naturally and concisely. Do not follow a named protocol and do not visibly enumerate a checklist unless the user explicitly asks for one.`;

export const CONSTRAINT_CHECK_NO_ENUMERATION_SYSTEM = `You are a helpful assistant. Before recommending real-world actions, check for hard blockers, missing critical information, safety issues, timing, cost, and feasibility. Do not visibly enumerate constraints as a separate labeled section; answer naturally and concisely.`;

export const PRODUCTION_CONSTRAINT_PROMPT_SYSTEM = `You are a helpful assistant. For real-world decisions, answer directly while silently checking constraints.

Before recommending an action, silently consider:
- What outcome must be preserved?
- What hard blockers, safety risks, or irreversible consequences exist?
- What information is missing that could change the recommendation?
- What tradeoff matters most: time, cost, risk, quality, or reversibility?

If the answer is clear, give the recommendation first and keep reasoning brief.
If missing information could materially change the recommendation, ask one targeted clarifying question.
Do not list constraints unless doing so improves the answer.
Do not ask unnecessary clarifying questions.`;

export const STYLE_MATCHED_REWRITE_SYSTEM = `You rewrite answers for evaluation.

Your job is to convert the baseline answer into a constraint-enumeration style while preserving the exact same decision, recommendation, uncertainty level, and factual content.

Rules:
- Do not improve the answer's decision.
- Do not add new facts, new reasoning, new safety warnings, or new recommendations.
- Do not change a wrong answer into a right answer.
- Do not remove mistakes.
- Use headings or bullets that resemble a constraint-enumeration format.
- Keep the final recommendation semantically identical to the baseline answer.`;

export function systemForCondition(condition) {
  if (condition === "skill") return loadSkillPrompt();
  if (condition === "production_constraint_prompt_v6.1") {
    return loadSkillProductionV61Prompt();
  }
  if (condition === "production_constraint_prompt") {
    return loadSkillProductionV61Prompt();
  }
  if (condition === "production_blocker_first_v6.3_candidate") {
    return loadSkillProductionV63Prompt();
  }
  if (condition === "production_blocker_first_v6.4_candidate") {
    return loadSkillProductionV64Prompt();
  }
  if (condition === "production_blocker_first_v6.5_candidate") {
    return loadSkillProductionV65Prompt();
  }
  if (condition === "production_blocker_first_v6.5_trace") {
    return loadSkillProductionV65TracePrompt();
  }
  if (condition === "mark_reason_longform_control") {
    return loadSkillMarkReasonLongformControlPrompt();
  }
  if (condition === "skill_concise") {
    return `${loadSkillPrompt()}\n\nApply the protocol, but keep the final user-facing response concise and avoid unnecessary prose.`;
  }
  if (condition === "careful_control") return CAREFUL_CONTROL_SYSTEM;
  if (condition === "constraint_axis_prompting") return CONSTRAINT_AXIS_PROMPTING_SYSTEM;
  if (condition === "step_by_step_control") return STEP_BY_STEP_CONTROL_SYSTEM;
  if (condition === "constraint_check_no_enumeration") return CONSTRAINT_CHECK_NO_ENUMERATION_SYSTEM;
  if (condition === "baseline") return BASELINE_SYSTEM;
  throw new Error(`Invalid condition: ${condition}`);
}

export async function generateAnswerResult({ testCase, condition, baselineAnswer = null }) {
  if (!getEvalConditions().includes(condition)) {
    throw new Error(`Invalid condition: ${condition}`);
  }

  if (condition === "style_matched_baseline") {
    return await generateStyleMatchedBaseline({ testCase, baselineAnswer });
  }

  const result = await callAnswerModel({
    provider: getAnswerProvider(),
    model: getAnswerModel(),
    system: systemForCondition(condition),
    messages: [
      {
        role: "user",
        content: testCase.prompt
      }
    ],
    maxTokens: 1200,
    temperature: getAnswerTemperature()
  });

  return normalizeAnswerResult(result, { generation_kind: "direct_answer" });
}

export async function generateAnswer({ testCase, condition, baselineAnswer = null }) {
  return (await generateAnswerResult({ testCase, condition, baselineAnswer })).text;
}

async function generateStyleMatchedBaseline({ testCase, baselineAnswer }) {
  let sourceAnswer = baselineAnswer;
  let sourceWasGeneratedInline = false;

  if (!sourceAnswer) {
    const generatedBaseline = await generateAnswerResult({ testCase, condition: "baseline" });
    sourceAnswer = generatedBaseline.text;
    sourceWasGeneratedInline = true;
  }

  const prompt = `Prompt:\n${testCase.prompt}\n\nBaseline answer to rewrite without changing the decision:\n${sourceAnswer}`;

  const result = await callAnswerModel({
    provider: getStyleRewriteProvider(),
    model: getStyleRewriteModel(),
    system: STYLE_MATCHED_REWRITE_SYSTEM,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    maxTokens: 1200,
    temperature: 0
  });

  return normalizeAnswerResult(result, {
    generation_kind: "style_matched_rewrite",
    style_rewrite_provider: getStyleRewriteProvider(),
    style_rewrite_model: getStyleRewriteModel(),
    source_condition: "baseline",
    source_was_generated_inline: sourceWasGeneratedInline
  });
}

function normalizeAnswerResult(result, metadata = {}) {
  return {
    text: result.text,
    raw: result.raw,
    stop_reason: result.stop_reason,
    truncated: result.stop_reason === "max_tokens",
    ...metadata
  };
}
