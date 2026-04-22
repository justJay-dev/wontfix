import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    Archive,
    ArchiveRestore,
    Eye,
    EyeOff,
    LayoutGrid,
    Link as LinkIcon,
    List,
    Pencil,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useInitiative, useIssues } from "@/hooks/use-wontfix";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { copy } from "@/lib/copy";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/issues/status-chip";
import { PriorityChip } from "@/components/issues/priority-chip";
import {
    StatusBoard,
    type IssueCard,
} from "@/components/issues/status-board";
import type { IssueStatus } from "@/lib/wontfix-enums";
import { MarkdownView } from "@/components/markdown/view";
import { MarkdownEditor } from "@/components/markdown/editor";

const COLOR_SWATCHES = [
    "#6b7280",
    "#4288c9",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#a855f7",
    "#ec4899",
];

function slugify(input: string): string {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 80);
}

export function InitiativeDetail() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Larger page size so the board shows everything under this initiative
    // without needing a pager. 100 is the API cap.
    const { data, isLoading, error } = useInitiative(slug ?? "");
    const { data: issuesData } = useIssues({
        initiative_slug: slug,
        limit: "100",
    });
    const { data: activeOrg } = authClient.useActiveOrganization();

    const initiative = data?.data;
    const issues = issuesData?.data ?? [];

    const [view, setView] = useState<"list" | "board">("list");

    const [editOpen, setEditOpen] = useState(false);
    const [editName, setEditName] = useState("");
    const [editSlug, setEditSlug] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editColor, setEditColor] = useState(COLOR_SWATCHES[0]);
    const [editIsPublic, setEditIsPublic] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    if (error) {
        return (
            <div className="mx-auto max-w-3xl py-16 text-center text-muted-foreground">
                <p className="text-lg font-medium">{copy.notFound.title}</p>
            </div>
        );
    }

    if (isLoading || !initiative) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-20 w-full" />
            </div>
        );
    }

    const current = initiative;

    function openEdit() {
        setEditName(current.name);
        setEditSlug(current.slug);
        setEditDescription(current.description);
        setEditColor(current.color);
        setEditIsPublic(current.is_public);
        setEditOpen(true);
    }

    async function saveEdit(event: React.FormEvent) {
        event.preventDefault();
        if (!editName.trim()) return;
        setIsSaving(true);
        const { data: updated, error: apiError } = await apiClient.PATCH(
            "/api/initiatives/{slug}",
            {
                params: { path: { slug: current.slug } },
                body: {
                    name: editName.trim(),
                    slug: editSlug || slugify(editName),
                    description: editDescription,
                    color: editColor,
                    is_public: editIsPublic,
                },
            },
        );
        setIsSaving(false);
        if (apiError) {
            toast({ ...copy.toasts.genericError, variant: "destructive" });
            return;
        }
        setEditOpen(false);
        await queryClient.invalidateQueries({ queryKey: ["initiatives"] });
        toast(copy.toasts.initiativeUpdated);
        const newSlug = updated?.data?.slug;
        if (newSlug && newSlug !== current.slug) {
            navigate(`/initiatives/${newSlug}`, { replace: true });
        } else {
            await queryClient.invalidateQueries({
                queryKey: ["initiative", current.slug],
            });
        }
    }

    async function handleArchive() {
        const { error: apiError } = await apiClient.POST(
            "/api/initiatives/{slug}/archive",
            { params: { path: { slug: current.slug } } },
        );
        if (apiError) {
            toast({ ...copy.toasts.genericError, variant: "destructive" });
            return;
        }
        toast(copy.toasts.initiativeArchived);
        await queryClient.invalidateQueries({ queryKey: ["initiatives"] });
        navigate("/initiatives");
    }

    async function handleCopyPublicLink() {
        if (!current.is_public || !activeOrg?.slug) return;
        const url = `${window.location.origin}/app/public/${activeOrg.slug}/${current.slug}`;
        await navigator.clipboard.writeText(url);
        toast(copy.toasts.copiedPrompt);
    }

    async function handleStatusChange(issue: IssueCard, next: IssueStatus) {
        const { error: apiError } = await apiClient.PATCH(
            "/api/issues/{number}",
            {
                params: { path: { number: issue.number.toString() } },
                body: { status: next },
            },
        );
        if (apiError) {
            toast({ ...copy.toasts.genericError, variant: "destructive" });
            return;
        }
        await queryClient.invalidateQueries({ queryKey: ["issues"] });
        await queryClient.invalidateQueries({
            queryKey: ["issue", String(issue.number)],
        });
        if (next === "wont_fix") {
            toast(copy.toasts.issueClosedWontFix);
        } else {
            toast(copy.toasts.issueUpdated);
        }
    }

    async function handleUnarchive() {
        const { error: apiError } = await apiClient.POST(
            "/api/initiatives/{slug}/unarchive",
            { params: { path: { slug: current.slug } } },
        );
        if (apiError) {
            toast({ ...copy.toasts.genericError, variant: "destructive" });
            return;
        }
        toast(copy.toasts.initiativeUnarchived);
        await queryClient.invalidateQueries({ queryKey: ["initiatives"] });
        await queryClient.invalidateQueries({
            queryKey: ["initiative", current.slug],
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: current.color }}
                        />
                        <h1 className="text-2xl font-bold tracking-tight">
                            {current.name}
                        </h1>
                        {current.is_public ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                <Eye className="h-3 w-3" />
                                Public
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                <EyeOff className="h-3 w-3" />
                                Private
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {issues.length} issue{issues.length === 1 ? "" : "s"}{" "}
                        under this initiative.
                    </p>
                </div>
                <div className="flex items-center gap-2">
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
                    {current.is_public && activeOrg?.slug && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyPublicLink}
                        >
                            <LinkIcon className="mr-1 h-3.5 w-3.5" />
                            Copy public link
                        </Button>
                    )}
                    <Button variant="outline" onClick={openEdit}>
                        <Pencil className="mr-1 h-4 w-4" />
                        Edit
                    </Button>
                    {current.archived_at ? (
                        <Button variant="outline" onClick={handleUnarchive}>
                            <ArchiveRestore className="mr-1 h-4 w-4" />
                            Unarchive
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={handleArchive}>
                            <Archive className="mr-1 h-4 w-4" />
                            Archive
                        </Button>
                    )}
                </div>
            </div>

            {current.description && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MarkdownView markdown={current.description} />
                    </CardContent>
                </Card>
            )}

            {view === "list" ? (
                <div className="divide-y divide-border rounded-md border border-border bg-card">
                    {issues.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No issues assigned to this initiative yet.
                        </div>
                    ) : (
                        issues.map((issue) => (
                            <Link
                                key={issue.id}
                                to={`/issues/${issue.number}`}
                                className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-accent/40"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="font-mono text-xs text-muted-foreground">
                                        #{issue.number}
                                    </span>
                                    <span className="truncate text-sm font-medium">
                                        {issue.title}
                                    </span>
                                    <StatusChip status={issue.status} />
                                    <PriorityChip priority={issue.priority} />
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
                    issues={issues}
                    onStatusChange={handleStatusChange}
                />
            )}

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit initiative</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={saveEdit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                required
                                value={editName}
                                onChange={(event) =>
                                    setEditName(event.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Slug</Label>
                            <Input
                                required
                                value={editSlug}
                                onChange={(event) =>
                                    setEditSlug(event.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <MarkdownEditor
                                value={editDescription}
                                onChange={setEditDescription}
                                minRows={4}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex gap-2">
                                {COLOR_SWATCHES.map((swatch) => (
                                    <button
                                        key={swatch}
                                        type="button"
                                        className={
                                            "h-7 w-7 rounded-full border-2 transition " +
                                            (editColor === swatch
                                                ? "border-foreground"
                                                : "border-transparent")
                                        }
                                        style={{ backgroundColor: swatch }}
                                        onClick={() => setEditColor(swatch)}
                                    />
                                ))}
                            </div>
                        </div>
                        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-muted/40 p-3">
                            <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4"
                                checked={editIsPublic}
                                onChange={(event) =>
                                    setEditIsPublic(event.target.checked)
                                }
                            />
                            <div className="space-y-1">
                                <p className="text-sm font-medium">
                                    Make public
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Anyone with the link can view this
                                    initiative and its issues (comments +
                                    inline attachments included). Your org's
                                    other initiatives stay private.
                                </p>
                            </div>
                        </label>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? "Saving…" : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
