import { sql } from "drizzle-orm";
import {
    index,
    integer,
    primaryKey,
    sqliteTable,
    text,
    uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Better Auth required tables
export const users = sqliteTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" })
        .notNull()
        .default(false),
    image: text("image"),
    role: text("role").notNull().default("user"),
    banned: integer("banned", { mode: "boolean" }).notNull().default(false),
    banReason: text("ban_reason"),
    banExpires: integer("ban_expires", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

export const sessions = sqliteTable("session", {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    impersonatedBy: text("impersonated_by"),
    activeOrganizationId: text("active_organization_id"),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = sqliteTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
        mode: "timestamp",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
        mode: "timestamp",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

export const verifications = sqliteTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).default(
        sql`(unixepoch())`,
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(
        sql`(unixepoch())`,
    ),
});

// --- Multi-tenancy ---

export const organizations = sqliteTable("organization", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

export const members = sqliteTable("member", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

export const invitations = sqliteTable("invitation", {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    inviterId: text("inviter_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
        .notNull()
        .references(() => organizations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    status: text("status").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

// --- Audit log ---

export const auditLog = sqliteTable("audit_log", {
    id: text("id").primaryKey(),
    orgId: text("org_id").references(() => organizations.id),
    userId: text("user_id").notNull(),
    action: text("action").notNull(), // 'create' | 'update' | 'delete'
    tableName: text("table_name").notNull(),
    recordId: text("record_id").notNull(),
    changes: text("changes").notNull(), // JSON stringified diff
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(unixepoch())`),
});

// --- WONT FIX issue tracker ---

export const ISSUE_STATUSES = [
    "new",
    "todo",
    "doing",
    "done",
    "wont_fix",
] as const;

export const ISSUE_PRIORITIES = [
    "lol",
    "meh",
    "spicy",
    "on_fire",
    "prod_is_down",
    "an_executive_is_pissed",
] as const;

export const initiatives = sqliteTable(
    "initiative",
    {
        id: text("id").primaryKey(),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        slug: text("slug").notNull(),
        description: text("description").notNull().default(""),
        color: text("color").notNull().default("#6b7280"),
        isPublic: integer("is_public", { mode: "boolean" })
            .notNull()
            .default(false),
        archivedAt: integer("archived_at", { mode: "timestamp" }),
        createdAt: integer("created_at", { mode: "timestamp" })
            .notNull()
            .default(sql`(unixepoch())`),
        updatedAt: integer("updated_at", { mode: "timestamp" })
            .notNull()
            .default(sql`(unixepoch())`),
    },
    (table) => ({
        orgSlugUnique: uniqueIndex("initiative_org_slug_idx").on(
            table.organizationId,
            table.slug,
        ),
        orgIdx: index("initiative_org_idx").on(table.organizationId),
    }),
);

export const issues = sqliteTable(
    "issue",
    {
        id: text("id").primaryKey(),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        initiativeId: text("initiative_id").references(() => initiatives.id, {
            onDelete: "set null",
        }),
        // Per-org auto-incrementing issue number. Computed as
        // max(number) + 1 inside the create handler; safe under D1
        // single-writer semantics.
        number: integer("number").notNull(),
        title: text("title").notNull(),
        body: text("body").notNull().default(""),
        status: text("status", { enum: ISSUE_STATUSES })
            .notNull()
            .default("new"),
        priority: text("priority", { enum: ISSUE_PRIORITIES })
            .notNull()
            .default("meh"),
        authorId: text("author_id")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        assigneeId: text("assignee_id").references(() => users.id, {
            onDelete: "set null",
        }),
        closedAt: integer("closed_at", { mode: "timestamp" }),
        createdAt: integer("created_at", { mode: "timestamp" })
            .notNull()
            .default(sql`(unixepoch())`),
        updatedAt: integer("updated_at", { mode: "timestamp" })
            .notNull()
            .default(sql`(unixepoch())`),
    },
    (table) => ({
        orgNumberUnique: uniqueIndex("issue_org_number_idx").on(
            table.organizationId,
            table.number,
        ),
        orgStatusIdx: index("issue_org_status_idx").on(
            table.organizationId,
            table.status,
        ),
        orgInitiativeIdx: index("issue_org_initiative_idx").on(
            table.organizationId,
            table.initiativeId,
        ),
    }),
);

export const comments = sqliteTable(
    "comment",
    {
        id: text("id").primaryKey(),
        issueId: text("issue_id")
            .notNull()
            .references(() => issues.id, { onDelete: "cascade" }),
        authorId: text("author_id")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        body: text("body").notNull(),
        createdAt: integer("created_at", { mode: "timestamp" })
            .notNull()
            .default(sql`(unixepoch())`),
        updatedAt: integer("updated_at", { mode: "timestamp" })
            .notNull()
            .default(sql`(unixepoch())`),
    },
    (table) => ({
        issueCreatedIdx: index("comment_issue_created_idx").on(
            table.issueId,
            table.createdAt,
        ),
    }),
);

export const attachments = sqliteTable(
    "attachment",
    {
        id: text("id").primaryKey(),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        uploaderId: text("uploader_id")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        r2Key: text("r2_key").notNull(),
        filename: text("filename").notNull(),
        contentType: text("content_type").notNull(),
        sizeBytes: integer("size_bytes").notNull(),
        issueId: text("issue_id").references(() => issues.id, {
            onDelete: "cascade",
        }),
        commentId: text("comment_id").references(() => comments.id, {
            onDelete: "cascade",
        }),
        createdAt: integer("created_at", { mode: "timestamp" })
            .notNull()
            .default(sql`(unixepoch())`),
    },
    (table) => ({
        r2KeyUnique: uniqueIndex("attachment_r2_key_idx").on(table.r2Key),
        orgIdx: index("attachment_org_idx").on(table.organizationId),
    }),
);

export const labels = sqliteTable(
    "label",
    {
        id: text("id").primaryKey(),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        color: text("color").notNull().default("#6b7280"),
        createdAt: integer("created_at", { mode: "timestamp" })
            .notNull()
            .default(sql`(unixepoch())`),
    },
    (table) => ({
        orgNameUnique: uniqueIndex("label_org_name_idx").on(
            table.organizationId,
            table.name,
        ),
    }),
);

export const issueLabels = sqliteTable(
    "issue_label",
    {
        issueId: text("issue_id")
            .notNull()
            .references(() => issues.id, { onDelete: "cascade" }),
        labelId: text("label_id")
            .notNull()
            .references(() => labels.id, { onDelete: "cascade" }),
        createdAt: integer("created_at", { mode: "timestamp" })
            .notNull()
            .default(sql`(unixepoch())`),
    },
    (table) => ({
        pk: primaryKey({ columns: [table.issueId, table.labelId] }),
    }),
);
