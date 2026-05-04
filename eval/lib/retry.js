export const DEFAULT_RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504, 529]);

export class ApiHttpError extends Error {
  constructor({ provider, status, body, retryable }) {
    super(`${provider} error ${status}: ${body}`);
    this.name = "ApiHttpError";
    this.provider = provider;
    this.status = status;
    this.body = body;
    this.retryable = retryable;
  }
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function parseRetryAfterMs(headerValue) {
  if (!headerValue) return null;

  const seconds = Number(headerValue);
  if (Number.isFinite(seconds)) return seconds * 1000;

  const dateMs = Date.parse(headerValue);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());

  return null;
}

export function jitter(ms) {
  const spread = ms * 0.25;
  return Math.round(ms - spread + Math.random() * spread * 2);
}

export function exponentialBackoffMs(attempt, capMs = 30_000) {
  return jitter(Math.min(capMs, 1000 * 2 ** attempt));
}

export function shouldRetryTransportError(error) {
  // API 4xx/validation/auth errors should fail fast. Fetch/network errors can retry.
  return !(error instanceof ApiHttpError) || error.retryable === true;
}
