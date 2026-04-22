import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
    resolveAuth,
    requireActiveOrg,
    tryResolveSession,
} from "@worker/middleware/permissions";
import {
    attachments,
    issues,
    comments,
    initiatives,
} from "@worker/db/schema";
import type { AppEnv } from "@worker/types";

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/json",
    "application/zip",
]);

function sanitizeFilename(input: string): string {
    const trimmed = input.trim().replace(/\s+/g, "-");
    const safe = trimmed.replace(/[^A-Za-z0-9._-]/g, "");
    return safe.length > 0 ? safe.slice(0, 120) : "file";
}

const app = new Hono<AppEnv>();

// GET is handled below with its own conditional-auth path so that
// attachments linked to public initiatives stay reachable without a
// session. POST + DELETE still require a full authenticated org context.
app.post("/", resolveAuth, requireActiveOrg, async (ctx) => {
    const contentLength = Number(ctx.req.header("content-length") ?? "0");
    if (contentLength > MAX_BYTES) {
        return ctx.json({ error: "too_large" }, 413);
    }

    const form = await ctx.req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
        return ctx.json({ error: "missing_file" }, 400);
    }
    if (file.size > MAX_BYTES) {
        return ctx.json({ error: "too_large" }, 413);
    }
    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
        return ctx.json({ error: "unsupported_type" }, 415);
    }

    const organizationId = ctx.get("organizationId");
    const user = ctx.get("user") as { id: string };
    const attachmentId = nanoid();
    const filename = sanitizeFilename(file.name);
    const r2Key = `orgs/${organizationId}/${attachmentId}/${filename}`;

    await ctx.env.FILES.put(r2Key, file.stream(), {
        httpMetadata: { contentType: file.type },
    });

    const db = ctx.get("db");
    await db.insert(attachments).values({
        id: attachmentId,
        organizationId,
        uploaderId: user.id,
        r2Key,
        filename,
        contentType: file.type,
        sizeBytes: file.size,
    });

    // TODO: orphan sweep. Attachments created without an issueId/commentId
    // link are left dangling if the parent form is abandoned. A Cloudflare
    // cron trigger that deletes rows (and R2 objects) older than 24h with
    // both parent FKs null would close the leak.
    return ctx.json(
        {
            id: attachmentId,
            filename,
            content_type: file.type,
            size_bytes: file.size,
            url: `/api/attachments/${attachmentId}`,
        },
        201,
    );
});

// Public-or-authed GET. If the caller has a valid session and the
// attachment is in their active org, serve it. Otherwise fall back to
// checking whether the attachment lives under a public initiative.
app.get("/:id", async (ctx) => {
    const id = ctx.req.param("id");
    const db = ctx.get("db");

    const [row] = await db
        .select()
        .from(attachments)
        .where(eq(attachments.id, id))
        .limit(1);

    if (!row) return ctx.json({ error: "not_found" }, 404);

    // 1) Public-initiative fallback — works without a session.
    let publicAllowed = false;
    if (row.issueId || row.commentId) {
        const issueIdFromComment = row.commentId
            ? (
                  await db
                      .select({ issueId: comments.issueId })
                      .from(comments)
                      .where(eq(comments.id, row.commentId))
                      .limit(1)
              )[0]?.issueId
            : undefined;
        const targetIssueId = row.issueId ?? issueIdFromComment ?? null;
        if (targetIssueId) {
            const [publicRow] = await db
                .select({ id: initiatives.id })
                .from(issues)
                .innerJoin(
                    initiatives,
                    eq(initiatives.id, issues.initiativeId),
                )
                .where(
                    and(
                        eq(issues.id, targetIssueId),
                        eq(initiatives.isPublic, true),
                    ),
                )
                .limit(1);
            publicAllowed = !!publicRow;
        }
    }

    if (!publicAllowed) {
        // 2) Otherwise require a session whose active org owns the file.
        const resolved = await tryResolveSession(ctx);
        if (!resolved) return ctx.json({ error: "not_found" }, 404);
        const activeOrgId = resolved.session.activeOrganizationId ?? null;
        if (!activeOrgId || row.organizationId !== activeOrgId) {
            return ctx.json({ error: "not_found" }, 404);
        }
    }

    const object = await ctx.env.FILES.get(row.r2Key);
    if (!object) return ctx.json({ error: "not_found" }, 404);

    return new Response(object.body, {
        headers: {
            "Content-Type": row.contentType,
            "Content-Length": String(row.sizeBytes),
            "Content-Disposition": `inline; filename="${row.filename}"`,
            "Cache-Control": publicAllowed
                ? "public, max-age=3600"
                : "private, max-age=3600",
        },
    });
});

app.delete("/:id", resolveAuth, requireActiveOrg, async (ctx) => {
    const id = ctx.req.param("id");
    const organizationId = ctx.get("organizationId");
    const user = ctx.get("user") as { id: string };
    const role = ctx.get("memberRole");
    const db = ctx.get("db");

    const [row] = await db
        .select()
        .from(attachments)
        .where(
            and(
                eq(attachments.id, id),
                eq(attachments.organizationId, organizationId),
            ),
        )
        .limit(1);

    if (!row) return ctx.json({ error: "not_found" }, 404);

    const isOwner = row.uploaderId === user.id;
    const isOrgAdmin = role === "owner" || role === "admin";
    if (!isOwner && !isOrgAdmin) {
        return ctx.json({ error: "forbidden" }, 403);
    }

    await ctx.env.FILES.delete(row.r2Key);
    await db.delete(attachments).where(eq(attachments.id, id));

    return ctx.body(null, 204);
});

export { app as attachmentRoutes };
