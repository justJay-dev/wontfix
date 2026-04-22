import { STATUS_META, PRIORITY_META } from "@/lib/wontfix-enums";

interface UserRef {
    name: string;
    email: string;
}

interface LabelRef {
    name: string;
}

interface InitiativeRef {
    name: string;
    slug: string;
}

interface CommentRecord {
    author: UserRef;
    body: string;
    created_at: number;
}

interface IssueRecord {
    number: number;
    title: string;
    status: string;
    priority: string;
    body: string;
    author: UserRef;
    assignee: UserRef | null;
    initiative: InitiativeRef | null;
    labels: LabelRef[];
    created_at: number;
    updated_at: number;
    closed_at: number | null;
}

function formatEpoch(seconds: number): string {
    return new Date(seconds * 1000).toISOString();
}

function formatUser(user: UserRef): string {
    return `${user.name} <${user.email}>`;
}

function statusLabel(status: string): string {
    const meta = STATUS_META[status as keyof typeof STATUS_META];
    return meta ? meta.label : status;
}

function priorityLabel(priority: string): string {
    const meta = PRIORITY_META[priority as keyof typeof PRIORITY_META];
    return meta ? meta.label : priority;
}

export function issueToPrompt(
    issue: IssueRecord,
    comments: CommentRecord[] = [],
): string {
    const lines: string[] = [];
    lines.push(`# Issue #${issue.number}: ${issue.title}`);
    lines.push("");
    lines.push(
        `- **Status:** ${statusLabel(issue.status)} (\`${issue.status}\`)`,
    );
    lines.push(
        `- **Priority:** ${priorityLabel(issue.priority)} (\`${issue.priority}\`)`,
    );
    if (issue.initiative) {
        lines.push(
            `- **Initiative:** ${issue.initiative.name} (\`${issue.initiative.slug}\`)`,
        );
    }
    if (issue.labels.length > 0) {
        lines.push(
            `- **Labels:** ${issue.labels.map((label) => label.name).join(", ")}`,
        );
    }
    lines.push(`- **Author:** ${formatUser(issue.author)}`);
    if (issue.assignee) {
        lines.push(`- **Assignee:** ${formatUser(issue.assignee)}`);
    }
    lines.push(`- **Created:** ${formatEpoch(issue.created_at)}`);
    lines.push(`- **Updated:** ${formatEpoch(issue.updated_at)}`);
    if (issue.closed_at) {
        lines.push(`- **Closed:** ${formatEpoch(issue.closed_at)}`);
    }
    lines.push("");
    lines.push("## Description");
    lines.push("");
    lines.push(issue.body.trim() || "_No description provided._");

    if (comments.length > 0) {
        lines.push("");
        lines.push(`## Comments (${comments.length})`);
        for (const comment of comments) {
            lines.push("");
            lines.push(
                `### ${formatUser(comment.author)} — ${formatEpoch(comment.created_at)}`,
            );
            lines.push("");
            lines.push(comment.body.trim());
        }
    }

    lines.push("");
    lines.push("---");
    lines.push(
        "Treat the above as context. Propose a concrete plan to resolve this issue.",
    );

    return lines.join("\n");
}
