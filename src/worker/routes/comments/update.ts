import { contentJson } from "chanfana";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { comments, issues, users, attachments } from "@worker/db/schema";
import {
    UpdateCommentRequest,
    CommentSchema,
} from "@worker/schemas/wontfix";
import { linkAttachmentsToTarget } from "@worker/lib/link-attachments";
import { auditFromContext } from "@worker/lib/audit";
import type { AppContext } from "@worker/types";

export class UpdateCommentEndpoint extends BaseEndpoint {
    schema = {
        operationId: "updateComment",
        tags: ["Comments"],
        security: [{ session: [] }],
        request: {
            params: z.object({ id: z.string() }),
            body: contentJson(UpdateCommentRequest),
        },
        responses: {
            "200": {
                description: "Updated comment",
                ...contentJson(z.object({ data: CommentSchema })),
            },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const organizationId = context.get("organizationId");
        const user = context.get("user") as { id: string };
        const role = context.get("memberRole");
        const { params, body } =
            await this.getValidatedData<typeof this.schema>();

        const [existing] = await db
            .select({
                id: comments.id,
                authorId: comments.authorId,
                issueOrg: issues.organizationId,
            })
            .from(comments)
            .innerJoin(issues, eq(comments.issueId, issues.id))
            .where(eq(comments.id, params.id))
            .limit(1);

        if (!existing || existing.issueOrg !== organizationId) {
            return context.json({ error: "not_found" }, 404);
        }

        const isOwner = existing.authorId === user.id;
        const isOrgAdmin = role === "owner" || role === "admin";
        if (!isOwner && !isOrgAdmin) {
            return context.json({ error: "forbidden" }, 403);
        }

        await db
            .update(comments)
            .set({
                body: body.body,
                updatedAt: sql`(unixepoch())` as unknown as Date,
            })
            .where(eq(comments.id, params.id));

        await auditFromContext(context, "update", "comment", params.id, body);

        if (body.attachment_ids && body.attachment_ids.length > 0) {
            const result = await linkAttachmentsToTarget({
                db,
                organizationId,
                attachmentIds: body.attachment_ids,
                target: { commentId: params.id },
            });
            if (result !== "ok") {
                return context.json({ error: result }, 400);
            }
        }

        const [row] = await db
            .select({
                id: comments.id,
                issue_id: comments.issueId,
                body: comments.body,
                created_at: comments.createdAt,
                updated_at: comments.updatedAt,
                author_id: users.id,
                author_name: users.name,
                author_email: users.email,
                author_image: users.image,
            })
            .from(comments)
            .innerJoin(users, eq(comments.authorId, users.id))
            .where(eq(comments.id, params.id));

        const attachmentRows = await db
            .select()
            .from(attachments)
            .where(eq(attachments.commentId, params.id));

        const toEpoch = (value: Date | number | null): number => {
            if (value === null) return 0;
            if (value instanceof Date)
                return Math.floor(value.getTime() / 1000);
            return value as number;
        };

        return context.json(
            {
                data: {
                    id: row.id,
                    issue_id: row.issue_id,
                    body: row.body,
                    created_at: toEpoch(row.created_at),
                    updated_at: toEpoch(row.updated_at),
                    author: {
                        id: row.author_id,
                        name: row.author_name,
                        email: row.author_email,
                        image: row.author_image ?? null,
                    },
                    attachments: attachmentRows.map((attachment) => ({
                        id: attachment.id,
                        filename: attachment.filename,
                        content_type: attachment.contentType,
                        size_bytes: attachment.sizeBytes,
                        url: `/api/attachments/${attachment.id}`,
                        uploader_id: attachment.uploaderId,
                        created_at: toEpoch(attachment.createdAt),
                    })),
                },
            },
            200,
        );
    }
}
