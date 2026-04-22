import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { labels } from "@worker/db/schema";
import { auditFromContext } from "@worker/lib/audit";
import type { AppContext } from "@worker/types";

export class DeleteLabelEndpoint extends BaseEndpoint {
    schema = {
        operationId: "deleteLabel",
        tags: ["Labels"],
        security: [{ session: [] }],
        request: {
            params: z.object({ id: z.string() }),
        },
        responses: {
            "204": { description: "Deleted" },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const organizationId = context.get("organizationId");
        const { params } = await this.getValidatedData<typeof this.schema>();

        const [existing] = await db
            .select({ id: labels.id })
            .from(labels)
            .where(
                and(
                    eq(labels.id, params.id),
                    eq(labels.organizationId, organizationId),
                ),
            )
            .limit(1);

        if (!existing) {
            return context.json({ error: "not_found" }, 404);
        }

        await db.delete(labels).where(eq(labels.id, params.id));
        await auditFromContext(context, "delete", "label", params.id, {});
        return context.body(null, 204);
    }
}
