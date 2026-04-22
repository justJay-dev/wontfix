import { z } from "zod";
import { eq } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { comments, issues } from "@worker/db/schema";
import { auditFromContext } from "@worker/lib/audit";
import type { AppContext } from "@worker/types";

export class DeleteCommentEndpoint extends BaseEndpoint {
    schema = {
        operationId: "deleteComment",
        tags: ["Comments"],
        security: [{ session: [] }],
        request: {
            params: z.object({ id: z.string() }),
        },
        responses: {
            "204": { description: "Deleted" },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const organizationId = context.get("organizationId");
        const user = context.get("user") as { id: string };
        const role = context.get("memberRole");
        const { params } = await this.getValidatedData<typeof this.schema>();

        const [existing] = await db
            .select({
                id: comments.id,
                authorId: comments.authorId,
                issueOrg: issues.organizationId,
            })
            .from(comments)
            .innerJoin(issues, eq(comments.issueId, issues.id))
            .where(eq(comments.id, params.id))
            .limit(1);

        if (!existing || existing.issueOrg !== organizationId) {
            return context.json({ error: "not_found" }, 404);
        }

        const isOwner = existing.authorId === user.id;
        const isOrgAdmin = role === "owner" || role === "admin";
        if (!isOwner && !isOrgAdmin) {
            return context.json({ error: "forbidden" }, 403);
        }

        await db.delete(comments).where(eq(comments.id, params.id));
        await auditFromContext(context, "delete", "comment", params.id, {});
        return context.body(null, 204);
    }
}
