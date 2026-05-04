// pages/api/claude.js
//
// Server-side proxy to the Anthropic Messages API.
// - Holds ANTHROPIC_API_KEY in environment (never sent to the browser).
// - Optionally requires Authorization: Bearer EVAL_SECRET when set.
// - Strictly validates the incoming JSON body and caps max_tokens.
// - Rate-limits per IP (in-memory, single-instance only).
// - Pinned to claude-sonnet-4-6.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MODEL_ID = "claude-sonnet-4-6";

const MAX_MESSAGES = 10;
const MAX_SYSTEM_CHARS = 8000;
const MAX_TOKENS_CAP = 1000;
const DEFAULT_MAX_TOKENS = 600;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

// Module-level. Cleared on cold start; fine for a single-instance dev/eval server.
const rateLimitHits = new Map();

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim();
  }
  if (Array.isArray(fwd) && fwd.length > 0) {
    return String(fwd[0]).trim();
  }
  return (req.socket && req.socket.remoteAddress) || "unknown";
}

function rateLimitOk(ip) {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const hits = rateLimitHits.get(ip) || [];
  const recent = hits.filter((t) => t > cutoff);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitHits.set(ip, recent);
    return false;
  }
  recent.push(now);
  rateLimitHits.set(ip, recent);
  return true;
}

function validateBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "request body must be a JSON object" };
  }

  const allowedKeys = new Set(["messages", "system", "max_tokens"]);
  for (const k of Object.keys(body)) {
    if (!allowedKeys.has(k)) {
      return { ok: false, error: "unexpected field: " + k };
    }
  }

  const { messages, system, max_tokens } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "messages must be a non-empty array" };
  }
  if (messages.length > MAX_MESSAGES) {
    return { ok: false, error: "messages exceeds max length of " + MAX_MESSAGES };
  }
  for (const m of messages) {
    if (!m || typeof m !== "object") {
      return { ok: false, error: "each message must be an object" };
    }
    if (m.role !== "user" && m.role !== "assistant") {
      return { ok: false, error: "message role must be 'user' or 'assistant'" };
    }
    if (typeof m.content !== "string" || m.content.length === 0) {
      return { ok: false, error: "message content must be a non-empty string" };
    }
  }

  if (system !== undefined) {
    if (typeof system !== "string") {
      return { ok: false, error: "system must be a string" };
    }
    if (system.length > MAX_SYSTEM_CHARS) {
      return { ok: false, error: "system exceeds max length of " + MAX_SYSTEM_CHARS };
    }
  }

  let maxTokens = DEFAULT_MAX_TOKENS;
  if (max_tokens !== undefined) {
    if (typeof max_tokens !== "number" || !Number.isInteger(max_tokens) || max_tokens <= 0) {
      return { ok: false, error: "max_tokens must be a positive integer" };
    }
    maxTokens = Math.min(max_tokens, MAX_TOKENS_CAP);
  }

  return {
    ok: true,
    payload: { messages, system: typeof system === "string" && system.length > 0 ? system : undefined, maxTokens }
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const evalSecret = process.env.EVAL_SECRET;
  if (evalSecret) {
    const auth = req.headers.authorization || "";
    const expected = "Bearer " + evalSecret;
    if (auth !== expected) {
      return res.status(401).json({ error: "unauthorized" });
    }
  }

  const ip = getClientIp(req);
  if (!rateLimitOk(ip)) {
    return res.status(429).json({ error: "rate limit exceeded" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set in the server environment" });
  }

  const validation = validateBody(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }
  const { messages, system, maxTokens } = validation.payload;

  const payload = {
    model: MODEL_ID,
    max_tokens: maxTokens,
    // Set explicitly for reproducibility. Drop to 0 for fully deterministic output.
    temperature: 0.3,
    messages
  };
  if (system) payload.system = system;

  try {
    const upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
}
