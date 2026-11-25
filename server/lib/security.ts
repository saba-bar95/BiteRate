import type { Context, Next } from "hono";

const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost"]);

/** Strict origin allowlist — never substring-match untrusted Origin headers. */
export function allowedCorsOrigin(origin: string | undefined): string | null {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (ALLOWED_HOSTS.has(host)) return origin;
    if (host.endsWith(".apps.grok.bot")) return origin;
    if (host === "cursor.com" || host.endsWith(".cursor.com")) return origin;
    return null;
  } catch {
    return null;
  }
}

export function clientIp(c: Context): string {
  // Only trust forwarded headers behind a known reverse proxy (production).
  if (
    process.env.NODE_ENV === "production" ||
    process.env.TRUST_PROXY === "1"
  ) {
    const xff = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
    if (xff) return xff.slice(0, 64);
    const real = c.req.header("x-real-ip")?.trim();
    if (real) return real.slice(0, 64);
  }
  return "local";
}

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

/** Sliding 60s window per key. Periodically prunes expired entries. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  if (buckets.size > 5_000) {
    for (const [k, v] of buckets) {
      if (now > v.reset) buckets.delete(k);
    }
  }
  const row = buckets.get(key);
  if (!row || now > row.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (row.count >= limit) return false;
  row.count += 1;
  return true;
}

export const RATE = {
  default: 90,
  heavy: 30,
  write: 20,
  health: 180,
} as const;

export async function securityHeaders(c: Context, next: Next) {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  c.header("Cross-Origin-Opener-Policy", "same-origin");
  c.header("Cross-Origin-Resource-Policy", "same-site");
  // API responses are JSON; HTML gets a fuller CSP when serving the SPA.
  if (!c.req.path.startsWith("/api/")) {
    c.header(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ].join("; "),
    );
  }
  await next();
}

export const MAX_JSON_BYTES = 48 * 1024;

export function rejectOversizedBody(c: Context): Response | null {
  const len = Number(c.req.header("content-length") ?? 0);
  if (Number.isFinite(len) && len > MAX_JSON_BYTES) {
    return c.json({ error: "Request body too large" }, 413);
  }
  return null;
}
