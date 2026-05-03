// pages/api/claude.js
//
// Server-side proxy to the Anthropic Messages API.
// - Holds ANTHROPIC_API_KEY in environment (never sent to the browser).
// - Sets required headers: x-api-key, anthropic-version, content-type.
// - Forwards a top-level `system` field when provided, never prepends to user content.
// - Pinned to claude-sonnet-4-6 (current Sonnet as of May 2026; Sonnet 4.0 is being
//   deprecated June 15, 2026).

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MODEL_ID = "claude-sonnet-4-6";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY is not set in the server environment"
    });
  }

  const { system, messages, max_tokens } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages must be a non-empty array" });
  }

  const payload = {
    model: MODEL_ID,
    max_tokens: typeof max_tokens === "number" ? max_tokens : 1024,
    messages
  };

  // Top-level system parameter, only set when caller provided one.
  if (typeof system === "string" && system.length > 0) {
    payload.system = system;
  }

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
