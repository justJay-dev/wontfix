import { nanoid } from "nanoid";
import type { Database } from "@worker/db/client";
import { auditLog } from "@worker/db/schema";
import type { AppContext } from "@worker/types";

interface LogAuditOptions {
    db: Database;
    session: {
        activeOrganizationId?: string | null;
        impersonatedBy?: string | null;
    };
    user: { id: string };
    action: "create" | "update" | "delete";
    tableName: string;
    recordId: string;
    changes: Record<string, unknown>;
}

export async function logAudit({
    db,
    session,
    user,
    action,
    tableName,
    recordId,
    changes,
}: LogAuditOptions): Promise<void> {
    const payload = session.impersonatedBy
        ? { ...changes, _impersonatedBy: session.impersonatedBy }
        : changes;

    await db.insert(auditLog).values({
        id: nanoid(),
        orgId: session.activeOrganizationId ?? null,
        userId: user.id,
        action,
        tableName,
        recordId,
        changes: JSON.stringify(payload),
    });
}

// Pulls session + user off the Hono context. Call-sites become one-liners.
export async function auditFromContext(
    context: AppContext,
    action: "create" | "update" | "delete",
    tableName: string,
    recordId: string,
    changes: Record<string, unknown>,
): Promise<void> {
    await logAudit({
        db: context.get("db"),
        session: context.get("session") as {
            activeOrganizationId?: string | null;
            impersonatedBy?: string | null;
        },
        user: context.get("user") as { id: string },
        action,
        tableName,
        recordId,
        changes,
    });
}
