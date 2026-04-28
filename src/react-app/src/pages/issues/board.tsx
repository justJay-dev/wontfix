import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { List, Plus, Search } from "lucide-react";
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    closestCenter,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

function SortableCard({ issue }: { issue: IssueCard }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: issue.id });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Translate.toString(transform),
                transition,
                opacity: isDragging ? 0 : 1,
            }}
            {...attributes}
            {...listeners}
            className="touch-none"
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
            <SortableContext
                id={def.id}
                items={issues.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="flex flex-col gap-2 overflow-y-auto pr-1">
                    {issues.length === 0 ? (
                        <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                            Nothing here.
                        </p>
                    ) : (
                        issues.map((issue) => (
                            <SortableCard key={issue.id} issue={issue} />
                        ))
                    )}
                </div>
            </SortableContext>
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
    const { data: initiativesData } = useInitiatives(true);
    const { data: labelsData } = useLabels();
    const { members } = useOrgMembers();

    const apiIssues = data?.data ?? [];
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

    // Local ordering state — maps column ID → ordered issue IDs.
    // Synced from API data, mutated optimistically during drag.
    const [orderedColumns, setOrderedColumns] = useState<
        Record<string, string[]>
    >({});

    const issueMap = useMemo(() => {
        const map = new Map<string, IssueCard>();
        for (const issue of apiIssues) map.set(issue.id, issue);
        return map;
    }, [apiIssues]);

    // Rebuild local order from API data when it changes.
    useEffect(() => {
        const cols: Record<string, string[]> = {};
        for (const def of columnDefs) cols[def.id] = [];
        for (const issue of apiIssues) {
            const key =
                groupBy === "status"
                    ? issue.status
                    : issue.initiative?.id ?? "__none__";
            if (cols[key]) cols[key].push(issue.id);
        }
        setOrderedColumns(cols);
    }, [apiIssues, columnDefs, groupBy]);

    // Resolve ordered columns to issue objects for rendering.
    const columns: Record<string, IssueCard[]> = useMemo(() => {
        const result: Record<string, IssueCard[]> = {};
        for (const def of columnDefs) {
            const ids = orderedColumns[def.id] ?? [];
            result[def.id] = ids
                .map((id) => issueMap.get(id))
                .filter((i): i is IssueCard => i !== undefined);
        }
        return result;
    }, [columnDefs, orderedColumns, issueMap]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
    );

    function findContainer(id: string): string | undefined {
        for (const [containerId, ids] of Object.entries(orderedColumns)) {
            if (ids.includes(id)) return containerId;
        }
        return undefined;
    }

    function handleDragStart(event: DragStartEvent) {
        setActiveId(String(event.active.id));
    }

    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!over) return;

        const activeIdStr = String(active.id);
        const overIdStr = String(over.id);

        const activeContainer = findContainer(activeIdStr);
        // over could be a sortable card (has containerId) or a column droppable
        const overContainer =
            over.data.current?.sortable?.containerId ??
            (columnDefs.find((d) => d.id === overIdStr) ? overIdStr : undefined);

        if (!activeContainer || !overContainer) return;

        setOverColumnId(overContainer);

        if (activeContainer === overContainer) return;

        // Cross-column: move the card from one column to the other
        setOrderedColumns((prev) => {
            const activeItems = prev[activeContainer].filter(
                (id) => id !== activeIdStr,
            );
            const overItems = [...(prev[overContainer] ?? [])];

            // Insert near the card we're hovering over, or at end
            const overIndex = overItems.indexOf(overIdStr);
            const insertIndex =
                overIndex >= 0 ? overIndex : overItems.length;
            overItems.splice(insertIndex, 0, activeIdStr);

            return {
                ...prev,
                [activeContainer]: activeItems,
                [overContainer]: overItems,
            };
        });
    }

    // Debounced query invalidation ref
    const invalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedInvalidate = useCallback(() => {
        if (invalidateTimer.current) clearTimeout(invalidateTimer.current);
        invalidateTimer.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["issues"] });
        }, 500);
    }, [queryClient]);

    async function handleDragEnd(event: DragEndEvent) {
        setOverColumnId(null);
        setActiveId(null);
        const { active, over } = event;
        if (!over) return;

        const activeIdStr = String(active.id);
        const overIdStr = String(over.id);

        const activeContainer = findContainer(activeIdStr);
        const overContainer =
            over.data.current?.sortable?.containerId ??
            (columnDefs.find((d) => d.id === overIdStr)
                ? overIdStr
                : undefined);

        if (!activeContainer || !overContainer) return;

        const issue = issueMap.get(activeIdStr);
        if (!issue) return;

        // Same-column reorder
        if (activeContainer === overContainer) {
            const items = orderedColumns[activeContainer];
            const oldIndex = items.indexOf(activeIdStr);
            const newIndex = items.indexOf(overIdStr);
            if (oldIndex === newIndex) return;

            const newItems = arrayMove(items, oldIndex, newIndex);
            setOrderedColumns((prev) => ({
                ...prev,
                [activeContainer]: newItems,
            }));

            // Only PATCH cards whose sort_order actually changed
            const patches = newItems
                .map((id, i) => ({ id, sortOrder: i + 1 }))
                .filter(({ id, sortOrder }) => {
                    const card = issueMap.get(id);
                    return card && card.sort_order !== sortOrder;
                })
                .map(({ id, sortOrder }) =>
                    apiClient.PATCH("/api/issues/{number}", {
                        params: {
                            path: {
                                number: String(issueMap.get(id)!.number),
                            },
                        },
                        body: { sort_order: sortOrder },
                    }),
                );
            await Promise.all(patches);
            debouncedInvalidate();
            return;
        }

        // Cross-column drop — orderedColumns already updated in onDragOver.
        // Determine what changed: status or initiative.
        let patchBody: Record<string, unknown> = {};
        let toastCopy: { title: string; description: string } =
            copy.toasts.issueUpdated;

        if (groupBy === "status") {
            if (!(ISSUE_STATUSES as readonly string[]).includes(overContainer))
                return;
            const targetStatus = overContainer as IssueStatus;
            patchBody.status = targetStatus;
            if (targetStatus === "wont_fix") {
                toastCopy = copy.toasts.issueClosedWontFix;
            }
        } else {
            const nextInitiativeId =
                overContainer === "__none__" ? null : overContainer;
            patchBody.initiative_id = nextInitiativeId;
        }

        // PATCH the moved card with column change + sort_order
        const targetItems = orderedColumns[overContainer] ?? [];
        const movedIndex = targetItems.indexOf(activeIdStr);

        const { error } = await apiClient.PATCH("/api/issues/{number}", {
            params: { path: { number: String(issue.number) } },
            body: {
                ...patchBody,
                sort_order: movedIndex + 1,
            } as Record<string, unknown>,
        });

        if (error) {
            toast({ ...copy.toasts.genericError, variant: "destructive" });
            debouncedInvalidate();
            return;
        }

        // Renumber target column (skip moved card, already patched above)
        const targetPatches = targetItems
            .map((id, i) => ({ id, sortOrder: i + 1 }))
            .filter(({ id, sortOrder }) => {
                if (id === activeIdStr) return false;
                const card = issueMap.get(id);
                return card && card.sort_order !== sortOrder;
            })
            .map(({ id, sortOrder }) =>
                apiClient.PATCH("/api/issues/{number}", {
                    params: { path: { number: String(issueMap.get(id)!.number) } },
                    body: { sort_order: sortOrder },
                }),
            );

        // Renumber source column (card was removed by onDragOver)
        const sourceItems = orderedColumns[activeContainer] ?? [];
        const sourcePatches = sourceItems
            .map((id, i) => ({ id, sortOrder: i + 1 }))
            .filter(({ id, sortOrder }) => {
                const card = issueMap.get(id);
                return card && card.sort_order !== sortOrder;
            })
            .map(({ id, sortOrder }) =>
                apiClient.PATCH("/api/issues/{number}", {
                    params: { path: { number: String(issueMap.get(id)!.number) } },
                    body: { sort_order: sortOrder },
                }),
            );

        await Promise.all([...targetPatches, ...sourcePatches]);

        debouncedInvalidate();
        toast(toastCopy);
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
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
                            {pagination?.total ?? apiIssues.length} issues across{" "}
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
                            <Link to="/issues/list">
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
                        const active = issueMap.get(activeId);
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
