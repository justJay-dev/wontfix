import { contentJson } from "chanfana";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { BaseEndpoint } from "@worker/lib/base-endpoint";
import { issues, initiatives, organizations } from "@worker/db/schema";
import {
    IssueSchema,
    IssueSummarySchema,
    paginationSchema,
    DEFAULT_PAGE_LIMIT,
    MAX_PAGE_LIMIT,
} from "@worker/schemas/wontfix";
import { hydrateIssues } from "@worker/lib/issue-hydrate";
import type { AppContext } from "@worker/types";
import type { Database } from "@worker/db/client";

async function resolvePublicInitiative(
    db: Database,
    orgSlug: string,
    initiativeSlug: string,
): Promise<{
    initiativeId: string;
    organizationId: string;
} | null> {
    const [row] = await db
        .select({
            initiativeId: initiatives.id,
            organizationId: initiatives.organizationId,
            isPublic: initiatives.isPublic,
        })
        .from(initiatives)
        .innerJoin(
            organizations,
            eq(organizations.id, initiatives.organizationId),
        )
        .where(
            and(
                eq(organizations.slug, orgSlug),
                eq(initiatives.slug, initiativeSlug),
                eq(initiatives.isPublic, true),
            ),
        )
        .limit(1);
    if (!row) return null;
    return {
        initiativeId: row.initiativeId,
        organizationId: row.organizationId,
    };
}

export class ListPublicInitiativeIssuesEndpoint extends BaseEndpoint {
    schema = {
        operationId: "listPublicInitiativeIssues",
        tags: ["Public"],
        request: {
            params: z.object({
                orgSlug: z.string(),
                slug: z.string(),
            }),
            query: z.object({
                page: z.string().optional(),
                limit: z.string().optional(),
            }),
        },
        responses: {
            "200": {
                description: "Paginated issue list for a public initiative",
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
        const { params, query } =
            await this.getValidatedData<typeof this.schema>();

        const resolved = await resolvePublicInitiative(
            db,
            params.orgSlug,
            params.slug,
        );
        if (!resolved) return context.json({ error: "not_found" }, 404);

        const page = Math.max(Number(query.page ?? 1) || 1, 1);
        const limit = Math.min(
            Math.max(
                Number(query.limit ?? DEFAULT_PAGE_LIMIT) ||
                    DEFAULT_PAGE_LIMIT,
                1,
            ),
            MAX_PAGE_LIMIT,
        );
        const offset = (page - 1) * limit;

        const where = and(
            eq(issues.organizationId, resolved.organizationId),
            eq(issues.initiativeId, resolved.initiativeId),
        );

        const idRows = await db
            .select({ id: issues.id })
            .from(issues)
            .where(where)
            .orderBy(desc(issues.createdAt))
            .limit(limit)
            .offset(offset);

        const [countRow] = await db
            .select({ count: sql<number>`count(*)` })
            .from(issues)
            .where(where);

        const total = Number(countRow?.count ?? 0);
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
            { data, pagination: { page, limit, total, totalPages } },
            200,
        );
    }
}

export class GetPublicIssueEndpoint extends BaseEndpoint {
    schema = {
        operationId: "getPublicIssue",
        tags: ["Public"],
        request: {
            params: z.object({
                orgSlug: z.string(),
                slug: z.string(),
                number: z.string(),
            }),
        },
        responses: {
            "200": {
                description: "Public issue",
                ...contentJson(z.object({ data: IssueSchema })),
            },
        },
    };

    async handle(context: AppContext) {
        const db = this.getDb(context);
        const { params } = await this.getValidatedData<typeof this.schema>();

        const resolved = await resolvePublicInitiative(
            db,
            params.orgSlug,
            params.slug,
        );
        if (!resolved) return context.json({ error: "not_found" }, 404);

        const [row] = await db
            .select({ id: issues.id })
            .from(issues)
            .where(
                and(
                    eq(issues.organizationId, resolved.organizationId),
                    eq(issues.initiativeId, resolved.initiativeId),
                    eq(issues.number, Number(params.number)),
                ),
            )
            .limit(1);

        if (!row) return context.json({ error: "not_found" }, 404);

        const hydrated = await hydrateIssues(db, [row.id]);
        const data = hydrated.get(row.id);
        if (!data) return context.json({ error: "not_found" }, 404);

        return context.json({ data }, 200);
    }
}
