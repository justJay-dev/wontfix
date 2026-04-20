import { contentJson } from "chanfana";
import { z } from "zod";
import { nanoid } from "nanoid";
import { sql } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { users, accounts } from "@worker/db/schema";
import {
    createSystemUserSchema,
    systemUserResponseSchema,
} from "@worker/schemas/system";
import { hashPassword } from "@worker/lib/password";
import type { AppContext } from "@worker/types";

export class CreateSystemUserEndpoint extends BaseEndpoint {
    schema = {
        operationId: "createSystemUser",
        tags: ["System"],
        security: [{ session: [] }],
        request: {
            body: contentJson(createSystemUserSchema),
        },
        responses: {
            "201": {
                description: "Created user",
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

        const { body } = await this.getValidatedData<typeof this.schema>();
        const userId = nanoid();
        const hashedPassword = await hashPassword(body.password);
        const now = sql`(unixepoch())`;

        const [created] = await db
            .insert(users)
            .values({
                id: userId,
                name: body.name,
                email: body.email,
                role: body.role,
                emailVerified: false,
                createdAt: now as unknown as Date,
                updatedAt: now as unknown as Date,
            })
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

        // Create credential account for email/password auth
        await db.insert(accounts).values({
            id: nanoid(),
            accountId: userId,
            providerId: "credential",
            userId,
            password: hashedPassword,
            createdAt: now as unknown as Date,
            updatedAt: now as unknown as Date,
        });

        return context.json({ data: created }, 201);
    }
}
