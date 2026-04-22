import { contentJson } from "chanfana";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { labels } from "@worker/db/schema";
import { CreateLabelRequest, LabelSchema } from "@worker/schemas/wontfix";
import type { AppContext } from "@worker/types";

export class CreateLabelEndpoint extends BaseEndpoint {
    schema = {
        operationId: "createLabel",
        tags: ["Labels"],
        security: [{ session: [] }],
        request: {
            body: contentJson(CreateLabelRequest),
        },
        responses: {
            "201": {
                description: "Created label",
                ...contentJson(z.object({ data: LabelSchema })),
            },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const organizationId = context.get("organizationId");
        const { body } = await this.getValidatedData<typeof this.schema>();

        const [existing] = await db
            .select({ id: labels.id })
            .from(labels)
            .where(
                and(
                    eq(labels.organizationId, organizationId),
                    eq(labels.name, body.name),
                ),
            )
            .limit(1);

        if (existing) {
            return context.json({ error: "conflict" }, 409);
        }

        const id = nanoid();
        await db.insert(labels).values({
            id,
            organizationId,
            name: body.name,
            color: body.color,
        });

        const [created] = await db
            .select({
                id: labels.id,
                name: labels.name,
                color: labels.color,
                created_at: labels.createdAt,
            })
            .from(labels)
            .where(eq(labels.id, id));

        return context.json({ data: created }, 201);
    }
}
