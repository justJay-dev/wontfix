import type { InferSelectModel } from "drizzle-orm";
import * as schema from "@worker/db/schema";

export type User = InferSelectModel<typeof schema.users>;
export type Session = InferSelectModel<typeof schema.sessions>;
