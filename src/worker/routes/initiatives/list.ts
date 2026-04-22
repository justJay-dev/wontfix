import { contentJson } from "chanfana";
import { z } from "zod";
import { and, asc, eq, isNull } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { initiatives } from "@worker/db/schema";
import { InitiativeSchema } from "@worker/schemas/wontfix";
import type { AppContext } from "@worker/types";

export class ListInitiativesEndpoint extends BaseEndpoint {
    schema = {
        operationId: "listInitiatives",
        tags: ["Initiatives"],
        security: [{ session: [] }],
        request: {
            query: z.object({
                include_archived: z.enum(["true", "false"]).optional(),
            }),
        },
        responses: {
            "200": {
                description: "List of initiatives",
                ...contentJson(z.object({ data: z.array(InitiativeSchema) })),
            },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const organizationId = context.get("organizationId");
        const { query } = await this.getValidatedData<typeof this.schema>();

        const includeArchived = query.include_archived === "true";
        const whereClause = includeArchived
            ? eq(initiatives.organizationId, organizationId)
            : and(
                  eq(initiatives.organizationId, organizationId),
                  isNull(initiatives.archivedAt),
              );

        const rows = await db
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
            .where(whereClause)
            .orderBy(asc(initiatives.name));

        return context.json({ data: rows }, 200);
    }
}
