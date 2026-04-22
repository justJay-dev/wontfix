import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { List, Plus, Search } from "lucide-react";
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
import { useQueryClient } from "@tanstack/react-query";
import { useIssues, useInitiatives, useLabels } from "@/hooks/use-wontfix";
import { useOrgMembers } from "@/hooks/use-org-members";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import {
    ISSUE_STATUSES,
    ISSUE_PRIORITIES,
    STATUS_META,
    PRIORITY_META,
    type IssueStatus,
    type IssuePriority,
} from "@/lib/wontfix-enums";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusChip } from "@/components/issues/status-chip";
import { PriorityChip } from "@/components/issues/priority-chip";
import { LabelChip } from "@/components/issues/label-chip";
import { cn } from "@/lib/utils";

const ANY_VALUE = "__any__";

function initials(name: string): string {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

type IssueCard = NonNullable<
    ReturnType<typeof useIssues>["data"]
>["data"][number];

interface IssueCardInnerProps {
    issue: IssueCard;
    asLink?: boolean;
}

function IssueCardInner({ issue, asLink = true }: IssueCardInnerProps) {
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
            <Link to={`/issues/${issue.number}`} className={className}>
                {body}
            </Link>
        );
    }
    return <div className={className}>{body}</div>;
}

interface DraggableCardProps {
    issue: IssueCard;
}

function DraggableCard({ issue }: DraggableCardProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: issue.id,
    });

    // Keep the card's slot in the column but hide the content so the
    // floating DragOverlay clone carries the visual. Without this the
    // slot collapses and columns reflow as you pick up a card.
    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            className="touch-none"
            style={{ opacity: isDragging ? 0 : 1 }}
        >
            <IssueCardInner issue={issue} />
        </div>
    );
}

type GroupBy = "status" | "initiative";

interface ColumnDef {
    id: string;
    kind: GroupBy;
    label: string;
    subtitle?: string;
    status?: IssueStatus;
    color?: string;
    archived?: boolean;
}

interface ColumnProps {
    def: ColumnDef;
    issues: IssueCard[];
    isOver: boolean;
}

function Column({ def, issues, isOver }: ColumnProps) {
    const { setNodeRef } = useDroppable({ id: def.id });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex h-full w-72 shrink-0 flex-col rounded-md border border-border bg-muted/30 p-2 transition",
                isOver && "border-primary bg-primary/5",
                def.archived && "opacity-80",
            )}
        >
            <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    {def.kind === "status" && def.status ? (
                        <StatusChip status={def.status} />
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{
                                    backgroundColor: def.color ?? "#6b7280",
                                }}
                            />
                            <span
                                className={cn(
                                    "text-sm font-medium",
                                    def.archived && "line-through",
                                )}
                            >
                                {def.label}
                            </span>
                            {def.archived && (
                                <span className="text-[10px] uppercase text-muted-foreground">
                                    archived
                                </span>
                            )}
                        </div>
                    )}
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
                    issues.map((issue) => (
                        <DraggableCard key={issue.id} issue={issue} />
                    ))
                )}
            </div>
            {def.subtitle && (
                <p className="mt-auto px-1 pt-2 text-[10px] italic text-muted-foreground">
                    {def.subtitle}
                </p>
            )}
        </div>
    );
}

export function IssuesBoard() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const [groupBy, setGroupBy] = useState<GroupBy>("status");
    const [status, setStatus] = useState<string>(ANY_VALUE);
    const [priority, setPriority] = useState<string>(ANY_VALUE);
    const [initiativeSlug, setInitiativeSlug] = useState<string>(ANY_VALUE);
    const [labelId, setLabelId] = useState<string>(ANY_VALUE);
    const [assigneeId, setAssigneeId] = useState<string>(ANY_VALUE);
    const [search, setSearch] = useState("");
    const [overColumnId, setOverColumnId] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    const filters = useMemo(
        () => ({
            status:
                status === ANY_VALUE ? undefined : (status as IssueStatus),
            priority:
                priority === ANY_VALUE
                    ? undefined
                    : (priority as IssuePriority),
            initiative_slug:
                initiativeSlug === ANY_VALUE ? undefined : initiativeSlug,
            label_id: labelId === ANY_VALUE ? undefined : labelId,
            assignee_id: assigneeId === ANY_VALUE ? undefined : assigneeId,
            q: search.trim() || undefined,
            page: "1",
            limit: "100",
        }),
        [status, priority, initiativeSlug, labelId, assigneeId, search],
    );

    const { data, isLoading } = useIssues(filters);
    // Board by initiative needs archived initiatives too so orphaned
    // issues under them still land in a column.
    const { data: initiativesData } = useInitiatives(true);
    const { data: labelsData } = useLabels();
    const { members } = useOrgMembers();

    const issues = data?.data ?? [];
    const pagination = data?.pagination;
    const initiatives = initiativesData?.data ?? [];
    const labels = labelsData?.data ?? [];

    const columnDefs: ColumnDef[] = useMemo(() => {
        if (groupBy === "status") {
            return ISSUE_STATUSES.map((s) => ({
                id: s,
                kind: "status" as const,
                label: STATUS_META[s].label,
                subtitle: STATUS_META[s].tooltip,
                status: s,
            }));
        }
        const defs: ColumnDef[] = [
            {
                id: "__none__",
                kind: "initiative" as const,
                label: "No initiative",
                subtitle: "Unassigned — pick a theme eventually.",
                color: "#6b7280",
            },
        ];
        for (const initiative of initiatives) {
            defs.push({
                id: initiative.id,
                kind: "initiative" as const,
                label: initiative.name,
                subtitle: initiative.description
                    ? initiative.description.slice(0, 80)
                    : undefined,
                color: initiative.color,
                archived: initiative.archived_at !== null,
            });
        }
        return defs;
    }, [groupBy, initiatives]);

    const columns: Record<string, IssueCard[]> = useMemo(() => {
        const buckets: Record<string, IssueCard[]> = Object.fromEntries(
            columnDefs.map((def) => [def.id, [] as IssueCard[]]),
        );
        for (const issue of issues) {
            const key =
                groupBy === "status"
                    ? issue.status
                    : issue.initiative?.id ?? "__none__";
            if (buckets[key]) {
                buckets[key].push(issue);
            }
        }
        return buckets;
    }, [columnDefs, issues, groupBy]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            // Require a little drag before engaging so simple clicks on
            // the card's Link still navigate to the issue.
            activationConstraint: { distance: 6 },
        }),
    );

    function handleDragStart(event: DragStartEvent) {
        setActiveId(String(event.active.id));
    }

    async function handleDragEnd(event: DragEndEvent) {
        setOverColumnId(null);
        setActiveId(null);
        const { active, over } = event;
        if (!over) return;
        const issueId = String(active.id);
        const targetId = String(over.id);

        const issue = issues.find((row) => row.id === issueId);
        if (!issue) return;

        type ListPayload = { data: IssueCard[]; pagination: unknown };
        const queryKey = ["issues", filters];
        const previous = queryClient.getQueryData<ListPayload>(queryKey);

        let patchBody:
            | { status: IssueStatus }
            | { initiative_id: string | null };
        let toastCopy: { title: string; description: string } =
            copy.toasts.issueUpdated;

        if (groupBy === "status") {
            if (!(ISSUE_STATUSES as readonly string[]).includes(targetId))
                return;
            const targetStatus = targetId as IssueStatus;
            if (issue.status === targetStatus) return;
            patchBody = { status: targetStatus };
            if (targetStatus === "wont_fix") {
                toastCopy = copy.toasts.issueClosedWontFix;
            }
            if (previous) {
                queryClient.setQueryData<ListPayload>(queryKey, {
                    ...previous,
                    data: previous.data.map((row) =>
                        row.id === issueId
                            ? { ...row, status: targetStatus }
                            : row,
                    ),
                });
            }
        } else {
            const nextInitiativeId =
                targetId === "__none__" ? null : targetId;
            const currentId = issue.initiative?.id ?? null;
            if (currentId === nextInitiativeId) return;
            patchBody = { initiative_id: nextInitiativeId };
            const nextInitiative =
                nextInitiativeId === null
                    ? null
                    : initiatives.find((row) => row.id === nextInitiativeId);
            if (previous) {
                queryClient.setQueryData<ListPayload>(queryKey, {
                    ...previous,
                    data: previous.data.map((row) =>
                        row.id === issueId
                            ? {
                                  ...row,
                                  initiative: nextInitiative
                                      ? {
                                            id: nextInitiative.id,
                                            name: nextInitiative.name,
                                            slug: nextInitiative.slug,
                                            color: nextInitiative.color,
                                            archived:
                                                nextInitiative.archived_at !==
                                                null,
                                        }
                                      : null,
                              }
                            : row,
                    ),
                });
            }
        }

        const { error } = await apiClient.PATCH("/api/issues/{number}", {
            params: { path: { number: issue.number.toString() } },
            body: patchBody,
        });

        if (error) {
            if (previous) queryClient.setQueryData(queryKey, previous);
            toast({
                ...copy.toasts.genericError,
                variant: "destructive",
            });
            return;
        }

        await queryClient.invalidateQueries({ queryKey: ["issues"] });
        await queryClient.invalidateQueries({
            queryKey: ["issue", String(issue.number)],
        });
        toast(toastCopy);
    }

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={(event) => {
                const over = event.over?.id;
                setOverColumnId(typeof over === "string" ? over : null);
            }}
            onDragEnd={handleDragEnd}
            onDragCancel={() => {
                setOverColumnId(null);
                setActiveId(null);
            }}
        >
            <div className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Board
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {pagination?.total ?? issues.length} issues across{" "}
                            {columnDefs.length}{" "}
                            {groupBy === "status"
                                ? "statuses"
                                : "initiatives"}
                            . Drag to triage.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select
                            value={groupBy}
                            onValueChange={(value) =>
                                setGroupBy(value as GroupBy)
                            }
                        >
                            <SelectTrigger className="w-[170px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="status">
                                    Group by status
                                </SelectItem>
                                <SelectItem value="initiative">
                                    Group by initiative
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Button asChild variant="outline" size="sm">
                            <Link to="/issues">
                                <List className="mr-1 h-3.5 w-3.5" />
                                List
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link to="/issues/new">
                                <Plus className="mr-1 h-4 w-4" />
                                New issue
                            </Link>
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardContent className="flex flex-wrap items-center gap-2 p-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search title or body…"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                className="pl-8"
                            />
                        </div>
                        {groupBy === "initiative" && (
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="w-[170px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ANY_VALUE}>
                                        Any status
                                    </SelectItem>
                                    {ISSUE_STATUSES.map((value) => (
                                        <SelectItem key={value} value={value}>
                                            {STATUS_META[value].label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <Select value={priority} onValueChange={setPriority}>
                            <SelectTrigger className="w-[170px]">
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ANY_VALUE}>
                                    Any priority
                                </SelectItem>
                                {ISSUE_PRIORITIES.map((value) => (
                                    <SelectItem key={value} value={value}>
                                        {PRIORITY_META[value].label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {groupBy === "status" && (
                            <Select
                                value={initiativeSlug}
                                onValueChange={setInitiativeSlug}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Initiative" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ANY_VALUE}>
                                        Any initiative
                                    </SelectItem>
                                    {initiatives.map((initiative) => (
                                        <SelectItem
                                            key={initiative.id}
                                            value={initiative.slug}
                                        >
                                            {initiative.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <Select
                            value={assigneeId}
                            onValueChange={setAssigneeId}
                        >
                            <SelectTrigger className="w-[170px]">
                                <SelectValue placeholder="Assignee" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ANY_VALUE}>
                                    Any assignee
                                </SelectItem>
                                {members.map((member) => (
                                    <SelectItem
                                        key={member.userId}
                                        value={member.userId}
                                    >
                                        {member.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={labelId} onValueChange={setLabelId}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Label" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ANY_VALUE}>
                                    Any label
                                </SelectItem>
                                {labels.map((label) => (
                                    <SelectItem key={label.id} value={label.id}>
                                        {label.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {isLoading ? (
                    <div className="flex gap-3 overflow-x-auto">
                        {columnDefs.map((def) => (
                            <Skeleton
                                key={def.id}
                                className="h-64 w-72 shrink-0"
                            />
                        ))}
                    </div>
                ) : (
                    <Fragment>
                        <div className="flex flex-1 gap-3 overflow-x-auto pb-4">
                            {columnDefs.map((def) => (
                                <Column
                                    key={def.id}
                                    def={def}
                                    issues={columns[def.id] ?? []}
                                    isOver={overColumnId === def.id}
                                />
                            ))}
                        </div>
                        {pagination &&
                            pagination.total > pagination.limit && (
                                <p className="text-center text-xs text-muted-foreground">
                                    Showing {pagination.limit} of{" "}
                                    {pagination.total}. Refine filters to see
                                    the rest.
                                </p>
                            )}
                    </Fragment>
                )}
            </div>
            <DragOverlay dropAnimation={null}>
                {activeId ? (
                    (() => {
                        const active = issues.find(
                            (row) => row.id === activeId,
                        );
                        if (!active) return null;
                        return (
                            <div className="w-72 rotate-2 opacity-95 shadow-lg">
                                <IssueCardInner issue={active} asLink={false} />
                            </div>
                        );
                    })()
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
