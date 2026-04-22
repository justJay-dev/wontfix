import { fromHono } from "chanfana";
import { Hono } from "hono";
import { resolveAuth, requireActiveOrg } from "@worker/middleware/permissions";
import type { AppEnv } from "@worker/types";
import { UpdateCommentEndpoint } from "./update";
import { DeleteCommentEndpoint } from "./delete";

const app = new Hono<AppEnv>();
app.use("*", resolveAuth);
app.use("*", requireActiveOrg);

const openapi = fromHono(app);

openapi.patch("/:id", UpdateCommentEndpoint);
openapi.delete("/:id", DeleteCommentEndpoint);

export { openapi as commentRoutes };
