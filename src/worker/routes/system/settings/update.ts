import { contentJson } from "chanfana";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { systemSettings } from "@worker/db/schema";
import {
    updateSystemSettingsSchema,
    systemSettingsResponseSchema,
} from "@worker/schemas/system";
import type { AppContext } from "@worker/types";

export class UpdateSystemSettingsEndpoint extends BaseEndpoint {
    schema = {
        operationId: "updateSystemSettings",
        tags: ["System"],
        security: [{ session: [] }],
        request: {
            body: contentJson(updateSystemSettingsSchema),
        },
        responses: {
            "200": {
                description: "Updated system settings",
                ...contentJson(z.object({ data: systemSettingsResponseSchema })),
            },
        },
    };

    async handle(context: AppContext) {
        const isGlobalAdmin = context.get("isGlobalAdmin");
        if (!isGlobalAdmin) {
            return context.json({ error: "Forbidden" }, 403);
        }

        const { body } = await this.getValidatedData<typeof this.schema>();
        const db = this.getDb(context);

        if (body.signups_enabled !== undefined) {
            await db
                .insert(systemSettings)
                .values({
                    key: "signups_enabled",
                    value: String(body.signups_enabled),
                    updatedAt: sql`(unixepoch())` as unknown as Date,
                })
                .onConflictDoUpdate({
                    target: systemSettings.key,
                    set: {
                        value: String(body.signups_enabled),
                        updatedAt: sql`(unixepoch())` as unknown as Date,
                    },
                });
        }

        return context.json({
            data: {
                signups_enabled: body.signups_enabled ?? true,
            },
        });
    }
}
