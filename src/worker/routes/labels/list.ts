import { contentJson } from "chanfana";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { labels } from "@worker/db/schema";
import { LabelSchema } from "@worker/schemas/wontfix";
import type { AppContext } from "@worker/types";

export class ListLabelsEndpoint extends BaseEndpoint {
    schema = {
        operationId: "listLabels",
        tags: ["Labels"],
        security: [{ session: [] }],
        responses: {
            "200": {
                description: "List of labels",
                ...contentJson(z.object({ data: z.array(LabelSchema) })),
            },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const organizationId = context.get("organizationId");

        const rows = await db
            .select({
                id: labels.id,
                name: labels.name,
                color: labels.color,
                created_at: labels.createdAt,
            })
            .from(labels)
            .where(eq(labels.organizationId, organizationId))
            .orderBy(asc(labels.name));

        return context.json({ data: rows }, 200);
    }
}
