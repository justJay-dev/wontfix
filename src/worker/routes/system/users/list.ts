import { contentJson } from "chanfana";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { users } from "@worker/db/schema";
import { systemUserResponseSchema } from "@worker/schemas/system";
import type { AppContext } from "@worker/types";

export class ListSystemUsersEndpoint extends BaseEndpoint {
    schema = {
        operationId: "listSystemUsers",
        tags: ["System"],
        security: [{ session: [] }],
        responses: {
            "200": {
                description: "List of all users",
                ...contentJson(
                    z.object({ data: z.array(systemUserResponseSchema) }),
                ),
            },
        },
    };

    async handle(context: AppContext) {
        const isGlobalAdmin = context.get("isGlobalAdmin");
        const db = this.getDb(context);

        if (!isGlobalAdmin) {
            return context.json({ error: "Forbidden" }, 403);
        }

        const rows = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                emailVerified: users.emailVerified,
                banned: users.banned,
                ban_reason: users.banReason,
                created_at: users.createdAt,
                updated_at: users.updatedAt,
            })
            .from(users)
            .orderBy(desc(users.createdAt));

        return context.json({ data: rows }, 200);
    }
}
