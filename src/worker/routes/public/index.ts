import { fromHono } from "chanfana";
import { Hono } from "hono";
import type { AppEnv } from "@worker/types";
import { GetPublicInitiativeEndpoint } from "./initiative";
import {
    ListPublicInitiativeIssuesEndpoint,
    GetPublicIssueEndpoint,
} from "./issues";
import { ListPublicIssueCommentsEndpoint } from "./comments";

// Public routes — no session required. Every endpoint enforces the
// `is_public = true` check on the target initiative before returning.
const app = new Hono<AppEnv>();
const openapi = fromHono(app);

openapi.get(
    "/orgs/:orgSlug/initiatives/:slug",
    GetPublicInitiativeEndpoint,
);
openapi.get(
    "/orgs/:orgSlug/initiatives/:slug/issues",
    ListPublicInitiativeIssuesEndpoint,
);
openapi.get(
    "/orgs/:orgSlug/initiatives/:slug/issues/:number",
    GetPublicIssueEndpoint,
);
openapi.get(
    "/orgs/:orgSlug/initiatives/:slug/issues/:number/comments",
    ListPublicIssueCommentsEndpoint,
);

export { openapi as publicRoutes };
