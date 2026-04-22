import { fromHono } from "chanfana";
import { Hono } from "hono";
import { resolveAuth, requireActiveOrg } from "@worker/middleware/permissions";
import type { AppEnv } from "@worker/types";
import { ListLabelsEndpoint } from "./list";
import { CreateLabelEndpoint } from "./create";
import { UpdateLabelEndpoint } from "./update";
import { DeleteLabelEndpoint } from "./delete";

const app = new Hono<AppEnv>();
app.use("*", resolveAuth);
app.use("*", requireActiveOrg);

const openapi = fromHono(app);

openapi.get("/", ListLabelsEndpoint);
openapi.post("/", CreateLabelEndpoint);
openapi.patch("/:id", UpdateLabelEndpoint);
openapi.delete("/:id", DeleteLabelEndpoint);

export { openapi as labelRoutes };
