import { contentJson } from "chanfana";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { initiatives } from "@worker/db/schema";
import { InitiativeSchema } from "@worker/schemas/wontfix";
import type { AppContext } from "@worker/types";

export class GetInitiativeEndpoint extends BaseEndpoint {
    schema = {
        operationId: "getInitiative",
        tags: ["Initiatives"],
        security: [{ session: [] }],
        request: {
            params: z.object({ slug: z.string() }),
        },
        responses: {
            "200": {
                description: "Initiative",
                ...contentJson(z.object({ data: InitiativeSchema })),
            },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const organizationId = context.get("organizationId");
        const { params } = await this.getValidatedData<typeof this.schema>();

        const [row] = await db
            .select({
                id: initiatives.id,
                organization_id: initiatives.organizationId,
                name: initiatives.name,
                slug: initiatives.slug,
                description: initiatives.description,
                color: initiatives.color,
                is_public: initiatives.isPublic,
                archived_at: initiatives.archivedAt,
                created_at: initiatives.createdAt,
                updated_at: initiatives.updatedAt,
            })
            .from(initiatives)
            .where(
                and(
                    eq(initiatives.organizationId, organizationId),
                    eq(initiatives.slug, params.slug),
                ),
            )
            .limit(1);

        if (!row) {
            return context.json({ error: "not_found" }, 404);
        }

        return context.json({ data: row }, 200);
    }
}
