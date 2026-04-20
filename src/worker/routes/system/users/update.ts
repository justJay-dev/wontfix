import { contentJson } from "chanfana";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { users } from "@worker/db/schema";
import {
    updateSystemUserSchema,
    systemUserResponseSchema,
} from "@worker/schemas/system";
import type { AppContext } from "@worker/types";

export class UpdateSystemUserEndpoint extends BaseEndpoint {
    schema = {
        operationId: "updateSystemUser",
        tags: ["System"],
        security: [{ session: [] }],
        request: {
            params: z.object({ id: z.string() }),
            body: contentJson(updateSystemUserSchema),
        },
        responses: {
            "200": {
                description: "Updated user",
                ...contentJson(z.object({ data: systemUserResponseSchema })),
            },
        },
    };

    async handle(context: AppContext) {
        const isGlobalAdmin = context.get("isGlobalAdmin");
        const db = this.getDb(context);

        if (!isGlobalAdmin) {
            return context.json({ error: "Forbidden" }, 403);
        }

        const { params, body } =
            await this.getValidatedData<typeof this.schema>();

        const [existing] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.id, params.id));

        if (!existing) {
            return context.json({ error: "Not found" }, 404);
        }

        const updateValues: Record<string, unknown> = {
            updatedAt: sql`(unixepoch())`,
        };

        if (body.name !== undefined) updateValues.name = body.name;
        if (body.role !== undefined) updateValues.role = body.role;
        if (body.banned !== undefined) updateValues.banned = body.banned;
        if (body.ban_reason !== undefined)
            updateValues.banReason = body.ban_reason;

        const [updated] = await db
            .update(users)
            .set(updateValues)
            .where(eq(users.id, params.id))
            .returning({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                emailVerified: users.emailVerified,
                banned: users.banned,
                ban_reason: users.banReason,
                created_at: users.createdAt,
                updated_at: users.updatedAt,
            });

        return context.json({ data: updated }, 200);
    }
}
