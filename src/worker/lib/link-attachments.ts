import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Database } from "@worker/db/client";
import { attachments } from "@worker/db/schema";

interface LinkOptions {
    db: Database;
    organizationId: string;
    attachmentIds: string[];
    target: { issueId?: string; commentId?: string };
}

// Links orphan attachments to an issue or comment. Rejects ids that
// don't exist, belong to another org, or are already linked.
export async function linkAttachmentsToTarget({
    db,
    organizationId,
    attachmentIds,
    target,
}: LinkOptions): Promise<"ok" | "invalid_attachment"> {
    if (attachmentIds.length === 0) return "ok";

    const rows = await db
        .select({
            id: attachments.id,
            organizationId: attachments.organizationId,
            issueId: attachments.issueId,
            commentId: attachments.commentId,
        })
        .from(attachments)
        .where(inArray(attachments.id, attachmentIds));

    if (rows.length !== attachmentIds.length) return "invalid_attachment";

    for (const row of rows) {
        if (row.organizationId !== organizationId) return "invalid_attachment";
        if (row.issueId !== null || row.commentId !== null) {
            return "invalid_attachment";
        }
    }

    const updates: { issueId?: string; commentId?: string } = {};
    if (target.issueId) updates.issueId = target.issueId;
    if (target.commentId) updates.commentId = target.commentId;

    await db
        .update(attachments)
        .set(updates)
        .where(
            and(
                inArray(attachments.id, attachmentIds),
                eq(attachments.organizationId, organizationId),
                isNull(attachments.issueId),
                isNull(attachments.commentId),
            ),
        );

    return "ok";
}
