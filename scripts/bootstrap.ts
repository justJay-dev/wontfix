/**
 * One-command local setup: admin user, default organization,
 * membership, default labels, and the wontfix sample seed.
 *
 * Usage:
 *   bun run scripts/bootstrap.ts                        # preview (no DB writes)
 *   bun run scripts/bootstrap.ts --apply-local          # run against local D1
 *   bun run scripts/bootstrap.ts --apply-prod           # run against production D1
 *
 * Overrides:
 *   bun run scripts/bootstrap.ts --apply-local \
 *     --email=jay@haulco.com --name="Jay" --password=changeme \
 *     --org-name="Haulco" --org-slug=haulco
 *
 * Or via Makefile:  make bootstrap
 *
 * Everything is idempotent — re-running against an already-bootstrapped
 * DB is safe. Existing rows are reused (user by email, org by slug,
 * labels by (org, name), etc.). Sample wontfix data is only seeded
 * when the org has zero issues, so repeated runs won't duplicate
 * issues/comments/attachments.
 */
import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { hashPassword } from "../src/worker/lib/password";

function parseArg(name: string): string | undefined {
    const prefix = `--${name}=`;
    const entry = process.argv.find((arg) => arg.startsWith(prefix));
    return entry?.slice(prefix.length);
}

const applyLocal = process.argv.includes("--apply-local");
const applyProd = process.argv.includes("--apply-prod");

const email = parseArg("email") ?? "admin@app.local";
const name = parseArg("name") ?? "Admin";
const password = parseArg("password") ?? "password123";
const orgName = parseArg("org-name") ?? "Local Dev";
const orgSlug = parseArg("org-slug") ?? "local-dev";

if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
}

if (!applyLocal && !applyProd) {
    console.log("Bootstrap preview");
    console.log(`  admin:    ${email} (${name})`);
    console.log(`  password: ${password}`);
    console.log(`  org:      ${orgName} (${orgSlug})`);
    console.log(
        "\nRun with --apply-local or --apply-prod to apply to a database.",
    );
    process.exit(0);
}

function nid(): string {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 21);
}

function esc(value: string): string {
    return value.replace(/'/g, "''");
}

function wranglerD1(cmd: string): string {
    const scope = applyProd ? "--env production --remote" : "--local";
    return execSync(`bunx wrangler d1 execute wontfix-db ${scope} ${cmd}`, {
        encoding: "utf8",
    });
}

function d1Query(sql: string): unknown {
    const output = wranglerD1(
        `--json --command="${sql.replace(/"/g, '\\"')}"`,
    );
    return JSON.parse(output);
}

function firstRow<T = Record<string, unknown>>(result: unknown): T | undefined {
    return (result as Array<{ results?: T[] }>)?.[0]?.results?.[0];
}

function applyD1File(path: string): void {
    const scope = applyProd ? "--env production --remote" : "--local";
    execSync(
        `bunx wrangler d1 execute wontfix-db ${scope} --file=${path}`,
        { stdio: "inherit" },
    );
}

// ----- 1. admin user -----

console.log(`Ensuring admin user: ${email}`);
const hashedPassword = await hashPassword(password);
const nowSec = Math.floor(Date.now() / 1000);

const existingUser = firstRow<{ id: string }>(
    d1Query(`SELECT id FROM user WHERE email = '${esc(email)}' LIMIT 1;`),
);
const userId = existingUser?.id ?? nid();

const userStatements: string[] = [];
if (!existingUser) {
    userStatements.push(
        `INSERT INTO user (id, name, email, email_verified, role, banned, created_at, updated_at)`,
        `VALUES ('${userId}', '${esc(name)}', '${esc(email)}', 1, 'admin', 0, ${nowSec}, ${nowSec});`,
        `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)`,
        `VALUES ('${nid()}', '${userId}', 'credential', '${userId}', '${esc(hashedPassword)}', ${nowSec}, ${nowSec});`,
    );
}

// ----- 2. organization -----

console.log(`Ensuring org: ${orgName} (${orgSlug})`);
const existingOrg = firstRow<{ id: string }>(
    d1Query(`SELECT id FROM organization WHERE slug = '${esc(orgSlug)}' LIMIT 1;`),
);
const orgId = existingOrg?.id ?? nid();

const orgStatements: string[] = [];
if (!existingOrg) {
    orgStatements.push(
        `INSERT INTO organization (id, name, slug, created_at, updated_at)`,
        `VALUES ('${orgId}', '${esc(orgName)}', '${esc(orgSlug)}', ${nowSec}, ${nowSec});`,
    );
}

// ----- 3. membership -----

const existingMember = firstRow<{ id: string }>(
    d1Query(
        `SELECT id FROM member WHERE user_id = '${userId}' AND organization_id = '${orgId}' LIMIT 1;`,
    ),
);
const memberStatements: string[] = [];
if (!existingMember) {
    memberStatements.push(
        `INSERT INTO member (id, user_id, organization_id, role, created_at)`,
        `VALUES ('${nid()}', '${userId}', '${orgId}', 'owner', ${nowSec});`,
    );
}

// ----- 4. default labels -----

const DEFAULT_LABELS: Array<{ name: string; color: string }> = [
    { name: "bug", color: "#ef4444" },
    { name: "feature", color: "#4288c9" },
    { name: "question", color: "#a855f7" },
    { name: "skill-issue", color: "#f59e0b" },
    { name: "works-on-my-machine", color: "#14b8a6" },
    { name: "spicy-take", color: "#ec4899" },
    { name: "nice-to-have", color: "#10b981" },
];

const existingLabelCount = Number(
    (
        firstRow<{ count: number }>(
            d1Query(
                `SELECT count(*) as count FROM label WHERE organization_id = '${orgId}';`,
            ),
        ) ?? { count: 0 }
    ).count,
);

const labelStatements: string[] = [];
if (existingLabelCount === 0) {
    for (const label of DEFAULT_LABELS) {
        labelStatements.push(
            `INSERT INTO label (id, organization_id, name, color, created_at)`,
            `VALUES ('${nid()}', '${orgId}', '${label.name}', '${label.color}', ${nowSec});`,
        );
    }
}

// ----- 5. sample wontfix data (only if org has no issues) -----

const issueCount = Number(
    (
        firstRow<{ count: number }>(
            d1Query(
                `SELECT count(*) as count FROM issue WHERE organization_id = '${orgId}';`,
            ),
        ) ?? { count: 0 }
    ).count,
);

const seedIssues = [
    {
        title: "Login redirects to /404 when SSO cookie is stale",
        body: "Repro: leave the tab open for 24h, click Login. Expect: redirect to /. Actual: /404. Happens in Chrome + Firefox.",
        status: "new",
        priority: "on_fire",
        initiative: true,
        number: 1,
    },
    {
        title: "Dashboard graphs render 2s late on cold load",
        body: "Probably a cache miss on the metrics service. Tagging this `meh` but worth a pass.",
        status: "doing",
        priority: "meh",
        initiative: true,
        number: 2,
    },
    {
        title: "Rename 'user' to 'person' across copy",
        body: "Marketing wants this. Engineering does not.",
        status: "wont_fix",
        priority: "lol",
        initiative: false,
        number: 3,
    },
    {
        title: "Safari iOS 16 double-tap zoom on composer",
        body: "Touch handler needs `touch-action: manipulation`.",
        status: "done",
        priority: "spicy",
        initiative: true,
        number: 4,
    },
    {
        title: "Crash when uploading .zip over 10MB",
        body: "Backend rejects but frontend shows a blank toast. Fix the error handling first, then raise the cap.",
        status: "todo",
        priority: "prod_is_down",
        initiative: false,
        number: 5,
    },
];

const terminal = new Set(["done", "wont_fix"]);

const initiativeId = nid();
const issueIds = seedIssues.map(() => nid());
const commentIds = [nid(), nid()];
const attachmentId = nid();
const attachmentKey = `orgs/${orgId}/${attachmentId}/pixel.png`;

const sampleStatements: string[] = [];
if (issueCount === 0) {
    sampleStatements.push(
        `INSERT INTO initiative (id, organization_id, name, slug, description, color, created_at, updated_at)`,
        `VALUES ('${initiativeId}', '${orgId}', 'Launch prep', 'launch-prep', 'Things to fix before we stop being embarrassed.', '#4288c9', ${nowSec}, ${nowSec});`,
    );

    for (const [index, issue] of seedIssues.entries()) {
        const closedAt = terminal.has(issue.status) ? nowSec : null;
        const initiativeRef = issue.initiative ? `'${initiativeId}'` : "NULL";
        sampleStatements.push(
            `INSERT INTO issue (id, organization_id, initiative_id, number, title, body, status, priority, author_id, assignee_id, closed_at, created_at, updated_at)`,
            `VALUES ('${issueIds[index]}', '${orgId}', ${initiativeRef}, ${issue.number}, '${esc(issue.title)}', '${esc(issue.body)}', '${issue.status}', '${issue.priority}', '${userId}', NULL, ${closedAt === null ? "NULL" : closedAt}, ${nowSec}, ${nowSec});`,
        );
    }

    sampleStatements.push(
        `INSERT INTO comment (id, issue_id, author_id, body, created_at, updated_at)`,
        `VALUES ('${commentIds[0]}', '${issueIds[0]}', '${userId}', 'Repro''d in an incognito window. It''s the refresh token.', ${nowSec}, ${nowSec});`,
        `INSERT INTO comment (id, issue_id, author_id, body, created_at, updated_at)`,
        `VALUES ('${commentIds[1]}', '${issueIds[0]}', '${userId}', 'Patch incoming tonight — will put up a PR.', ${nowSec}, ${nowSec});`,
        `INSERT INTO attachment (id, organization_id, uploader_id, r2_key, filename, content_type, size_bytes, issue_id, comment_id, created_at)`,
        `VALUES ('${attachmentId}', '${orgId}', '${userId}', '${attachmentKey}', 'pixel.png', 'image/png', 70, '${issueIds[0]}', NULL, ${nowSec});`,
    );
} else {
    console.log(
        `Org already has ${issueCount} issue(s); skipping sample data.`,
    );
}

// ----- execute -----

const allStatements = [
    ...userStatements,
    ...orgStatements,
    ...memberStatements,
    ...labelStatements,
    ...sampleStatements,
];

if (allStatements.length === 0) {
    console.log("Nothing to do — everything already in place.");
    process.exit(0);
}

const sqlFile = "/tmp/bootstrap.sql";
writeFileSync(sqlFile, allStatements.join("\n"));

// Write the PNG first so the attachment row references a real R2 object.
if (sampleStatements.length > 0) {
    const pngBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const pngBinary = Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0));
    const pngTmp = "/tmp/bootstrap-pixel.png";
    writeFileSync(pngTmp, pngBinary);
    try {
        const r2Scope = applyProd ? "--remote" : "--local";
        execSync(
            `bunx wrangler r2 object put wontfix-files/${attachmentKey} ${r2Scope} --file=${pngTmp} --content-type=image/png`,
            { stdio: "inherit" },
        );
    } finally {
        unlinkSync(pngTmp);
    }
}

try {
    applyD1File(sqlFile);
    console.log("\nBootstrap complete.");
    console.log(`  Sign in:  ${email} / ${password}`);
    console.log(`  Org:      ${orgName} (${orgSlug})`);
    if (sampleStatements.length > 0) {
        console.log(
            `  Seeded:   1 initiative, ${seedIssues.length} issues, ${commentIds.length} comments, 1 attachment.`,
        );
    }
    console.log("\nChange your password after first sign-in.");
} finally {
    unlinkSync(sqlFile);
}
