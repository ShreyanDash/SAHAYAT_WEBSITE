import type { Express, Request, RequestHandler, Response } from "express";

/**
 * In-memory store for rate limiting registration submissions.
 * Note: This rate limiter is local to the Node.js process and resets when the process restarts or scales.
 * For this landing page's early-access registration volume, this avoids requiring paid external Redis or KV stores.
 */
const registrationAttempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function rateLimitStore(store: Map<string, { count: number; resetAt: number }>, options: { windowMs: number; max: number; message: string }): RequestHandler {
  return (req, res, next) => {
    const now = Date.now();
    const key = clientKey(req);
    const current = store.get(key);
    const record = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : current;

    record.count += 1;
    store.set(key, record);
    if (record.count > options.max) {
      const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: options.message });
      return;
    }

    next();
  };
}

export const registrationRateLimit = rateLimitStore(registrationAttempts, {
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many registration attempts. Please try again later.",
});

function requestOrigin(req: Request) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedHost = req.headers["x-forwarded-host"];
  const protocol = typeof forwardedProto === "string" ? forwardedProto.split(",")[0]?.trim() : req.protocol;
  const host = typeof forwardedHost === "string" ? forwardedHost.split(",")[0]?.trim() : req.get("host");
  return protocol && host ? `${protocol}://${host}` : null;
}

export const sameOriginMutation: RequestHandler = (req, res, next) => {
  if (req.method !== "POST") {
    next();
    return;
  }

  const origin = req.get("origin");
  // Non-browser clients do not send Origin. Browser requests must match the
  // public origin, preventing cross-site form/fetch submissions to mutations.
  if (origin && origin !== requestOrigin(req)) {
    res.status(403).json({ error: "Cross-site request blocked" });
    return;
  }

  next();
};

export function applySecurityHeaders(app: Express) {
  app.disable("x-powered-by");
  // Render operates behind a single reverse proxy layer that sets X-Forwarded-* headers.
  // Trusting 1 proxy hop ensures req.ip and req.protocol accurately reflect the visitor's origin.
  app.set("trust proxy", 1);
  app.use((_req: Request, res: Response, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    // Published SAHAYAT traffic is HTTPS even when the upstream container hop is HTTP.
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });
}

export function assertProductionEnvironment() {
  if (process.env.NODE_ENV !== "production") return;

  const required = ["DATABASE_URL", "GMAIL_APP_PASSWORD"];
  const missing = required.filter(name => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }
}

export function cleanupRateLimitStores() {
  const now = Date.now();
  for (const store of [registrationAttempts]) {
    for (const [key, record] of store) {
      if (record.resetAt <= now) store.delete(key);
    }
  }
}
