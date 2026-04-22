import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Chanfana ships its own zod copy in its node_modules. Without this call,
// schemas created with this app's zod lack the `.openapi()` method that
// chanfana invokes during OpenAPI spec generation.
extendZodWithOpenApi(z);
