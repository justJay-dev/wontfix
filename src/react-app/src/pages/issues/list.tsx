import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, LayoutGrid, Plus, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useIssues, useInitiatives, useLabels } from "@/hooks/use-wontfix";
import { useOrgMembers } from "@/hooks/use-org-members";
import {
    ISSUE_STATUSES,
    ISSUE_PRIORITIES,
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
import { StatusChip } from "@/components/issues/status-chip";
import { PriorityChip } from "@/components/issues/priority-chip";
import { LabelChip } from "@/components/issues/label-chip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { STATUS_META, PRIORITY_META } from "@/lib/wontfix-enums";

function initials(name: string): string {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

const ANY_VALUE = "__any__";

export function IssuesList() {
    const [status, setStatus] = useState<string>(ANY_VALUE);
    const [priority, setPriority] = useState<string>(ANY_VALUE);
    const [initiativeSlug, setInitiativeSlug] = useState<string>(ANY_VALUE);
    const [labelId, setLabelId] = useState<string>(ANY_VALUE);
    const [assigneeId, setAssigneeId] = useState<string>(ANY_VALUE);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const filters = useMemo(
        () => ({
            status: status === ANY_VALUE ? undefined : (status as IssueStatus),
            priority:
                priority === ANY_VALUE
                    ? undefined
                    : (priority as IssuePriority),
            initiative_slug:
                initiativeSlug === ANY_VALUE ? undefined : initiativeSlug,
            label_id: labelId === ANY_VALUE ? undefined : labelId,
            assignee_id: assigneeId === ANY_VALUE ? undefined : assigneeId,
            q: search.trim() || undefined,
            page: String(page),
        }),
        [status, priority, initiativeSlug, labelId, assigneeId, search, page],
    );

    const { data, isLoading } = useIssues(filters);
    const { data: initiativesData } = useInitiatives();
    const { data: labelsData } = useLabels();
    const { members } = useOrgMembers();

    const issues = data?.data ?? [];
    const pagination = data?.pagination;
    const initiatives = initiativesData?.data ?? [];
    const labels = labelsData?.data ?? [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Issues</h1>
                    <p className="text-sm text-muted-foreground">
                        {pagination?.total ?? 0} total — and growing.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link to="/issues">
                            <LayoutGrid className="mr-1 h-3.5 w-3.5" />
                            Board
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
                <CardContent className="flex flex-wrap items-center gap-2 p-4">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search title or body…"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            className="pl-8"
                        />
                    </div>
                    <Select
                        value={status}
                        onValueChange={(value) => {
                            setStatus(value);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[170px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ANY_VALUE}>Any status</SelectItem>
                            {ISSUE_STATUSES.map((value) => (
                                <SelectItem key={value} value={value}>
                                    {STATUS_META[value].label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={priority}
                        onValueChange={(value) => {
                            setPriority(value);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[180px]">
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
                    <Select
                        value={initiativeSlug}
                        onValueChange={(value) => {
                            setInitiativeSlug(value);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[200px]">
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
                    <Select
                        value={assigneeId}
                        onValueChange={(value) => {
                            setAssigneeId(value);
                            setPage(1);
                        }}
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
                    <Select
                        value={labelId}
                        onValueChange={(value) => {
                            setLabelId(value);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[170px]">
                            <SelectValue placeholder="Label" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ANY_VALUE}>Any label</SelectItem>
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
                <div className="space-y-2">
                    <p className="text-xs italic text-muted-foreground">
                        {copy.loading.issueList}
                    </p>
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-14 w-full" />
                    ))}
                </div>
            ) : issues.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center text-muted-foreground">
                        <p className="text-lg font-medium">
                            {copy.emptyStates.issueList}
                        </p>
                        <p className="mt-2 text-sm">
                            <Link
                                to="/issues/new"
                                className="text-primary underline-offset-4 hover:underline"
                            >
                                File something
                            </Link>{" "}
                            to start the blame chain.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="divide-y divide-border rounded-md border border-border bg-card">
                    {issues.map((issue) => (
                        <Fragment key={issue.id}>
                            <Link
                                to={`/issues/${issue.number}`}
                                className="flex flex-col gap-2 px-4 py-3 transition hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-muted-foreground">
                                            #{issue.number}
                                        </span>
                                        <span className="truncate text-sm font-medium">
                                            {issue.title}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <StatusChip status={issue.status} />
                                        <PriorityChip priority={issue.priority} />
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
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    {issue.assignee && (
                                        <Avatar
                                            className="h-6 w-6"
                                            title={`Assigned to ${issue.assignee.name}`}
                                        >
                                            <AvatarFallback className="text-[10px]">
                                                {initials(issue.assignee.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                    <span>
                                        {issue.comment_count}{" "}
                                        {issue.comment_count === 1
                                            ? "comment"
                                            : "comments"}
                                    </span>
                                    <span>
                                        {formatDistanceToNow(
                                            new Date(issue.updated_at * 1000),
                                            { addSuffix: true },
                                        )}
                                    </span>
                                </div>
                            </Link>
                        </Fragment>
                    ))}
                </div>
            )}

            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                        Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page <= 1}
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() =>
                                setPage((prev) =>
                                    Math.min(pagination.totalPages, prev + 1),
                                )
                            }
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
