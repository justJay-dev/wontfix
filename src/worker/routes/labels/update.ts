import { contentJson } from "chanfana";
import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { labels } from "@worker/db/schema";
import { UpdateLabelRequest, LabelSchema } from "@worker/schemas/wontfix";
import { auditFromContext } from "@worker/lib/audit";
import type { AppContext } from "@worker/types";

export class UpdateLabelEndpoint extends BaseEndpoint {
    schema = {
        operationId: "updateLabel",
        tags: ["Labels"],
        security: [{ session: [] }],
        request: {
            params: z.object({ id: z.string() }),
            body: contentJson(UpdateLabelRequest),
        },
        responses: {
            "200": {
                description: "Updated label",
                ...contentJson(z.object({ data: LabelSchema })),
            },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const organizationId = context.get("organizationId");
        const { params, body } =
            await this.getValidatedData<typeof this.schema>();

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

        if (body.name !== undefined) {
            const [conflict] = await db
                .select({ id: labels.id })
                .from(labels)
                .where(
                    and(
                        eq(labels.organizationId, organizationId),
                        eq(labels.name, body.name),
                        ne(labels.id, params.id),
                    ),
                )
                .limit(1);
            if (conflict) {
                return context.json({ error: "conflict" }, 409);
            }
        }

        const updates: Record<string, unknown> = {};
        if (body.name !== undefined) updates.name = body.name;
        if (body.color !== undefined) updates.color = body.color;

        if (Object.keys(updates).length > 0) {
            await db.update(labels).set(updates).where(eq(labels.id, params.id));
            await auditFromContext(context, "update", "label", params.id, body);
        }

        const [row] = await db
            .select({
                id: labels.id,
                name: labels.name,
                color: labels.color,
                created_at: labels.createdAt,
            })
            .from(labels)
            .where(eq(labels.id, params.id));

        return context.json({ data: row }, 200);
    }
}
