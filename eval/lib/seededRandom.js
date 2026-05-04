import crypto from "crypto";

export function seededFloat(seed) {
  const hash = crypto.createHash("sha256").update(seed).digest();

  const int =
    hash[0] * 2 ** 40 +
    hash[1] * 2 ** 32 +
    hash[2] * 2 ** 24 +
    hash[3] * 2 ** 16 +
    hash[4] * 2 ** 8 +
    hash[5];

  return int / 2 ** 48;
}

export function seededBoolean(seed) {
  return seededFloat(seed) < 0.5;
}
