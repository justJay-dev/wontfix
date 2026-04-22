import { contentJson } from "chanfana";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { ISSUE_STATUSES, issues, initiatives, members } from "@worker/db/schema";
import {
    UpdateIssueRequest,
    IssueSchema,
} from "@worker/schemas/wontfix";
import { hydrateIssues } from "@worker/lib/issue-hydrate";
import { linkAttachmentsToTarget } from "@worker/lib/link-attachments";
import { auditFromContext } from "@worker/lib/audit";
import type { AppContext } from "@worker/types";

const TERMINAL_STATUSES = new Set<(typeof ISSUE_STATUSES)[number]>([
    "done",
    "wont_fix",
]);

export class UpdateIssueEndpoint extends BaseEndpoint {
    schema = {
        operationId: "updateIssue",
        tags: ["Issues"],
        security: [{ session: [] }],
        request: {
            params: z.object({ number: z.string() }),
            body: contentJson(UpdateIssueRequest),
        },
        responses: {
            "200": {
                description: "Updated issue",
                ...contentJson(z.object({ data: IssueSchema })),
            },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const organizationId = context.get("organizationId");
        const { params, body } =
            await this.getValidatedData<typeof this.schema>();

        const [existing] = await db
            .select({
                id: issues.id,
                status: issues.status,
                closedAt: issues.closedAt,
            })
            .from(issues)
            .where(
                and(
                    eq(issues.organizationId, organizationId),
                    eq(issues.number, Number(params.number)),
                ),
            )
            .limit(1);

        if (!existing) {
            return context.json({ error: "not_found" }, 404);
        }

        if (
            body.initiative_id !== undefined &&
            body.initiative_id !== null
        ) {
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

        if (body.assignee_id !== undefined && body.assignee_id !== null) {
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

        const updates: Record<string, unknown> = {
            updatedAt: sql`(unixepoch())`,
        };
        if (body.title !== undefined) updates.title = body.title;
        if (body.body !== undefined) updates.body = body.body;
        if (body.initiative_id !== undefined)
            updates.initiativeId = body.initiative_id;
        if (body.priority !== undefined) updates.priority = body.priority;
        if (body.assignee_id !== undefined)
            updates.assigneeId = body.assignee_id;
        if (body.status !== undefined) {
            updates.status = body.status;
            const wasTerminal = TERMINAL_STATUSES.has(existing.status);
            const isTerminal = TERMINAL_STATUSES.has(body.status);
            if (!wasTerminal && isTerminal) {
                updates.closedAt = sql`(unixepoch())`;
            } else if (wasTerminal && !isTerminal) {
                updates.closedAt = null;
            }
        }

        await db.update(issues).set(updates).where(eq(issues.id, existing.id));

        await auditFromContext(context, "update", "issue", existing.id, body);

        if (body.attachment_ids && body.attachment_ids.length > 0) {
            const result = await linkAttachmentsToTarget({
                db,
                organizationId,
                attachmentIds: body.attachment_ids,
                target: { issueId: existing.id },
            });
            if (result !== "ok") {
                return context.json({ error: result }, 400);
            }
        }

        const hydrated = await hydrateIssues(db, [existing.id]);
        const data = hydrated.get(existing.id);
        if (!data) {
            return context.json({ error: "internal_error" }, 500);
        }

        return context.json({ data }, 200);
    }
}
