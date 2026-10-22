// lib/rejectCompressedBody.js
//
// Defense-in-depth for CVE-2026-111497 (Node.js Brotli decoder OOB write, RCE).
// The real fix is running Node >= 22.23.4 / 24.22.1 / 26.12.1 — see package.json
// "engines" and .nvmrc. This guard additionally refuses any request that
// arrives with a compressed body, so no decoder is ever fed attacker-controlled
// bytes even if a future body parser starts transparently decompressing.
//
// Every /api route accepts only plain JSON. Rejecting Content-Encoding costs nothing.

export function rejectCompressedBody(req, res) {
  const enc = req.headers["content-encoding"];
  if (!enc) return false;
  const tokens = String(enc)
    .toLowerCase()
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  // Anything other than "identity" (br, gzip, deflate, zstd, unknown) is refused.
  if (tokens.every((t) => t === "identity")) return false;
  res.status(415).json({ error: "compressed request bodies are not accepted" });
  return true;
}
