import { createMiddleware } from "hono/factory";
import { createDb } from "@worker/db/client";
import type { AppEnv } from "@worker/types";

export const dbMiddleware = createMiddleware<AppEnv>(async (ctx, next) => {
  const db = createDb(ctx.env.DB);
  ctx.set("db", db);
  return next();
});
