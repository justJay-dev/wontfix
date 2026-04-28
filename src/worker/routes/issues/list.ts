import { contentJson } from "chanfana";
import { z } from "zod";
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import {
    issues,
    issueLabels,
    initiatives,
} from "@worker/db/schema";
import {
    IssueSummarySchema,
    StatusEnum,
    PriorityEnum,
    paginationSchema,
    DEFAULT_PAGE_LIMIT,
    MAX_PAGE_LIMIT,
} from "@worker/schemas/wontfix";
import { hydrateIssues } from "@worker/lib/issue-hydrate";
import type { AppContext } from "@worker/types";

function emptyPagination(page: number, limit: number) {
    return { page, limit, total: 0, totalPages: 1 };
}

export class ListIssuesEndpoint extends BaseEndpoint {
    schema = {
        operationId: "listIssues",
        tags: ["Issues"],
        security: [{ session: [] }],
        request: {
            query: z.object({
                status: StatusEnum.optional(),
                priority: PriorityEnum.optional(),
                initiative_slug: z.string().optional(),
                assignee_id: z.string().optional(),
                label_id: z.string().optional(),
                q: z.string().optional(),
                page: z.string().optional(),
                limit: z.string().optional(),
            }),
        },
        responses: {
            "200": {
                description: "Filtered issue list",
                ...contentJson(
                    z.object({
                        data: z.array(IssueSummarySchema),
                        pagination: paginationSchema,
                    }),
                ),
            },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const organizationId = context.get("organizationId");
        const { query } = await this.getValidatedData<typeof this.schema>();

        const page = Math.max(Number(query.page ?? 1) || 1, 1);
        const limit = Math.min(
            Math.max(Number(query.limit ?? DEFAULT_PAGE_LIMIT) || DEFAULT_PAGE_LIMIT, 1),
            MAX_PAGE_LIMIT,
        );
        const offset = (page - 1) * limit;

        const conditions = [eq(issues.organizationId, organizationId)];
        if (query.status) conditions.push(eq(issues.status, query.status));
        if (query.priority)
            conditions.push(eq(issues.priority, query.priority));
        if (query.assignee_id)
            conditions.push(eq(issues.assigneeId, query.assignee_id));
        if (query.q) {
            const pattern = `%${query.q}%`;
            conditions.push(
                or(
                    like(issues.title, pattern),
                    like(issues.body, pattern),
                )!,
            );
        }

        if (query.initiative_slug) {
            const [initiative] = await db
                .select({ id: initiatives.id })
                .from(initiatives)
                .where(
                    and(
                        eq(initiatives.organizationId, organizationId),
                        eq(initiatives.slug, query.initiative_slug),
                    ),
                )
                .limit(1);
            if (!initiative) {
                return context.json(
                    { data: [], pagination: emptyPagination(page, limit) },
                    200,
                );
            }
            conditions.push(eq(issues.initiativeId, initiative.id));
        }

        let idRows: { id: string }[];
        let countRows: { count: number }[];
        if (query.label_id) {
            idRows = await db
                .select({ id: issues.id })
                .from(issues)
                .innerJoin(
                    issueLabels,
                    eq(issueLabels.issueId, issues.id),
                )
                .where(and(...conditions, eq(issueLabels.labelId, query.label_id)))
                .orderBy(asc(issues.sortOrder), desc(issues.createdAt))
                .limit(limit)
                .offset(offset);
            countRows = await db
                .select({ count: sql<number>`count(*)` })
                .from(issues)
                .innerJoin(
                    issueLabels,
                    eq(issueLabels.issueId, issues.id),
                )
                .where(and(...conditions, eq(issueLabels.labelId, query.label_id)));
        } else {
            idRows = await db
                .select({ id: issues.id })
                .from(issues)
                .where(and(...conditions))
                .orderBy(asc(issues.sortOrder), desc(issues.createdAt))
                .limit(limit)
                .offset(offset);
            countRows = await db
                .select({ count: sql<number>`count(*)` })
                .from(issues)
                .where(and(...conditions));
        }

        const total = Number(countRows[0]?.count ?? 0);
        const totalPages = Math.max(1, Math.ceil(total / limit));

        const hydrated = await hydrateIssues(
            db,
            idRows.map((row) => row.id),
        );

        const data = idRows
            .map((row) => hydrated.get(row.id))
            .filter((row): row is NonNullable<typeof row> => row !== undefined)
            .map((row) => {
                const { body: _body, attachments: _atts, ...summary } = row;
                return summary;
            });

        return context.json(
            {
                data,
                pagination: { page, limit, total, totalPages },
            },
            200,
        );
    }
}
