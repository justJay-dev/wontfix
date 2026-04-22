import { contentJson } from "chanfana";
import { z } from "zod";
import { and, eq, ne, sql } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { initiatives } from "@worker/db/schema";
import {
    UpdateInitiativeRequest,
    InitiativeSchema,
} from "@worker/schemas/wontfix";
import { auditFromContext } from "@worker/lib/audit";
import type { AppContext } from "@worker/types";

export class UpdateInitiativeEndpoint extends BaseEndpoint {
    schema = {
        operationId: "updateInitiative",
        tags: ["Initiatives"],
        security: [{ session: [] }],
        request: {
            params: z.object({ slug: z.string() }),
            body: contentJson(UpdateInitiativeRequest),
        },
        responses: {
            "200": {
                description: "Updated initiative",
                ...contentJson(z.object({ data: InitiativeSchema })),
            },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const organizationId = context.get("organizationId");
        const { params, body } =
            await this.getValidatedData<typeof this.schema>();

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

        if (body.slug !== undefined && body.slug !== params.slug) {
            const [conflict] = await db
                .select({ id: initiatives.id })
                .from(initiatives)
                .where(
                    and(
                        eq(initiatives.organizationId, organizationId),
                        eq(initiatives.slug, body.slug),
                        ne(initiatives.id, existing.id),
                    ),
                )
                .limit(1);
            if (conflict) {
                return context.json({ error: "slug_conflict" }, 409);
            }
        }

        const updates: Record<string, unknown> = {
            updatedAt: sql`(unixepoch())`,
        };
        if (body.name !== undefined) updates.name = body.name;
        if (body.slug !== undefined) updates.slug = body.slug;
        if (body.description !== undefined)
            updates.description = body.description;
        if (body.color !== undefined) updates.color = body.color;
        if (body.is_public !== undefined) updates.isPublic = body.is_public;

        await db
            .update(initiatives)
            .set(updates)
            .where(eq(initiatives.id, existing.id));

        await auditFromContext(
            context,
            "update",
            "initiative",
            existing.id,
            body,
        );

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
