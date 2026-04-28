import { inArray, eq, and } from "drizzle-orm";
import type { Database } from "@worker/db/client";
import {
    issues,
    users,
    initiatives,
    labels,
    issueLabels,
    comments,
    attachments,
} from "@worker/db/schema";

export interface HydratedIssueRow {
    id: string;
    number: number;
    title: string;
    body: string;
    status: string;
    priority: string;
    sort_order: number;
    created_at: number;
    updated_at: number;
    closed_at: number | null;
    initiative: {
        id: string;
        name: string;
        slug: string;
        color: string;
        archived: boolean;
    } | null;
    assignee: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    } | null;
    author: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
    labels: {
        id: string;
        name: string;
        color: string;
        created_at: number;
    }[];
    comment_count: number;
    attachments: {
        id: string;
        filename: string;
        content_type: string;
        size_bytes: number;
        url: string;
        uploader_id: string;
        created_at: number;
    }[];
}

function userRefOrNull(
    row: { id: string | null; name: string | null; email: string | null; image: string | null },
): HydratedIssueRow["assignee"] {
    if (!row.id) return null;
    return {
        id: row.id,
        name: row.name ?? "",
        email: row.email ?? "",
        image: row.image ?? null,
    };
}

function toEpoch(value: Date | number | null): number | null {
    if (value === null) return null;
    if (value instanceof Date) return Math.floor(value.getTime() / 1000);
    return value;
}

export async function hydrateIssues(
    db: Database,
    issueIds: string[],
): Promise<Map<string, HydratedIssueRow>> {
    if (issueIds.length === 0) return new Map();

    const assigneeUsers = users;
    const authorUsers = users;

    const rows = await db
        .select({
            issue: issues,
            initiative: initiatives,
            assignee: {
                id: assigneeUsers.id,
                name: assigneeUsers.name,
                email: assigneeUsers.email,
                image: assigneeUsers.image,
            },
        })
        .from(issues)
        .leftJoin(initiatives, eq(issues.initiativeId, initiatives.id))
        .leftJoin(assigneeUsers, eq(issues.assigneeId, assigneeUsers.id))
        .where(inArray(issues.id, issueIds));

    // Authors fetched separately to avoid alias collisions.
    const authorRows = await db
        .select({
            issueId: issues.id,
            id: authorUsers.id,
            name: authorUsers.name,
            email: authorUsers.email,
            image: authorUsers.image,
        })
        .from(issues)
        .innerJoin(authorUsers, eq(issues.authorId, authorUsers.id))
        .where(inArray(issues.id, issueIds));

    const authorMap = new Map<string, HydratedIssueRow["author"]>();
    for (const row of authorRows) {
        authorMap.set(row.issueId, {
            id: row.id,
            name: row.name,
            email: row.email,
            image: row.image ?? null,
        });
    }

    const labelRows = await db
        .select({
            issueId: issueLabels.issueId,
            id: labels.id,
            name: labels.name,
            color: labels.color,
            createdAt: labels.createdAt,
        })
        .from(issueLabels)
        .innerJoin(labels, eq(issueLabels.labelId, labels.id))
        .where(inArray(issueLabels.issueId, issueIds));

    const labelMap = new Map<string, HydratedIssueRow["labels"]>();
    for (const row of labelRows) {
        const entry = labelMap.get(row.issueId) ?? [];
        entry.push({
            id: row.id,
            name: row.name,
            color: row.color,
            created_at: toEpoch(row.createdAt) ?? 0,
        });
        labelMap.set(row.issueId, entry);
    }

    const commentCountRows = await db
        .select({ issueId: comments.issueId, id: comments.id })
        .from(comments)
        .where(inArray(comments.issueId, issueIds));

    const commentCountMap = new Map<string, number>();
    for (const row of commentCountRows) {
        commentCountMap.set(
            row.issueId,
            (commentCountMap.get(row.issueId) ?? 0) + 1,
        );
    }

    const attachmentRows = await db
        .select()
        .from(attachments)
        .where(inArray(attachments.issueId, issueIds));

    const attachmentMap = new Map<string, HydratedIssueRow["attachments"]>();
    for (const row of attachmentRows) {
        if (!row.issueId) continue;
        const entry = attachmentMap.get(row.issueId) ?? [];
        entry.push({
            id: row.id,
            filename: row.filename,
            content_type: row.contentType,
            size_bytes: row.sizeBytes,
            url: `/api/attachments/${row.id}`,
            uploader_id: row.uploaderId,
            created_at: toEpoch(row.createdAt) ?? 0,
        });
        attachmentMap.set(row.issueId, entry);
    }

    const hydrated = new Map<string, HydratedIssueRow>();
    for (const { issue, initiative, assignee } of rows) {
        const author = authorMap.get(issue.id);
        if (!author) continue;
        hydrated.set(issue.id, {
            id: issue.id,
            number: issue.number,
            title: issue.title,
            body: issue.body,
            status: issue.status,
            priority: issue.priority,
            sort_order: issue.sortOrder,
            created_at: toEpoch(issue.createdAt) ?? 0,
            updated_at: toEpoch(issue.updatedAt) ?? 0,
            closed_at: toEpoch(issue.closedAt),
            initiative: initiative
                ? {
                      id: initiative.id,
                      name: initiative.name,
                      slug: initiative.slug,
                      color: initiative.color,
                      archived: initiative.archivedAt !== null,
                  }
                : null,
            assignee: userRefOrNull({
                id: assignee?.id ?? null,
                name: assignee?.name ?? null,
                email: assignee?.email ?? null,
                image: assignee?.image ?? null,
            }),
            author,
            labels: labelMap.get(issue.id) ?? [],
            comment_count: commentCountMap.get(issue.id) ?? 0,
            attachments: attachmentMap.get(issue.id) ?? [],
        });
    }

    return hydrated;
}
