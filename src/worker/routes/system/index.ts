import { fromHono } from "chanfana";
import { Hono } from "hono";
import { resolveAuth } from "@worker/middleware/permissions";
import type { AppEnv } from "@worker/types";
import { ListSystemUsersEndpoint } from "./users/list";
import { CreateSystemUserEndpoint } from "./users/create";
import { UpdateSystemUserEndpoint } from "./users/update";
import { GetSystemSettingsEndpoint } from "./settings/get";
import { UpdateSystemSettingsEndpoint } from "./settings/update";

const app = new Hono<AppEnv>();
app.use("*", resolveAuth);

const openapi = fromHono(app);

openapi.get("/users", ListSystemUsersEndpoint);
openapi.post("/users", CreateSystemUserEndpoint);
openapi.patch("/users/:id", UpdateSystemUserEndpoint);

openapi.get("/settings", GetSystemSettingsEndpoint);
openapi.patch("/settings", UpdateSystemSettingsEndpoint);

export { openapi as systemRoutes };
