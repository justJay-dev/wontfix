import { createMiddleware } from "hono/factory";
import type { Env } from "@worker/types";
import { logger } from "@worker/lib/logger";

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 20; // 20 requests per minute per IP on auth routes

const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();

export const rateLimit = createMiddleware<{ Bindings: Env }>(
  async (ctx, next) => {
    const ip =
      ctx.req.header("cf-connecting-ip") ??
      ctx.req.header("x-forwarded-for") ??
      "unknown";
    const now = Date.now();

    const entry = ipRequestCounts.get(ip);

    if (!entry || now > entry.resetAt) {
      ipRequestCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
      return next();
    }

    entry.count++;

    if (entry.count > MAX_REQUESTS) {
      logger.warn("rate limit exceeded", { ip, path: ctx.req.path });
      return ctx.json(
        { error: "Too many requests. Please try again later." },
        429,
      );
    }

    return next();
  },
);
