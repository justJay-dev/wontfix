import { contentJson } from "chanfana";
import { z } from "zod";
import { and, asc, eq, inArray } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import {
    issues,
    comments,
    users,
    attachments,
} from "@worker/db/schema";
import { CommentSchema } from "@worker/schemas/wontfix";
import type { AppContext } from "@worker/types";

export class ListIssueCommentsEndpoint extends BaseEndpoint {
    schema = {
        operationId: "listIssueComments",
        tags: ["Comments"],
        security: [{ session: [] }],
        request: {
            params: z.object({ number: z.string() }),
        },
        responses: {
            "200": {
                description: "Comments on the issue",
                ...contentJson(z.object({ data: z.array(CommentSchema) })),
            },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const organizationId = context.get("organizationId");
        const { params } = await this.getValidatedData<typeof this.schema>();

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

        const rows = await db
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
            .where(eq(comments.issueId, issue.id))
            .orderBy(asc(comments.createdAt));

        const commentIds = rows.map((row) => row.id);
        const attachmentRows = commentIds.length
            ? await db
                  .select()
                  .from(attachments)
                  .where(inArray(attachments.commentId, commentIds))
            : [];

        const attachmentMap = new Map<string, {
            id: string;
            filename: string;
            content_type: string;
            size_bytes: number;
            url: string;
            uploader_id: string;
            created_at: number;
        }[]>();
        for (const row of attachmentRows) {
            if (!row.commentId) continue;
            const createdAt =
                row.createdAt instanceof Date
                    ? Math.floor(row.createdAt.getTime() / 1000)
                    : (row.createdAt as unknown as number);
            const entry = attachmentMap.get(row.commentId) ?? [];
            entry.push({
                id: row.id,
                filename: row.filename,
                content_type: row.contentType,
                size_bytes: row.sizeBytes,
                url: `/api/attachments/${row.id}`,
                uploader_id: row.uploaderId,
                created_at: createdAt,
            });
            attachmentMap.set(row.commentId, entry);
        }

        const data = rows.map((row) => {
            const createdAt =
                row.created_at instanceof Date
                    ? Math.floor(row.created_at.getTime() / 1000)
                    : (row.created_at as unknown as number);
            const updatedAt =
                row.updated_at instanceof Date
                    ? Math.floor(row.updated_at.getTime() / 1000)
                    : (row.updated_at as unknown as number);
            return {
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
                attachments: attachmentMap.get(row.id) ?? [],
            };
        });

        return context.json({ data }, 200);
    }
}
