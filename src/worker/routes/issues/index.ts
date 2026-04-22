import { fromHono } from "chanfana";
import { Hono } from "hono";
import { resolveAuth, requireActiveOrg } from "@worker/middleware/permissions";
import type { AppEnv } from "@worker/types";
import { ListIssuesEndpoint } from "./list";
import { CreateIssueEndpoint } from "./create";
import { GetIssueEndpoint } from "./get";
import { UpdateIssueEndpoint } from "./update";
import { CloseIssueEndpoint } from "./close";
import { AddIssueLabelEndpoint } from "./labels-add";
import { RemoveIssueLabelEndpoint } from "./labels-remove";
import { ListIssueCommentsEndpoint } from "@worker/routes/comments/list";
import { CreateIssueCommentEndpoint } from "@worker/routes/comments/create";

const app = new Hono<AppEnv>();
app.use("*", resolveAuth);
app.use("*", requireActiveOrg);

const openapi = fromHono(app);

openapi.get("/", ListIssuesEndpoint);
openapi.post("/", CreateIssueEndpoint);
openapi.get("/:number", GetIssueEndpoint);
openapi.patch("/:number", UpdateIssueEndpoint);
openapi.post("/:number/close", CloseIssueEndpoint);
openapi.post("/:number/labels", AddIssueLabelEndpoint);
openapi.delete("/:number/labels/:labelId", RemoveIssueLabelEndpoint);
openapi.get("/:number/comments", ListIssueCommentsEndpoint);
openapi.post("/:number/comments", CreateIssueCommentEndpoint);

export { openapi as issueRoutes };
