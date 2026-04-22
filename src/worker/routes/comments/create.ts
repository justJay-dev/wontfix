import { contentJson } from "chanfana";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { issues, comments, users, attachments } from "@worker/db/schema";
import {
    CreateCommentRequest,
    CommentSchema,
} from "@worker/schemas/wontfix";
import { linkAttachmentsToTarget } from "@worker/lib/link-attachments";
import type { AppContext } from "@worker/types";

export class CreateIssueCommentEndpoint extends BaseEndpoint {
    schema = {
        operationId: "createIssueComment",
        tags: ["Comments"],
        security: [{ session: [] }],
        request: {
            params: z.object({ number: z.string() }),
            body: contentJson(CreateCommentRequest),
        },
        responses: {
            "201": {
                description: "Created comment",
                ...contentJson(z.object({ data: CommentSchema })),
            },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const organizationId = context.get("organizationId");
        const user = context.get("user") as { id: string };
        const { params, body } =
            await this.getValidatedData<typeof this.schema>();

        const [issue] = await db
            .select({ id: issues.id })
            .from(issues)
            .where(
                and(
                    eq(issues.organizationId, organizationId),
                    eq(issues.number, Number(params.number)),
                ),
            )
            .limit(1);

        if (!issue) {
            return context.json({ error: "not_found" }, 404);
        }

        const commentId = nanoid();
        await db.insert(comments).values({
            id: commentId,
            issueId: issue.id,
            authorId: user.id,
            body: body.body,
        });

        if (body.attachment_ids.length > 0) {
            const result = await linkAttachmentsToTarget({
                db,
                organizationId,
                attachmentIds: body.attachment_ids,
                target: { commentId },
            });
            if (result !== "ok") {
                await db.delete(comments).where(eq(comments.id, commentId));
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
            .where(eq(comments.id, commentId));

        const attachmentRows = await db
            .select()
            .from(attachments)
            .where(eq(attachments.commentId, commentId));

        const createdAt =
            row.created_at instanceof Date
                ? Math.floor(row.created_at.getTime() / 1000)
                : (row.created_at as unknown as number);
        const updatedAt =
            row.updated_at instanceof Date
                ? Math.floor(row.updated_at.getTime() / 1000)
                : (row.updated_at as unknown as number);

        return context.json(
            {
                data: {
                    id: row.id,
                    issue_id: row.issue_id,
                    body: row.body,
                    created_at: createdAt,
                    updated_at: updatedAt,
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
                        created_at:
                            attachment.createdAt instanceof Date
                                ? Math.floor(
                                      attachment.createdAt.getTime() / 1000,
                                  )
                                : (attachment.createdAt as unknown as number),
                    })),
                },
            },
            201,
        );
    }
}
