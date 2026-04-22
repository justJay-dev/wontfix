import { contentJson } from "chanfana";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { systemSettings } from "@worker/db/schema";
import { systemSettingsResponseSchema } from "@worker/schemas/system";
import type { AppContext } from "@worker/types";

export class GetSystemSettingsEndpoint extends BaseEndpoint {
    schema = {
        operationId: "getSystemSettings",
        tags: ["System"],
        security: [{ session: [] }],
        responses: {
            "200": {
                description: "Current system settings",
                ...contentJson(z.object({ data: systemSettingsResponseSchema })),
            },
        },
    };

    async handle(context: AppContext) {
        const isGlobalAdmin = context.get("isGlobalAdmin");
        if (!isGlobalAdmin) {
            return context.json({ error: "Forbidden" }, 403);
        }

        const db = this.getDb(context);
        const row = await db
            .select()
            .from(systemSettings)
            .where(eq(systemSettings.key, "signups_enabled"))
            .get();

        return context.json({
            data: {
                signups_enabled: row ? row.value === "true" : true,
            },
        });
    }
}
