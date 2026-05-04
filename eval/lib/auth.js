export function requireAuth(req, res) {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !process.env.EVAL_ADMIN_TOKEN) {
    res.status(500).json({ error: "Server misconfigured: missing EVAL_ADMIN_TOKEN" });
    return false;
  }

  if (process.env.EVAL_ADMIN_TOKEN) {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (token !== process.env.EVAL_ADMIN_TOKEN) {
      res.status(401).json({ error: "Unauthorized" });
      return false;
    }
  }

  return true;
}
