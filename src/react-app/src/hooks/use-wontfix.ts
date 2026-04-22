import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery, useApiMutation } from "@/hooks/use-api-query";
import type { IssueStatus, IssuePriority } from "@/lib/wontfix-enums";

export interface IssueFilters {
    status?: IssueStatus;
    priority?: IssuePriority;
    initiative_slug?: string;
    assignee_id?: string;
    label_id?: string;
    q?: string;
    page?: string;
    limit?: string;
}

// ----- Initiatives -----

export function useInitiatives(includeArchived = false) {
    return useApiQuery("/api/initiatives", {
        params: {
            query: includeArchived
                ? { include_archived: "true" }
                : { include_archived: "false" },
        },
        queryKey: ["initiatives", { includeArchived }],
    });
}

export function useInitiative(slug: string) {
    return useApiQuery("/api/initiatives/{slug}", {
        params: { path: { slug } },
        queryKey: ["initiative", slug],
    });
}

export function useCreateInitiative() {
    const queryClient = useQueryClient();
    return useApiMutation("post", "/api/initiatives", {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["initiatives"] });
        },
    });
}

// ----- Issues -----

export function useIssues(filters: IssueFilters) {
    return useApiQuery("/api/issues", {
        params: { query: filters },
        queryKey: ["issues", filters],
    });
}

export function useIssue(number: string) {
    return useApiQuery("/api/issues/{number}", {
        params: { path: { number } },
        queryKey: ["issue", number],
    });
}

export function useCreateIssue() {
    const queryClient = useQueryClient();
    return useApiMutation("post", "/api/issues", {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["issues"] });
        },
    });
}

// ----- Comments -----

export function useComments(issueNumber: string) {
    return useApiQuery("/api/issues/{number}/comments", {
        params: { path: { number: issueNumber } },
        queryKey: ["comments", issueNumber],
    });
}

// ----- Labels -----

export function useLabels() {
    return useApiQuery("/api/labels", { queryKey: ["labels"] });
}

export function useCreateLabel() {
    const queryClient = useQueryClient();
    return useApiMutation("post", "/api/labels", {
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["labels"] });
        },
    });
}
