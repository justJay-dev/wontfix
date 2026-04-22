import { contentJson } from "chanfana";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { issues } from "@worker/db/schema";
import { IssueSchema } from "@worker/schemas/wontfix";
import { hydrateIssues } from "@worker/lib/issue-hydrate";
import type { AppContext } from "@worker/types";

export class GetIssueEndpoint extends BaseEndpoint {
    schema = {
        operationId: "getIssue",
        tags: ["Issues"],
        security: [{ session: [] }],
        request: {
            params: z.object({ number: z.string() }),
        },
        responses: {
            "200": {
                description: "Issue detail",
                ...contentJson(z.object({ data: IssueSchema })),
            },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const organizationId = context.get("organizationId");
        const { params } = await this.getValidatedData<typeof this.schema>();

        const [row] = await db
            .select({ id: issues.id })
            .from(issues)
            .where(
                and(
                    eq(issues.organizationId, organizationId),
                    eq(issues.number, Number(params.number)),
                ),
            )
            .limit(1);

        if (!row) {
            return context.json({ error: "not_found" }, 404);
        }

        const hydrated = await hydrateIssues(db, [row.id]);
        const data = hydrated.get(row.id);
        if (!data) {
            return context.json({ error: "not_found" }, 404);
        }

        return context.json({ data }, 200);
    }
}
