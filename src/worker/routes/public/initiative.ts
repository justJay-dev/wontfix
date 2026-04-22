import { contentJson } from "chanfana";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { initiatives, organizations } from "@worker/db/schema";
import { InitiativeSchema } from "@worker/schemas/wontfix";
import type { AppContext } from "@worker/types";

// Public read of an initiative (if the org + initiative allow it).
export class GetPublicInitiativeEndpoint extends BaseEndpoint {
    schema = {
        operationId: "getPublicInitiative",
        tags: ["Public"],
        request: {
            params: z.object({
                orgSlug: z.string(),
                slug: z.string(),
            }),
        },
        responses: {
            "200": {
                description: "Public initiative",
                ...contentJson(
                    z.object({
                        data: InitiativeSchema,
                        organization: z.object({
                            id: z.string(),
                            name: z.string(),
                            slug: z.string(),
                        }),
                    }),
                ),
            },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const { params } = await this.getValidatedData<typeof this.schema>();

        const [org] = await db
            .select({
                id: organizations.id,
                name: organizations.name,
                slug: organizations.slug,
            })
            .from(organizations)
            .where(eq(organizations.slug, params.orgSlug))
            .limit(1);
        if (!org) return context.json({ error: "not_found" }, 404);

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
                    eq(initiatives.organizationId, org.id),
                    eq(initiatives.slug, params.slug),
                    eq(initiatives.isPublic, true),
                ),
            )
            .limit(1);

        if (!row) return context.json({ error: "not_found" }, 404);
        return context.json({ data: row, organization: org }, 200);
    }
}
