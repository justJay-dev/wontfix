import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LayoutGrid, List } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { copy } from "@/lib/copy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/issues/status-chip";
import { PriorityChip } from "@/components/issues/priority-chip";
import { LabelChip } from "@/components/issues/label-chip";
import {
    StatusBoard,
    type IssueCard,
} from "@/components/issues/status-board";
import { MarkdownView } from "@/components/markdown/view";
import { PublicShell } from "./shell";

export function PublicInitiative() {
    const { orgSlug = "", slug = "" } = useParams();
    const [view, setView] = useState<"list" | "board">("list");

    const initiativeQuery = useQuery({
        queryKey: ["public-initiative", orgSlug, slug],
        queryFn: async () => {
            const { data, error } = await apiClient.GET(
                "/api/public/orgs/{orgSlug}/initiatives/{slug}",
                { params: { path: { orgSlug, slug } } },
            );
            if (error) throw error;
            return data;
        },
    });

    const issuesQuery = useQuery({
        queryKey: ["public-initiative-issues", orgSlug, slug],
        queryFn: async () => {
            const { data, error } = await apiClient.GET(
                "/api/public/orgs/{orgSlug}/initiatives/{slug}/issues",
                {
                    params: {
                        path: { orgSlug, slug },
                        query: { limit: "100" },
                    },
                },
            );
            if (error) throw error;
            return data;
        },
        enabled: initiativeQuery.isSuccess,
    });

    if (initiativeQuery.isLoading) {
        return (
            <PublicShell>
                <div className="space-y-4">
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </PublicShell>
        );
    }

    if (initiativeQuery.isError || !initiativeQuery.data) {
        return (
            <PublicShell>
                <div className="py-16 text-center">
                    <p className="text-lg font-medium">{copy.notFound.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {copy.notFound.description}
                    </p>
                </div>
            </PublicShell>
        );
    }

    const initiative = initiativeQuery.data.data;
    const org = initiativeQuery.data.organization;
    const issues = issuesQuery.data?.data ?? [];

    return (
        <PublicShell orgName={org.name}>
            <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: initiative.color }}
                            />
                            <h1 className="text-3xl font-bold tracking-tight">
                                {initiative.name}
                            </h1>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {org.name} · {issues.length} issue
                            {issues.length === 1 ? "" : "s"}
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant={view === "list" ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setView("list")}
                        >
                            <List className="mr-1 h-3.5 w-3.5" />
                            List
                        </Button>
                        <Button
                            variant={view === "board" ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setView("board")}
                        >
                            <LayoutGrid className="mr-1 h-3.5 w-3.5" />
                            Board
                        </Button>
                    </div>
                </div>

                {initiative.description && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Description
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <MarkdownView markdown={initiative.description} />
                        </CardContent>
                    </Card>
                )}

                {view === "list" ? (
                    <div className="divide-y divide-border rounded-md border border-border bg-card">
                        {issues.length === 0 ? (
                            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                                No issues under this initiative yet.
                            </div>
                        ) : (
                            issues.map((issue) => (
                                <Link
                                    key={issue.id}
                                    to={`/public/${orgSlug}/${slug}/${issue.number}`}
                                    className="flex flex-col gap-2 px-4 py-3 transition hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex min-w-0 flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-muted-foreground">
                                                #{issue.number}
                                            </span>
                                            <span className="truncate text-sm font-medium">
                                                {issue.title}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <StatusChip status={issue.status} />
                                            <PriorityChip
                                                priority={issue.priority}
                                            />
                                            {issue.labels.map((label) => (
                                                <LabelChip
                                                    key={label.id}
                                                    name={label.name}
                                                    color={label.color}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(
                                            new Date(issue.updated_at * 1000),
                                            { addSuffix: true },
                                        )}
                                    </span>
                                </Link>
                            ))
                        )}
                    </div>
                ) : (
                    <StatusBoard
                        issues={issues as IssueCard[]}
                        getIssueHref={(issue) =>
                            `/public/${orgSlug}/${slug}/${issue.number}`
                        }
                    />
                )}
            </div>
        </PublicShell>
    );
}
