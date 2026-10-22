// lib/rejectCompressedBody.js
//
// Defense-in-depth for CVE-2026-111497 (Node.js Brotli decoder OOB write, RCE).
// The fix is a patched Node release on its supported major — see nodeRuntime.js.
// This handler-level check rejects compressed bodies that reach the route.
// A framework or proxy may parse the body BEFORE this handler runs; this check
// cannot protect an earlier decoder or outbound fetch response decompression.
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
