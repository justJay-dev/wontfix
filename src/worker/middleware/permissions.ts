import { createMiddleware } from "hono/factory";
import { and, eq } from "drizzle-orm";
import { createAuth } from "@worker/lib/better-auth";
import { members } from "@worker/db/schema";
import type { AppEnv } from "@worker/types";
import { logger } from "@worker/lib/logger";

// Non-throwing session lookup. Returns null if there's no valid session,
// without responding. Useful for endpoints that allow both authenticated
// and public callers (e.g. attachments backing a public initiative).
export async function tryResolveSession(
    ctx: { req: { raw: Request }; env: AppEnv["Bindings"]; get: (key: "db") => AppEnv["Variables"]["db"] },
): Promise<{
    user: { id: string; role?: string };
    session: { activeOrganizationId?: string | null };
} | null> {
    const db = ctx.get("db");
    const baseURL =
        ctx.env.BASE_URL ??
        ctx.req.raw.headers.get("origin") ??
        new URL(ctx.req.raw.url).origin;
    const authInstance = createAuth({
        db,
        secret: ctx.env.BETTER_AUTH_SECRET,
        baseURL,
        email: ctx.env.EMAIL,
        emailFrom: ctx.env.EMAIL_FROM,
    });
    const sessionData = await authInstance.api.getSession({
        headers: ctx.req.raw.headers,
    });
    if (!sessionData) return null;
    return {
        user: sessionData.user as { id: string; role?: string },
        session: sessionData.session as {
            activeOrganizationId?: string | null;
        },
    };
}

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
        email: ctx.env.EMAIL,
        emailFrom: ctx.env.EMAIL_FROM,
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

// Requires a session with an active organization. Resolves the caller's
// membership role and exposes both `organizationId` and `memberRole`.
export const requireActiveOrg = createMiddleware<AppEnv>(async (ctx, next) => {
    const session = ctx.get("session") as
        | { activeOrganizationId?: string | null }
        | undefined;
    const orgId = session?.activeOrganizationId;

    if (!orgId) {
        return ctx.json({ error: "no_active_org" }, 403);
    }

    const user = ctx.get("user") as { id?: string } | undefined;
    const userId = user?.id;
    if (!userId) {
        return ctx.json({ error: "Unauthorized" }, 401);
    }

    const db = ctx.get("db");
    const [membership] = await db
        .select({ role: members.role })
        .from(members)
        .where(
            and(eq(members.userId, userId), eq(members.organizationId, orgId)),
        )
        .limit(1);

    if (!membership) {
        return ctx.json({ error: "not_a_member" }, 403);
    }

    ctx.set("organizationId", orgId);
    ctx.set("memberRole", membership.role);

    return next();
});
