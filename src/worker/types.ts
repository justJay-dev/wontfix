import type { Context } from "hono";
import type { Database } from "@worker/db/client";

export interface Env {
    ASSETS: Fetcher;
    DB: D1Database;
    FILES: R2Bucket;
    EMAIL: SendEmail;
    EMAIL_FROM: string;
    BETTER_AUTH_SECRET: string;
    TURNSTILE_SECRET_KEY: string;
    BASE_URL?: string;
}

export interface AppEnv {
    Bindings: Env;
    Variables: {
        db: Database;
        session: Record<string, unknown>;
        user: Record<string, unknown>;
        isGlobalAdmin: boolean;
        organizationId: string;
        memberRole: string;
    };
}

export type AppContext = Context<AppEnv>;
