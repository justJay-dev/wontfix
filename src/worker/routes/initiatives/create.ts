import { contentJson } from "chanfana";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { initiatives } from "@worker/db/schema";
import {
    CreateInitiativeRequest,
    InitiativeSchema,
} from "@worker/schemas/wontfix";
import type { AppContext } from "@worker/types";

export class CreateInitiativeEndpoint extends BaseEndpoint {
    schema = {
        operationId: "createInitiative",
        tags: ["Initiatives"],
        security: [{ session: [] }],
        request: {
            body: contentJson(CreateInitiativeRequest),
        },
        responses: {
            "201": {
                description: "Created initiative",
                ...contentJson(z.object({ data: InitiativeSchema })),
            },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const organizationId = context.get("organizationId");
        const { body } = await this.getValidatedData<typeof this.schema>();

        const [conflict] = await db
            .select({ id: initiatives.id })
            .from(initiatives)
            .where(
                and(
                    eq(initiatives.organizationId, organizationId),
                    eq(initiatives.slug, body.slug),
                ),
            )
            .limit(1);

        if (conflict) {
            return context.json({ error: "slug_conflict" }, 409);
        }

        const id = nanoid();
        await db.insert(initiatives).values({
            id,
            organizationId,
            name: body.name,
            slug: body.slug,
            description: body.description,
            color: body.color,
        });

        const [created] = await db
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
            .where(eq(initiatives.id, id));

        return context.json({ data: created }, 201);
    }
}
