import crypto from "crypto";

let warnedAboutMissingDevToken = false;

function safeEquals(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));

  // Length mismatch is safe for opaque admin tokens; this intentionally avoids
  // calling timingSafeEqual with unequal buffer lengths.
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function requireAuth(req, res) {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !process.env.EVAL_ADMIN_TOKEN) {
    res.status(500).json({ error: "Server misconfigured: missing EVAL_ADMIN_TOKEN" });
    return false;
  }

  if (!isProduction && !process.env.EVAL_ADMIN_TOKEN && !warnedAboutMissingDevToken) {
    warnedAboutMissingDevToken = true;
    console.warn(
      "WARNING: EVAL_ADMIN_TOKEN is unset. Eval API routes are unauthenticated in non-production. Do not expose this dev server publicly."
    );
  }

  if (process.env.EVAL_ADMIN_TOKEN) {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!safeEquals(token, process.env.EVAL_ADMIN_TOKEN)) {
      res.status(401).json({ error: "Unauthorized" });
      return false;
    }
  }

  return true;
}
