import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createAuth } from "@worker/lib/better-auth";
import { systemSettings } from "@worker/db/schema";
import type { Database } from "@worker/db/client";
import type { AppEnv } from "@worker/types";
import { logger } from "@worker/lib/logger";

export const authRoutes = new Hono<AppEnv>();

async function verifyTurnstile(
  token: string,
  secretKey: string,
  remoteIp?: string,
): Promise<boolean> {
  const formData = new URLSearchParams();
  formData.append("secret", secretKey);
  formData.append("response", token);
  if (remoteIp) formData.append("remoteip", remoteIp);

  const result = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: formData },
  );
  const outcome = (await result.json()) as { success: boolean };
  return outcome.success;
}

async function isSignupEnabled(db: Database): Promise<boolean> {
  const row = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, "signups_enabled"))
    .get();
  return row ? row.value === "true" : true;
}

authRoutes.get("/signup-status", async (ctx) => {
  const db = ctx.get("db");
  const enabled = await isSignupEnabled(db);
  return ctx.json({ signups_enabled: enabled });
});

// Intercept sign-up to verify Turnstile token before passing to Better Auth
authRoutes.post("/sign-up/email", async (ctx, next) => {
  const db = ctx.get("db");
  const signupsEnabled = await isSignupEnabled(db);
  if (!signupsEnabled) {
    return ctx.json(
      { error: { message: "Signups are currently disabled" } },
      200,
    );
  }

  const body = (await ctx.req.json()) as Record<string, unknown>;
  const turnstileToken = body.turnstileToken as string | undefined;

  if (!turnstileToken) {
    logger.warn("sign-up missing turnstile token", {
      ip: ctx.req.header("cf-connecting-ip") ?? "unknown",
    });
    return ctx.json(
      { error: { message: "Captcha verification required" } },
      200,
    );
  }

  const valid = await verifyTurnstile(
    turnstileToken,
    ctx.env.TURNSTILE_SECRET_KEY,
    ctx.req.header("cf-connecting-ip") ?? undefined,
  );

  if (!valid) {
    logger.warn("turnstile verification failed", {
      ip: ctx.req.header("cf-connecting-ip") ?? "unknown",
    });
    return ctx.json({ error: { message: "Captcha verification failed" } }, 200);
  }

  // Strip turnstileToken from body before passing to Better Auth
  const { turnstileToken: _removed, ...cleanBody } = body;

  const cleanRequest = new Request(ctx.req.raw.url, {
    method: ctx.req.raw.method,
    headers: ctx.req.raw.headers,
    body: JSON.stringify(cleanBody),
  });

  (ctx.req as { raw: Request }).raw = cleanRequest;
  await next();
});

authRoutes.all("/*", async (ctx) => {
  const db = ctx.get("db");
  const baseURL =
    ctx.env.BASE_URL ??
    ctx.req.header("origin") ??
    new URL(ctx.req.raw.url).origin;
  const auth = createAuth({
    db,
    secret: ctx.env.BETTER_AUTH_SECRET,
    baseURL,
    email: ctx.env.EMAIL,
    emailFrom: ctx.env.EMAIL_FROM,
  });
  const response = await auth.handler(ctx.req.raw);
  // Workaround: miniflare/undici rejects 401 responses in CORS mode during
  // local dev, causing "fetch failed" errors. Remap 401 -> 200 with the error
  // in the JSON body — Better Auth's client reads the error from the body, not
  // the status code.
  if (response.status === 401) {
    return new Response(response.body, {
      status: 200,
      headers: response.headers,
    });
  }
  return response;
});
