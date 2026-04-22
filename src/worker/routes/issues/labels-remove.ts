import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { issues, issueLabels } from "@worker/db/schema";
import type { AppContext } from "@worker/types";

export class RemoveIssueLabelEndpoint extends BaseEndpoint {
    schema = {
        operationId: "removeIssueLabel",
        tags: ["Issues"],
        security: [{ session: [] }],
        request: {
            params: z.object({
                number: z.string(),
                labelId: z.string(),
            }),
        },
        responses: {
            "204": { description: "Label removed" },
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

        await db
            .delete(issueLabels)
            .where(
                and(
                    eq(issueLabels.issueId, issue.id),
                    eq(issueLabels.labelId, params.labelId),
                ),
            );

        return context.body(null, 204);
    }
}
