import { fromHono } from "chanfana";
import { Hono } from "hono";
import { resolveAuth, requireActiveOrg } from "@worker/middleware/permissions";
import type { AppEnv } from "@worker/types";
import { ListInitiativesEndpoint } from "./list";
import { CreateInitiativeEndpoint } from "./create";
import { GetInitiativeEndpoint } from "./get";
import { UpdateInitiativeEndpoint } from "./update";
import { ArchiveInitiativeEndpoint } from "./archive";
import { UnarchiveInitiativeEndpoint } from "./unarchive";

const app = new Hono<AppEnv>();
app.use("*", resolveAuth);
app.use("*", requireActiveOrg);

const openapi = fromHono(app);

openapi.get("/", ListInitiativesEndpoint);
openapi.post("/", CreateInitiativeEndpoint);
openapi.get("/:slug", GetInitiativeEndpoint);
openapi.patch("/:slug", UpdateInitiativeEndpoint);
openapi.post("/:slug/archive", ArchiveInitiativeEndpoint);
openapi.post("/:slug/unarchive", UnarchiveInitiativeEndpoint);

export { openapi as initiativeRoutes };
