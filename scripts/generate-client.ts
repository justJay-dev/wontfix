/**
 * Generates the typed API client (src/react-app/src/lib/api-types.d.ts) by
 * instantiating the Hono app in-process and fetching /api/openapi.json, then
 * piping the JSON spec into openapi-typescript. No running dev server required.
 */
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import app from "../src/worker/index";

// Mock Cloudflare bindings — only the OpenAPI doc route is hit, so none of
// these are actually used. They just satisfy the TypeScript types.
const mockEnv = {
  DB: {} as D1Database,
  ASSETS: {} as Fetcher,
  FILES: {} as R2Bucket,
  BETTER_AUTH_SECRET: "mock",
  BASE_URL: "http://localhost",
  RESEND_API_KEY: "mock",
  TURNSTILE_SECRET_KEY: "mock",
};

const response = await app.fetch(
  new Request("http://localhost/api/openapi.json"),
  mockEnv,
);

if (!response.ok) {
  console.error(
    "Failed to fetch OpenAPI spec:",
    response.status,
    await response.text(),
  );
  process.exit(1);
}

const spec = await response.text();
const tmpFile = "/tmp/app-openapi.json";
writeFileSync(tmpFile, spec);

execSync(
  `bunx openapi-typescript ${tmpFile} -o src/react-app/src/lib/api-types.d.ts --root-types`,
  {
    stdio: "inherit",
    cwd: process.cwd(),
  },
);

console.log("Generated src/react-app/src/lib/api-types.d.ts");
