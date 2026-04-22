/**
 * Creates the initial admin user in D1.
 *
 * Usage:
 *   bun run scripts/init-admin.ts                    # preview SQL with defaults
 *   bun run scripts/init-admin.ts --apply-local      # apply to local D1
 *   bun run scripts/init-admin.ts --apply-prod       # apply to production D1
 *
 * Override defaults:
 *   bun run scripts/init-admin.ts --email=you@example.com --name="Your Name" --password=changeme --apply-local
 *
 * Or via Makefile:
 *   make create-admin
 *   make create-admin EMAIL=you@example.com NAME="Your Name" PASSWORD=changeme
 */
import { writeFileSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { hashPassword } from "../src/worker/lib/password";

const DEFAULT_EMAIL = "admin@app.local";
const DEFAULT_NAME = "Admin";
const DEFAULT_PASSWORD = "password123";

function parseArg(name: string): string | undefined {
    const prefix = `--${name}=`;
    const entry = process.argv.find((arg) => arg.startsWith(prefix));
    return entry?.slice(prefix.length);
}

const email = parseArg("email") ?? DEFAULT_EMAIL;
const name = parseArg("name") ?? DEFAULT_NAME;
const password = parseArg("password") ?? DEFAULT_PASSWORD;

if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
}

const applyLocal = process.argv.includes("--apply-local");
const applyProd = process.argv.includes("--apply-prod");

const userId = crypto.randomUUID().replace(/-/g, "").slice(0, 21);
const accountId = crypto.randomUUID().replace(/-/g, "").slice(0, 21);
const hashedPassword = await hashPassword(password);
const now = Math.floor(Date.now() / 1000);

// Escape single quotes in user-supplied strings
function esc(value: string): string {
    return value.replace(/'/g, "''");
}

const sql = [
    `INSERT OR IGNORE INTO user (id, name, email, email_verified, role, banned, created_at, updated_at)`,
    `VALUES ('${userId}', '${esc(name)}', '${esc(email)}', 1, 'admin', 0, ${now}, ${now});`,
    ``,
    `INSERT OR IGNORE INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)`,
    `VALUES ('${accountId}', '${userId}', 'credential', '${userId}', '${esc(hashedPassword)}', ${now}, ${now});`,
].join("\n");

if (!applyLocal && !applyProd) {
    console.log("SQL preview:\n");
    console.log(sql);
    console.log(
        "\nRun with --apply-local or --apply-prod to apply to a database.",
    );
    console.log(`\nDefaults: email=${DEFAULT_EMAIL}, name=${DEFAULT_NAME}, password=${DEFAULT_PASSWORD}`);
    process.exit(0);
}

const tmpFile = "/tmp/init-admin.sql";
writeFileSync(tmpFile, sql);

try {
    if (applyLocal) {
        execSync(`bunx wrangler d1 execute wontfix-db --local --file=${tmpFile}`, {
            stdio: "inherit",
        });
        console.log(`\nAdmin user created (local): ${email}`);
    } else if (applyProd) {
        execSync(
            `bunx wrangler d1 execute wontfix-db --env production --remote --file=${tmpFile}`,
            { stdio: "inherit" },
        );
        console.log(`\nAdmin user created (production): ${email}`);
    }
    console.log("Change your password after first sign-in.");
} finally {
    unlinkSync(tmpFile);
}
