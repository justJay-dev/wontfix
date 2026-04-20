import { OpenAPIRoute } from "chanfana";
import type { AppContext } from "@worker/types";
import type { Database } from "@worker/db/client";

export abstract class BaseEndpoint extends OpenAPIRoute {
    protected getDb(context: AppContext): Database {
        return context.get("db");
    }
}
