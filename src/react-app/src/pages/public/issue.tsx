import { Fragment } from "react";
import { Link, useParams } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { copy } from "@/lib/copy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusChip } from "@/components/issues/status-chip";
import { PriorityChip } from "@/components/issues/priority-chip";
import { LabelChip } from "@/components/issues/label-chip";
import { MarkdownView } from "@/components/markdown/view";
import { PublicShell } from "./shell";

function initials(name: string): string {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function formatFullDate(epoch: number): string {
    return format(new Date(epoch * 1000), "MMM d, yyyy 'at' h:mm a");
}

export function PublicIssue() {
    const { orgSlug = "", slug = "", number = "" } = useParams();

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

    const issueQuery = useQuery({
        queryKey: ["public-issue", orgSlug, slug, number],
        queryFn: async () => {
            const { data, error } = await apiClient.GET(
                "/api/public/orgs/{orgSlug}/initiatives/{slug}/issues/{number}",
                { params: { path: { orgSlug, slug, number } } },
            );
            if (error) throw error;
            return data;
        },
    });

    const commentsQuery = useQuery({
        queryKey: ["public-comments", orgSlug, slug, number],
        queryFn: async () => {
            const { data, error } = await apiClient.GET(
                "/api/public/orgs/{orgSlug}/initiatives/{slug}/issues/{number}/comments",
                { params: { path: { orgSlug, slug, number } } },
            );
            if (error) throw error;
            return data;
        },
        enabled: issueQuery.isSuccess,
    });

    if (issueQuery.isLoading || initiativeQuery.isLoading) {
        return (
            <PublicShell>
                <div className="space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-40 w-full" />
                </div>
            </PublicShell>
        );
    }

    if (issueQuery.isError || !issueQuery.data) {
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

    const issue = issueQuery.data.data;
    const comments = commentsQuery.data?.data ?? [];
    const org = initiativeQuery.data?.organization;
    const initiative = initiativeQuery.data?.data;

    return (
        <PublicShell orgName={org?.name}>
            <div className="space-y-6">
                <div className="text-sm">
                    <Link
                        to={`/public/${orgSlug}/${slug}`}
                        className="text-primary underline-offset-4 hover:underline"
                    >
                        ← {initiative?.name ?? "initiative"}
                    </Link>
                </div>

                <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-mono">#{issue.number}</span>
                        <span>·</span>
                        <span>
                            filed by {issue.author.name}{" "}
                            {formatDistanceToNow(
                                new Date(issue.created_at * 1000),
                                { addSuffix: true },
                            )}
                        </span>
                    </div>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight">
                        {issue.title}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusChip status={issue.status} />
                        <PriorityChip priority={issue.priority} />
                        {issue.labels.map((label) => (
                            <LabelChip
                                key={label.id}
                                name={label.name}
                                color={label.color}
                            />
                        ))}
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Description
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {issue.body.trim() ? (
                            <MarkdownView markdown={issue.body} />
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No description.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Comments ({comments.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {comments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No one has commented. Yet.
                            </p>
                        ) : (
                            comments.map((comment) => (
                                <Fragment key={comment.id}>
                                    <div className="flex items-start gap-3 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                                        <Avatar className="h-8 w-8 shrink-0">
                                            <AvatarFallback className="text-xs">
                                                {initials(comment.author.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs text-muted-foreground">
                                                <span className="font-medium text-foreground">
                                                    {comment.author.name}
                                                </span>{" "}
                                                ·{" "}
                                                {formatFullDate(
                                                    comment.created_at,
                                                )}
                                            </div>
                                            <div className="mt-1">
                                                <MarkdownView
                                                    markdown={comment.body}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Fragment>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </PublicShell>
    );
}
