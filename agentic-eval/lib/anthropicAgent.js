import fs from "node:fs";
import path from "node:path";
import {
  ApiHttpError,
  DEFAULT_RETRYABLE_STATUS_CODES,
  exponentialBackoffMs,
  parseRetryAfterMs,
  shouldRetryTransportError,
  sleep
} from "../../eval/lib/retry.js";

// NEW code: eval/lib/anthropic.js callClaude has no tool support. This adds the
// multi-turn tool-use loop (tool_use parsing, tool_result formatting) behind the
// same injected callModel seam the agent loop already uses, so the proven loop
// runs unchanged on the live model.

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export const AGENT_TOOLS = [
  {
    name: "read_file",
    description: "Read a UTF-8 text file from the workspace by relative path.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string", description: "Workspace-relative path." } },
      required: ["path"]
    }
  },
  {
    name: "edit_file",
    description:
      "Replace a unique substring old_str with new_str in a workspace file. old_str must occur exactly once.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string" },
        old_str: { type: "string" },
        new_str: { type: "string" }
      },
      required: ["path", "old_str", "new_str"]
    }
  },
  {
    name: "run_tests",
    description: "Run the project's visible tests and return pass/fail and output.",
    input_schema: { type: "object", properties: {} }
  }
];

const SYSTEM_PROMPT =
  "You are a careful software engineer fixing a bug in a small Python project. " +
  "Use the provided tools to read files, edit the buggy source, and run the tests. " +
  "Call exactly one tool per turn. Make the smallest change that fixes the described " +
  "behavior; do not hardcode answers to specific test inputs. When the tests pass, stop. " +
  "Rely only on tool results — never invent file contents or test output.";

export function getAgentModelId() {
  return process.env.AGENT_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
}

// Low-level Messages call with tools. Retry/backoff mirrors eval/lib/anthropic.js.
export async function callAnthropicMessages({
  model,
  system,
  messages,
  tools,
  toolChoice,
  maxTokens = 4096,
  temperature = 0,
  maxRetries = 5
}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }

  const body = { model, max_tokens: maxTokens, temperature, messages };
  if (system) body.system = system;
  if (tools) body.tools = tools;
  if (toolChoice) body.tool_choice = toolChoice;

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": process.env.ANTHROPIC_VERSION || "2023-06-01"
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        return { content: data.content || [], stop_reason: data.stop_reason, usage: data.usage || null };
      }

      const errorText = await response.text();
      const retryable = DEFAULT_RETRYABLE_STATUS_CODES.has(response.status);
      if (!retryable || attempt === maxRetries) {
        throw new ApiHttpError({ provider: "Anthropic", status: response.status, body: errorText, retryable });
      }
      const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
      await sleep(retryAfterMs ?? exponentialBackoffMs(attempt));
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries || !shouldRetryTransportError(error)) throw error;
      await sleep(exponentialBackoffMs(attempt));
    }
  }

  throw lastError || new Error("Unknown Anthropic request failure");
}

// Stateful callModel: maintains the conversation across loop steps. Each call
// (after the first) emits a tool_result for the tool_use returned on the prior
// call, using the observation the loop recorded in steps[last].
export function createAnthropicAgentModel({ model = getAgentModelId(), maxTokens = 4096, temperature = 0 } = {}) {
  const messages = [];
  let pendingToolUseId = null;
  let initialized = false;

  return async function callModel({ steps, sandbox }) {
    if (!initialized) {
      messages.push({ role: "user", content: buildInitialPrompt(sandbox) });
      initialized = true;
    } else {
      const last = steps[steps.length - 1];
      const { text, isError } = formatToolResult(last);
      messages.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: pendingToolUseId, content: text, is_error: isError }]
      });
    }

    const resp = await callAnthropicMessages({
      model,
      system: SYSTEM_PROMPT,
      messages,
      tools: AGENT_TOOLS,
      toolChoice: { type: "auto", disable_parallel_tool_use: true },
      maxTokens,
      temperature
    });

    // Append the assistant turn verbatim so the conversation stays valid.
    messages.push({ role: "assistant", content: resp.content });

    const usage = resp.usage
      ? { input_tokens: resp.usage.input_tokens, output_tokens: resp.usage.output_tokens }
      : null;
    const toolUse = resp.content.find(block => block.type === "tool_use");

    if (!toolUse) {
      pendingToolUseId = null;
      const text = resp.content
        .filter(block => block.type === "text")
        .map(block => block.text)
        .join("\n");
      return { action_type: "stop", action_args: { text }, tokens: usage, stop_reason: resp.stop_reason };
    }

    pendingToolUseId = toolUse.id;
    return { action_type: toolUse.name, action_args: toolUse.input || {}, tokens: usage, stop_reason: resp.stop_reason };
  };
}

function formatToolResult(step) {
  const observation = step?.observation ?? {};
  return { text: JSON.stringify(observation), isError: observation.ok === false };
}

function buildInitialPrompt(sandbox) {
  const task = sandbox.task;
  const files = listWorkspaceFiles(sandbox.root);
  const lines = [];
  lines.push(`TASK: ${task.description}`);
  if (task.spec) {
    lines.push("");
    lines.push(`SPEC:\n${task.spec}`);
  }
  lines.push("");
  lines.push("Workspace files you may read:");
  for (const file of files) lines.push(`  ${file}`);
  lines.push("");
  lines.push("Fix the bug, then run the tests. Call one tool per turn.");
  return lines.join("\n");
}

function listWorkspaceFiles(root) {
  const out = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(path.relative(root, full).split(path.sep).join("/"));
    }
  };
  walk(root);
  return out.sort();
}
