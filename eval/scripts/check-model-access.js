import {
  getAnswerModel,
  getAnswerProvider,
  getJudgeModel,
  getJudgeProvider,
  getStyleRewriteModel,
  getStyleRewriteProvider
} from "../lib/config.js";

const ANTHROPIC_MODELS_URL = "https://api.anthropic.com/v1/models";
const OPENAI_MODELS_URL = "https://api.openai.com/v1/models";
const GEMINI_MODEL_URL = model => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`;

async function checkAnthropicModel(modelId, label) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(`Missing ANTHROPIC_API_KEY; cannot verify ${label} model access.`);
  }

  const response = await fetch(ANTHROPIC_MODELS_URL, {
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": process.env.ANTHROPIC_VERSION || "2023-06-01"
    }
  });

  if (!response.ok) {
    throw new Error(`Anthropic Models API failed with ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  const models = payload.data || [];
  const found = models.find(model => model.id === modelId);

  if (!found) {
    const sample = models.slice(0, 10).map(model => model.id).join(", ");
    throw new Error(`${label} model not available to this Anthropic key: ${modelId}. First returned models: ${sample}`);
  }

  return found;
}

async function checkOpenAIModel(modelId, label) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(`Missing OPENAI_API_KEY; cannot verify ${label} model access.`);
  }

  const response = await fetch(OPENAI_MODELS_URL, {
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`OpenAI Models API failed with ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  const models = payload.data || [];
  const found = models.find(model => model.id === modelId);

  if (!found) {
    const sample = models.slice(0, 10).map(model => model.id).join(", ");
    throw new Error(`${label} model not available to this OpenAI key: ${modelId}. First returned models: ${sample}`);
  }

  return found;
}

async function checkGeminiModel(modelId, label) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(`Missing GEMINI_API_KEY; cannot verify ${label} model access.`);
  }

  const response = await fetch(GEMINI_MODEL_URL(modelId), {
    headers: {
      "x-goog-api-key": process.env.GEMINI_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Gemini Models API failed with ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}

async function checkProviderModel(provider, model, label) {
  if (provider === "anthropic") {
    const found = await checkAnthropicModel(model, label);
    console.log(`OK Anthropic ${label} model: ${found.id}`);
    return;
  }

  if (provider === "openai") {
    const found = await checkOpenAIModel(model, label);
    console.log(`OK OpenAI ${label} model: ${found.id}`);
    return;
  }

  if (provider === "google" || provider === "gemini") {
    const found = await checkGeminiModel(model, label);
    console.log(`OK Gemini ${label} model: ${found.name || model}`);
    return;
  }

  throw new Error(`Unsupported provider for ${label}: ${provider}`);
}

await checkProviderModel(getAnswerProvider(), getAnswerModel(), "answer");
await checkProviderModel(getJudgeProvider(), getJudgeModel(), "judge");

if (process.env.CHECK_STYLE_REWRITE_MODEL === "true") {
  await checkProviderModel(getStyleRewriteProvider(), getStyleRewriteModel(), "style rewrite");
}
