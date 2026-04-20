import { createMiddleware } from "hono/factory";
import { createAuth } from "@worker/lib/better-auth";
import type { AppEnv } from "@worker/types";
import { logger } from "@worker/lib/logger";

export const resolveAuth = createMiddleware<AppEnv>(async (ctx, next) => {
    const db = ctx.get("db");
    const baseURL =
        ctx.env.BASE_URL ??
        ctx.req.header("origin") ??
        new URL(ctx.req.raw.url).origin;

    const authInstance = createAuth({
        db,
        secret: ctx.env.BETTER_AUTH_SECRET,
        baseURL,
        resendApiKey: ctx.env.RESEND_API_KEY,
    });

    const sessionData = await authInstance.api.getSession({
        headers: ctx.req.raw.headers,
    });

    if (!sessionData) {
        logger.warn("unauthorized request", { path: ctx.req.path });
        return ctx.json({ error: "Unauthorized" }, 401);
    }

    const user = sessionData.user as typeof sessionData.user & {
        role?: string;
    };
    const isGlobalAdmin = user.role === "admin";

    ctx.set("session", sessionData.session);
    ctx.set("user", sessionData.user);
    ctx.set("isGlobalAdmin", isGlobalAdmin);

    return next();
});
