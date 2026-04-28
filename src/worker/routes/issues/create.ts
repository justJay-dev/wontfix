import { contentJson } from "chanfana";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { issues, initiatives, members } from "@worker/db/schema";
import {
    CreateIssueRequest,
    IssueSchema,
} from "@worker/schemas/wontfix";
import { hydrateIssues } from "@worker/lib/issue-hydrate";
import { linkAttachmentsToTarget } from "@worker/lib/link-attachments";
import type { AppContext } from "@worker/types";

export class CreateIssueEndpoint extends BaseEndpoint {
    schema = {
        operationId: "createIssue",
        tags: ["Issues"],
        security: [{ session: [] }],
        request: {
            body: contentJson(CreateIssueRequest),
        },
        responses: {
            "201": {
                description: "Created issue",
                ...contentJson(z.object({ data: IssueSchema })),
            },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const organizationId = context.get("organizationId");
        const user = context.get("user") as { id: string };
        const { body } = await this.getValidatedData<typeof this.schema>();

        if (body.initiative_id) {
            const [initiative] = await db
                .select({ id: initiatives.id })
                .from(initiatives)
                .where(
                    and(
                        eq(initiatives.id, body.initiative_id),
                        eq(initiatives.organizationId, organizationId),
                    ),
                )
                .limit(1);
            if (!initiative) {
                return context.json({ error: "invalid_initiative" }, 400);
            }
        }

        if (body.assignee_id) {
            const [member] = await db
                .select({ id: members.id })
                .from(members)
                .where(
                    and(
                        eq(members.userId, body.assignee_id),
                        eq(members.organizationId, organizationId),
                    ),
                )
                .limit(1);
            if (!member) {
                return context.json({ error: "invalid_assignee" }, 400);
            }
        }

        // Per-org auto-increment. Safe under D1 single-writer semantics.
        const [maxRow] = await db
            .select({ max: sql<number>`coalesce(max(${issues.number}), 0)` })
            .from(issues)
            .where(eq(issues.organizationId, organizationId));
        const nextNumber = Number(maxRow?.max ?? 0) + 1;

        const [countRow] = await db
            .select({ count: sql<number>`count(*)` })
            .from(issues)
            .where(
                and(
                    eq(issues.organizationId, organizationId),
                    eq(issues.status, "new"),
                ),
            );
        const sortOrder = Number(countRow?.count ?? 0) + 1;

        const issueId = nanoid();
        await db.insert(issues).values({
            id: issueId,
            organizationId,
            initiativeId: body.initiative_id ?? null,
            number: nextNumber,
            title: body.title,
            body: body.body,
            status: "new",
            priority: body.priority ?? "meh",
            authorId: user.id,
            assigneeId: body.assignee_id ?? null,
            sortOrder,
        });

        if (body.attachment_ids.length > 0) {
            const result = await linkAttachmentsToTarget({
                db,
                organizationId,
                attachmentIds: body.attachment_ids,
                target: { issueId },
            });
            if (result !== "ok") {
                await db.delete(issues).where(eq(issues.id, issueId));
                return context.json({ error: result }, 400);
            }
        }

        const hydrated = await hydrateIssues(db, [issueId]);
        const data = hydrated.get(issueId);
        if (!data) {
            return context.json({ error: "internal_error" }, 500);
        }

        return context.json({ data }, 201);
    }
}
