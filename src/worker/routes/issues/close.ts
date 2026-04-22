import { contentJson } from "chanfana";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { issues } from "@worker/db/schema";
import { CloseIssueRequest, IssueSchema } from "@worker/schemas/wontfix";
import { hydrateIssues } from "@worker/lib/issue-hydrate";
import { auditFromContext } from "@worker/lib/audit";
import type { AppContext } from "@worker/types";

export class CloseIssueEndpoint extends BaseEndpoint {
    schema = {
        operationId: "closeIssue",
        tags: ["Issues"],
        security: [{ session: [] }],
        request: {
            params: z.object({ number: z.string() }),
            body: contentJson(CloseIssueRequest),
        },
        responses: {
            "200": {
                description: "Closed issue",
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
            .select({ id: issues.id })
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

        await db
            .update(issues)
            .set({
                status: body.status,
                closedAt: sql`(unixepoch())` as unknown as Date,
                updatedAt: sql`(unixepoch())` as unknown as Date,
            })
            .where(eq(issues.id, existing.id));

        await auditFromContext(context, "update", "issue", existing.id, {
            status: body.status,
            closed: true,
        });

        const hydrated = await hydrateIssues(db, [existing.id]);
        const data = hydrated.get(existing.id);
        if (!data) {
            return context.json({ error: "internal_error" }, 500);
        }

        return context.json({ data }, 200);
    }
}
