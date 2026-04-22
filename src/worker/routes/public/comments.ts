import { contentJson } from "chanfana";
import { z } from "zod";
import { and, asc, eq, inArray } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import {
    issues,
    initiatives,
    organizations,
    comments,
    users,
    attachments,
} from "@worker/db/schema";
import { CommentSchema } from "@worker/schemas/wontfix";
import type { AppContext } from "@worker/types";

export class ListPublicIssueCommentsEndpoint extends BaseEndpoint {
    schema = {
        operationId: "listPublicIssueComments",
        tags: ["Public"],
        request: {
            params: z.object({
                orgSlug: z.string(),
                slug: z.string(),
                number: z.string(),
            }),
        },
        responses: {
            "200": {
                description: "Comments on a public issue",
                ...contentJson(z.object({ data: z.array(CommentSchema) })),
            },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const { params } = await this.getValidatedData<typeof this.schema>();

        const [issue] = await db
            .select({ id: issues.id })
            .from(issues)
            .innerJoin(
                initiatives,
                eq(initiatives.id, issues.initiativeId),
            )
            .innerJoin(
                organizations,
                eq(organizations.id, initiatives.organizationId),
            )
            .where(
                and(
                    eq(organizations.slug, params.orgSlug),
                    eq(initiatives.slug, params.slug),
                    eq(initiatives.isPublic, true),
                    eq(issues.number, Number(params.number)),
                ),
            )
            .limit(1);

        if (!issue) return context.json({ error: "not_found" }, 404);

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

        const toEpoch = (value: Date | number | null): number => {
            if (value === null) return 0;
            if (value instanceof Date)
                return Math.floor(value.getTime() / 1000);
            return value as number;
        };

        const attachmentMap = new Map<
            string,
            {
                id: string;
                filename: string;
                content_type: string;
                size_bytes: number;
                url: string;
                uploader_id: string;
                created_at: number;
            }[]
        >();
        for (const row of attachmentRows) {
            if (!row.commentId) continue;
            const entry = attachmentMap.get(row.commentId) ?? [];
            entry.push({
                id: row.id,
                filename: row.filename,
                content_type: row.contentType,
                size_bytes: row.sizeBytes,
                url: `/api/attachments/${row.id}`,
                uploader_id: row.uploaderId,
                created_at: toEpoch(row.createdAt),
            });
            attachmentMap.set(row.commentId, entry);
        }

        const data = rows.map((row) => ({
            id: row.id,
            issue_id: row.issue_id,
            body: row.body,
            created_at: toEpoch(row.created_at),
            updated_at: toEpoch(row.updated_at),
            // Scrub email on public comments to reduce address-harvesting.
            author: {
                id: row.author_id,
                name: row.author_name,
                email: "",
                image: row.author_image ?? null,
            },
            attachments: attachmentMap.get(row.id) ?? [],
        }));

        return context.json({ data }, 200);
    }
}
