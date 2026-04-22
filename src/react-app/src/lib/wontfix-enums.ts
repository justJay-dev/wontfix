// Shadcn Select requires non-empty string values, so we use these
// sentinels for "no selection" in forms where the underlying field is
// nullable/optional.
export const UNASSIGNED = "__unassigned__";
export const NO_INITIATIVE = "__none__";

export const ISSUE_STATUSES = [
    "new",
    "todo",
    "doing",
    "done",
    "wont_fix",
] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_PRIORITIES = [
    "lol",
    "meh",
    "spicy",
    "on_fire",
    "prod_is_down",
    "an_executive_is_pissed",
] as const;

export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const STATUS_META: Record<
    IssueStatus,
    { label: string; tooltip: string; className: string }
> = {
    new: {
        label: "New",
        tooltip: "Freshly yeeted into the backlog.",
        className: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    },
    todo: {
        label: "Todo",
        tooltip: "Acknowledged. Still not started.",
        className: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
    },
    doing: {
        label: "Doing",
        tooltip: "Somebody is actually working on it. Allegedly.",
        className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    },
    done: {
        label: "Done",
        tooltip: "Fixed. Probably. Ship it.",
        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    },
    wont_fix: {
        label: "Won't Fix",
        tooltip: "We read it. We disagree.",
        className: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
    },
};

export const PRIORITY_META: Record<
    IssuePriority,
    { label: string; tooltip: string; className: string; rank: number }
> = {
    lol: {
        label: "lol",
        tooltip: "Fine. Eventually.",
        className: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
        rank: 0,
    },
    meh: {
        label: "meh",
        tooltip: "Default state of the universe.",
        className: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
        rank: 1,
    },
    spicy: {
        label: "spicy",
        tooltip: "Escalating. Somebody please.",
        className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
        rank: 2,
    },
    on_fire: {
        label: "on fire",
        tooltip: "Actual fire. Bring extinguishers.",
        className: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
        rank: 3,
    },
    prod_is_down: {
        label: "prod is down",
        tooltip: "Prod. Is. Down. All hands.",
        className: "bg-red-500/20 text-red-700 dark:text-red-300",
        rank: 4,
    },
    an_executive_is_pissed: {
        label: "an executive is pissed",
        tooltip: "Someone with a title read the status page. Drop everything.",
        className: "bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300",
        rank: 5,
    },
};

export const TERMINAL_STATUSES: IssueStatus[] = ["done", "wont_fix"];

export function isTerminalStatus(status: IssueStatus): boolean {
    return TERMINAL_STATUSES.includes(status);
}
