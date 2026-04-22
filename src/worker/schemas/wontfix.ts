import { z } from "zod";
import { ISSUE_STATUSES, ISSUE_PRIORITIES } from "@worker/db/schema";

export const StatusEnum = z.enum(ISSUE_STATUSES);
export const PriorityEnum = z.enum(ISSUE_PRIORITIES);

// Canonical pagination envelope — every paginated list endpoint wraps
// its rows with `{ data, pagination }`.
export const paginationSchema = z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
});

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 100;

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "invalid_hex_color");
const slug = z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "invalid_slug");

// ----- Initiatives -----

export const InitiativeSchema = z.object({
    id: z.string(),
    organization_id: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string(),
    color: z.string(),
    is_public: z.boolean(),
    archived_at: z.number().nullable(),
    created_at: z.number(),
    updated_at: z.number(),
});

export const CreateInitiativeRequest = z.object({
    name: z.string().min(1).max(120),
    slug,
    description: z.string().default(""),
    color: hexColor.default("#6b7280"),
});

export const UpdateInitiativeRequest = z.object({
    name: z.string().min(1).max(120).optional(),
    slug: slug.optional(),
    description: z.string().optional(),
    color: hexColor.optional(),
    is_public: z.boolean().optional(),
});

// ----- Attachments -----

export const AttachmentSchema = z.object({
    id: z.string(),
    filename: z.string(),
    content_type: z.string(),
    size_bytes: z.number(),
    url: z.string(),
    uploader_id: z.string(),
    created_at: z.number(),
});

// ----- Labels -----

export const LabelSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    created_at: z.number(),
});

export const CreateLabelRequest = z.object({
    name: z.string().min(1).max(32),
    color: hexColor.default("#6b7280"),
});

export const UpdateLabelRequest = z.object({
    name: z.string().min(1).max(32).optional(),
    color: hexColor.optional(),
});

// ----- Issues -----

export const IssueUserRef = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullable(),
});

export const IssueInitiativeRef = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    color: z.string(),
    archived: z.boolean(),
});

export const IssueSummarySchema = z.object({
    id: z.string(),
    number: z.number(),
    title: z.string(),
    status: StatusEnum,
    priority: PriorityEnum,
    initiative: IssueInitiativeRef.nullable(),
    assignee: IssueUserRef.nullable(),
    author: IssueUserRef,
    labels: z.array(LabelSchema),
    comment_count: z.number(),
    created_at: z.number(),
    updated_at: z.number(),
    closed_at: z.number().nullable(),
});

export const IssueSchema = IssueSummarySchema.extend({
    body: z.string(),
    attachments: z.array(AttachmentSchema),
});

export const CreateIssueRequest = z.object({
    title: z.string().min(1).max(200),
    body: z.string().max(50_000).default(""),
    initiative_id: z.string().nullable().optional(),
    priority: PriorityEnum.optional(),
    assignee_id: z.string().nullable().optional(),
    attachment_ids: z.array(z.string()).default([]),
});

export const UpdateIssueRequest = z.object({
    title: z.string().min(1).max(200).optional(),
    body: z.string().max(50_000).optional(),
    initiative_id: z.string().nullable().optional(),
    priority: PriorityEnum.optional(),
    status: StatusEnum.optional(),
    assignee_id: z.string().nullable().optional(),
    attachment_ids: z.array(z.string()).optional(),
});

export const CloseIssueRequest = z.object({
    status: z.enum(["done", "wont_fix"]),
});

// ----- Comments -----

export const CommentSchema = z.object({
    id: z.string(),
    issue_id: z.string(),
    author: IssueUserRef,
    body: z.string(),
    attachments: z.array(AttachmentSchema),
    created_at: z.number(),
    updated_at: z.number(),
});

export const CreateCommentRequest = z.object({
    body: z.string().min(1).max(50_000),
    attachment_ids: z.array(z.string()).default([]),
});

export const UpdateCommentRequest = z.object({
    body: z.string().min(1).max(50_000),
    attachment_ids: z.array(z.string()).optional(),
});
