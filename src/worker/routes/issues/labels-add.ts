import { contentJson } from "chanfana";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { issues, labels, issueLabels } from "@worker/db/schema";
import type { AppContext } from "@worker/types";

export class AddIssueLabelEndpoint extends BaseEndpoint {
    schema = {
        operationId: "addIssueLabel",
        tags: ["Issues"],
        security: [{ session: [] }],
        request: {
            params: z.object({ number: z.string() }),
            body: contentJson(z.object({ label_id: z.string() })),
        },
        responses: {
            "204": { description: "Label attached" },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const organizationId = context.get("organizationId");
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

        const [label] = await db
            .select({ id: labels.id })
            .from(labels)
            .where(
                and(
                    eq(labels.id, body.label_id),
                    eq(labels.organizationId, organizationId),
                ),
            )
            .limit(1);

        if (!label) {
            return context.json({ error: "invalid_label" }, 400);
        }

        await db
            .insert(issueLabels)
            .values({ issueId: issue.id, labelId: label.id })
            .onConflictDoNothing();

        return context.body(null, 204);
    }
}
