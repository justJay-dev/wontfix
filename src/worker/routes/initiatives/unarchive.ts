import { contentJson } from "chanfana";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { initiatives } from "@worker/db/schema";
import { InitiativeSchema } from "@worker/schemas/wontfix";
import { auditFromContext } from "@worker/lib/audit";
import type { AppContext } from "@worker/types";

export class UnarchiveInitiativeEndpoint extends BaseEndpoint {
    schema = {
        operationId: "unarchiveInitiative",
        tags: ["Initiatives"],
        security: [{ session: [] }],
        request: {
            params: z.object({ slug: z.string() }),
        },
        responses: {
            "200": {
                description: "Unarchived initiative",
                ...contentJson(z.object({ data: InitiativeSchema })),
            },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const organizationId = context.get("organizationId");
        const { params } = await this.getValidatedData<typeof this.schema>();

        const [existing] = await db
            .select({ id: initiatives.id })
            .from(initiatives)
            .where(
                and(
                    eq(initiatives.organizationId, organizationId),
                    eq(initiatives.slug, params.slug),
                ),
            )
            .limit(1);

        if (!existing) {
            return context.json({ error: "not_found" }, 404);
        }

        await db
            .update(initiatives)
            .set({
                archivedAt: null,
                updatedAt: sql`(unixepoch())` as unknown as Date,
            })
            .where(eq(initiatives.id, existing.id));

        await auditFromContext(context, "update", "initiative", existing.id, {
            archived: false,
        });

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
            .where(eq(initiatives.id, existing.id));

        return context.json({ data: row }, 200);
    }
}
