import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from "@dnd-kit/core";
import {
    ISSUE_STATUSES,
    STATUS_META,
    type IssueStatus,
} from "@/lib/wontfix-enums";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusChip } from "@/components/issues/status-chip";
import { PriorityChip } from "@/components/issues/priority-chip";
import { LabelChip } from "@/components/issues/label-chip";
import type { operations } from "@/lib/api-types";

export type IssueCard =
    operations["listIssues"]["responses"]["200"]["content"]["application/json"]["data"][number];

export interface StatusBoardProps {
    issues: IssueCard[];
    // When omitted, cards render without drag-and-drop. Used for the
    // public (read-only) board view.
    onStatusChange?: (
        issue: IssueCard,
        next: IssueStatus,
    ) => void | Promise<void>;
    // Override the card's click target. Defaults to /issues/:number
    // which lives under the authed /app basename.
    getIssueHref?: (issue: IssueCard) => string;
}

function defaultHref(issue: IssueCard): string {
    return `/issues/${issue.number}`;
}

function initials(name: string): string {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

interface IssueCardInnerProps {
    issue: IssueCard;
    asLink?: boolean;
    getIssueHref?: (issue: IssueCard) => string;
}

function IssueCardInner({
    issue,
    asLink = true,
    getIssueHref = defaultHref,
}: IssueCardInnerProps) {
    const body = (
        <Fragment>
            <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">
                    #{issue.number}
                </span>
                <PriorityChip priority={issue.priority} />
            </div>
            <p className="mt-1 line-clamp-3 text-sm font-medium">
                {issue.title}
            </p>
            {(issue.initiative || issue.labels.length > 0) && (
                <div className="mt-2 flex flex-wrap items-center gap-1">
                    {issue.initiative && (
                        <LabelChip
                            name={
                                issue.initiative.archived
                                    ? `${issue.initiative.name} (archived)`
                                    : issue.initiative.name
                            }
                            color={issue.initiative.color}
                            className={
                                issue.initiative.archived
                                    ? "opacity-50 line-through"
                                    : ""
                            }
                        />
                    )}
                    {issue.labels.map((label) => (
                        <LabelChip
                            key={label.id}
                            name={label.name}
                            color={label.color}
                        />
                    ))}
                </div>
            )}
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                    {issue.comment_count}{" "}
                    {issue.comment_count === 1 ? "comment" : "comments"}
                </span>
                {issue.assignee && (
                    <Avatar
                        className="h-5 w-5"
                        title={`Assigned to ${issue.assignee.name}`}
                    >
                        <AvatarFallback className="text-[9px]">
                            {initials(issue.assignee.name)}
                        </AvatarFallback>
                    </Avatar>
                )}
            </div>
        </Fragment>
    );

    const className =
        "block rounded-md border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/40";

    if (asLink) {
        return (
            <Link to={getIssueHref(issue)} className={className}>
                {body}
            </Link>
        );
    }
    return <div className={className}>{body}</div>;
}

function DraggableCard({
    issue,
    getIssueHref,
}: {
    issue: IssueCard;
    getIssueHref?: (issue: IssueCard) => string;
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: issue.id,
    });
    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            className="touch-none"
            style={{ opacity: isDragging ? 0 : 1 }}
        >
            <IssueCardInner issue={issue} getIssueHref={getIssueHref} />
        </div>
    );
}

interface ColumnProps {
    status: IssueStatus;
    issues: IssueCard[];
    isOver: boolean;
    readOnly: boolean;
    getIssueHref?: (issue: IssueCard) => string;
}

function Column({ status, issues, isOver, readOnly, getIssueHref }: ColumnProps) {
    const meta = STATUS_META[status];
    // Droppable must always be hooked — calling conditionally breaks the
    // rules of hooks — but we only care about `isOver` / drop when not
    // read-only, which the parent enforces by skipping DndContext.
    const { setNodeRef } = useDroppable({ id: status });

    return (
        <div
            ref={readOnly ? undefined : setNodeRef}
            className={cn(
                "flex h-full w-72 shrink-0 flex-col rounded-md border border-border bg-muted/30 p-2 transition",
                isOver && !readOnly && "border-primary bg-primary/5",
            )}
        >
            <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <StatusChip status={status} />
                    <span className="text-xs text-muted-foreground">
                        {issues.length}
                    </span>
                </div>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto pr-1">
                {issues.length === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                        Nothing here.
                    </p>
                ) : (
                    issues.map((issue) =>
                        readOnly ? (
                            <IssueCardInner
                                key={issue.id}
                                issue={issue}
                                getIssueHref={getIssueHref}
                            />
                        ) : (
                            <DraggableCard
                                key={issue.id}
                                issue={issue}
                                getIssueHref={getIssueHref}
                            />
                        ),
                    )
                )}
            </div>
            <p className="mt-auto px-1 pt-2 text-[10px] italic text-muted-foreground">
                {meta.tooltip}
            </p>
        </div>
    );
}

function bucketByStatus(issues: IssueCard[]): Record<IssueStatus, IssueCard[]> {
    const buckets = ISSUE_STATUSES.reduce(
        (acc, status) => {
            acc[status] = [];
            return acc;
        },
        {} as Record<IssueStatus, IssueCard[]>,
    );
    for (const issue of issues) {
        buckets[issue.status].push(issue);
    }
    return buckets;
}

export function StatusBoard({
    issues,
    onStatusChange,
    getIssueHref,
}: StatusBoardProps) {
    const readOnly = !onStatusChange;
    const columns = bucketByStatus(issues);

    if (readOnly) {
        return (
            <div className="flex gap-3 overflow-x-auto pb-4">
                {ISSUE_STATUSES.map((status) => (
                    <Column
                        key={status}
                        status={status}
                        issues={columns[status]}
                        isOver={false}
                        readOnly
                        getIssueHref={getIssueHref}
                    />
                ))}
            </div>
        );
    }

    // Interactive DnD mode.
    return (
        <InteractiveBoard
            issues={issues}
            columns={columns}
            onStatusChange={onStatusChange}
            getIssueHref={getIssueHref}
        />
    );
}

interface InteractiveBoardProps {
    issues: IssueCard[];
    columns: Record<IssueStatus, IssueCard[]>;
    onStatusChange: (
        issue: IssueCard,
        next: IssueStatus,
    ) => void | Promise<void>;
    getIssueHref?: (issue: IssueCard) => string;
}

function InteractiveBoard({
    issues,
    columns,
    onStatusChange,
    getIssueHref,
}: InteractiveBoardProps) {
    const [overStatus, setOverStatus] = useState<IssueStatus | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
    );

    function handleDragStart(event: DragStartEvent) {
        setActiveId(String(event.active.id));
    }

    async function handleDragEnd(event: DragEndEvent) {
        setOverStatus(null);
        setActiveId(null);
        const { active, over } = event;
        if (!over) return;
        const target = String(over.id);
        if (!(ISSUE_STATUSES as readonly string[]).includes(target)) return;
        const targetStatus = target as IssueStatus;
        const issue = issues.find((row) => row.id === String(active.id));
        if (!issue || issue.status === targetStatus) return;
        await onStatusChange(issue, targetStatus);
    }

    const activeIssue = activeId
        ? issues.find((row) => row.id === activeId) ?? null
        : null;

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={(event) => {
                const over = event.over?.id;
                if (
                    typeof over === "string" &&
                    (ISSUE_STATUSES as readonly string[]).includes(over)
                ) {
                    setOverStatus(over as IssueStatus);
                } else {
                    setOverStatus(null);
                }
            }}
            onDragEnd={handleDragEnd}
            onDragCancel={() => {
                setOverStatus(null);
                setActiveId(null);
            }}
        >
            <div className="flex gap-3 overflow-x-auto pb-4">
                {ISSUE_STATUSES.map((status) => (
                    <Column
                        key={status}
                        status={status}
                        issues={columns[status]}
                        isOver={overStatus === status}
                        readOnly={false}
                        getIssueHref={getIssueHref}
                    />
                ))}
            </div>
            <DragOverlay dropAnimation={null}>
                {activeIssue ? (
                    <div className="w-72 rotate-2 opacity-95 shadow-lg">
                        <IssueCardInner
                            issue={activeIssue}
                            asLink={false}
                            getIssueHref={getIssueHref}
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
