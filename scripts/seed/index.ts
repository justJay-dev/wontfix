/**
 * Seed script.
 *
 * Usage:
 *   bun run scripts/seed/index.ts --wontfix                   # preview SQL
 *   bun run scripts/seed/index.ts --wontfix --apply-local     # apply to local D1
 *   bun run scripts/seed/index.ts --wontfix --apply-prod      # apply to production D1
 *
 * --wontfix picks the oldest organization + oldest member user in that org
 * and seeds: one initiative, five issues (varied status/priority), two
 * comments on issue #1, and a single attachment (1x1 PNG written to R2 +
 * a linked `attachment` row on issue #1).
 */
import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";

const args = process.argv.slice(2);
const wontfix = args.includes("--wontfix");
const applyLocal = args.includes("--apply-local");
const applyProd = args.includes("--apply-prod");

if (!wontfix) {
    console.log(
        "Nothing to seed. Org roles are managed by the Better Auth organization plugin.",
    );
    console.log(
        "Pass --wontfix to seed a sample initiative + issues for the oldest org.",
    );
    process.exit(0);
}

function queryD1(sql: string): string {
    const wranglerArgs = applyProd
        ? "--env production --remote"
        : "--local";
    const output = execSync(
        `bunx wrangler d1 execute wontfix-db ${wranglerArgs} --json --command="${sql.replace(/"/g, '\\"')}"`,
        { encoding: "utf8" },
    );
    return output;
}

if (!applyLocal && !applyProd) {
    console.log(
        "Pass --apply-local or --apply-prod. The seed script reads existing org/user rows from the target DB, so it can't preview without running against a DB.",
    );
    process.exit(0);
}

console.log("Looking up oldest organization and a member user…");
const orgsJson = JSON.parse(
    queryD1(
        "SELECT id, name FROM organization ORDER BY created_at ASC LIMIT 1;",
    ),
);
const orgRow = orgsJson?.[0]?.results?.[0];
if (!orgRow) {
    console.error("No organizations found. Sign up and create an org first.");
    process.exit(1);
}
const orgId: string = orgRow.id;
console.log(`Org: ${orgRow.name} (${orgId})`);

const memberJson = JSON.parse(
    queryD1(
        `SELECT user_id FROM member WHERE organization_id = '${orgId}' ORDER BY created_at ASC LIMIT 1;`,
    ),
);
const memberRow = memberJson?.[0]?.results?.[0];
if (!memberRow) {
    console.error(
        `Org ${orgId} has no members. Add a member via the app and retry.`,
    );
    process.exit(1);
}
const userId: string = memberRow.user_id;
console.log(`Author user: ${userId}`);

function nid(): string {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 21);
}

// Re-running the seed against an org that already has issues breaks
// FK constraints (new random ids + existing (org, number) conflicts).
// Bail early and tell the user.
const existingIssuesJson = JSON.parse(
    queryD1(
        `SELECT count(*) as count FROM issue WHERE organization_id = '${orgId}';`,
    ),
);
const existingIssueCount = Number(
    existingIssuesJson?.[0]?.results?.[0]?.count ?? 0,
);
if (existingIssueCount > 0) {
    console.error(
        `Org ${orgId} already has ${existingIssueCount} issues. Skipping seed to avoid constraint conflicts.`,
    );
    console.error(
        "Delete existing seed rows manually if you want to re-seed.",
    );
    process.exit(0);
}

function esc(value: string): string {
    return value.replace(/'/g, "''");
}

const now = Math.floor(Date.now() / 1000);
const initiativeId = nid();
const issueIds = [nid(), nid(), nid(), nid(), nid()];
const commentIds = [nid(), nid()];

const seedIssues: Array<{
    title: string;
    body: string;
    status: string;
    priority: string;
    initiative: boolean;
    number: number;
}> = [
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

const terminalStatuses = new Set(["done", "wont_fix"]);

const statements: string[] = [];

statements.push(
    `INSERT OR IGNORE INTO initiative (id, organization_id, name, slug, description, color, created_at, updated_at)`,
    `VALUES ('${initiativeId}', '${orgId}', 'Launch prep', 'launch-prep', 'Things to fix before we stop being embarrassed.', '#4288c9', ${now}, ${now});`,
);

for (const issue of seedIssues) {
    const closedAt = terminalStatuses.has(issue.status) ? now : null;
    const initiativeRef = issue.initiative ? `'${initiativeId}'` : "NULL";
    statements.push(
        `INSERT OR IGNORE INTO issue (id, organization_id, initiative_id, number, title, body, status, priority, author_id, assignee_id, closed_at, created_at, updated_at)`,
        `VALUES ('${issueIds[issue.number - 1]}', '${orgId}', ${initiativeRef}, ${issue.number}, '${esc(issue.title)}', '${esc(issue.body)}', '${issue.status}', '${issue.priority}', '${userId}', NULL, ${closedAt === null ? "NULL" : closedAt}, ${now}, ${now});`,
    );
}

// Two comments on issue #1.
statements.push(
    `INSERT OR IGNORE INTO comment (id, issue_id, author_id, body, created_at, updated_at)`,
    `VALUES ('${commentIds[0]}', '${issueIds[0]}', '${userId}', 'Repro''d in an incognito window. It''s the refresh token.', ${now}, ${now});`,
    `INSERT OR IGNORE INTO comment (id, issue_id, author_id, body, created_at, updated_at)`,
    `VALUES ('${commentIds[1]}', '${issueIds[0]}', '${userId}', 'Patch incoming tonight — will put up a PR.', ${now}, ${now});`,
);

// Attachment: 1x1 red PNG → R2 + row linked to issue #1. The PNG bytes
// are the smallest valid PNG blob; written to R2 first so the download
// endpoint can actually serve them.
const attachmentId = nid();
const attachmentKey = `orgs/${orgId}/${attachmentId}/pixel.png`;
// 1x1 red PNG (base64).
const pixelPngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
const pngBinary = Uint8Array.from(atob(pixelPngBase64), (c) => c.charCodeAt(0));
const pngTmp = "/tmp/seed-wontfix-pixel.png";
writeFileSync(pngTmp, pngBinary);

statements.push(
    `INSERT OR IGNORE INTO attachment (id, organization_id, uploader_id, r2_key, filename, content_type, size_bytes, issue_id, comment_id, created_at)`,
    `VALUES ('${attachmentId}', '${orgId}', '${userId}', '${attachmentKey}', 'pixel.png', 'image/png', ${pngBinary.length}, '${issueIds[0]}', NULL, ${now});`,
);

const sql = statements.join("\n");
const tmpFile = "/tmp/seed-wontfix.sql";
writeFileSync(tmpFile, sql);

try {
    const wranglerArgs = applyProd
        ? "--env production --remote"
        : "--local";
    // R2 write first so the DB row references a real object.
    execSync(
        `bunx wrangler r2 object put wontfix-files/${attachmentKey} ${applyProd ? "--remote" : "--local"} --file=${pngTmp} --content-type=image/png`,
        { stdio: "inherit" },
    );
    execSync(
        `bunx wrangler d1 execute wontfix-db ${wranglerArgs} --file=${tmpFile}`,
        { stdio: "inherit" },
    );
    console.log(
        `\nSeeded wontfix data: 1 initiative, ${seedIssues.length} issues, ${commentIds.length} comments, 1 attachment.`,
    );
} finally {
    unlinkSync(tmpFile);
    unlinkSync(pngTmp);
}
