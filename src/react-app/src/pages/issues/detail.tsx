import { Fragment, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useIssue, useComments, useLabels } from "@/hooks/use-wontfix";
import { useOrgMembers } from "@/hooks/use-org-members";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
    ISSUE_STATUSES,
    ISSUE_PRIORITIES,
    STATUS_META,
    PRIORITY_META,
    UNASSIGNED,
    type IssueStatus,
    type IssuePriority,
} from "@/lib/wontfix-enums";
import { copy } from "@/lib/copy";
import { issueToPrompt } from "@/lib/issue-to-prompt";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MarkdownView } from "@/components/markdown/view";
import { MarkdownEditor } from "@/components/markdown/editor";
import { AttachmentChips } from "@/components/markdown/attachment-chips";
import type { UploadedAttachment } from "@/hooks/use-attachment-upload";

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

export function IssueDetail() {
    const { number } = useParams<{ number: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth();

    const { data, isLoading, error } = useIssue(number ?? "");
    const { data: commentsData } = useComments(number ?? "");
    const { data: labelsData } = useLabels();
    const { members } = useOrgMembers();

    const memberRole = useMemo(() => {
        const entry = members.find((m) => m.userId === user?.id);
        return entry?.role ?? null;
    }, [members, user]);
    const isOrgAdmin = memberRole === "owner" || memberRole === "admin";

    const [commentBody, setCommentBody] = useState("");
    const [commentAttachments, setCommentAttachments] = useState<
        UploadedAttachment[]
    >([]);
    const [isEditingIssue, setIsEditingIssue] = useState(false);
    const [editedTitle, setEditedTitle] = useState("");
    const [editedBody, setEditedBody] = useState("");
    const [editedBodyAttachments, setEditedBodyAttachments] = useState<
        UploadedAttachment[]
    >([]);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(
        null,
    );
    const [editedCommentBody, setEditedCommentBody] = useState("");
    const [editedCommentAttachments, setEditedCommentAttachments] = useState<
        UploadedAttachment[]
    >([]);

    const issue = data?.data;
    const comments = commentsData?.data ?? [];
    const labels = labelsData?.data ?? [];

    const availableLabels = useMemo(() => {
        if (!issue) return [];
        const attached = new Set(issue.labels.map((label) => label.id));
        return labels.filter((label) => !attached.has(label.id));
    }, [issue, labels]);

    if (error) {
        return (
            <div className="mx-auto max-w-3xl py-16 text-center text-muted-foreground">
                <p className="text-lg font-medium">{copy.notFound.title}</p>
                <p className="mt-2 text-sm">{copy.notFound.description}</p>
            </div>
        );
    }

    if (isLoading || !issue) {
        return (
            <div className="mx-auto max-w-4xl space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }

    const currentIssue = issue;

    async function refresh() {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["issue", number] }),
            queryClient.invalidateQueries({ queryKey: ["issues"] }),
            queryClient.invalidateQueries({ queryKey: ["comments", number] }),
        ]);
    }

    async function changeStatus(status: IssueStatus) {
        if (!issue) return;
        const ageSeconds = Math.floor(Date.now() / 1000) - currentIssue.created_at;
        const isSelfWontFixSoon =
            currentIssue.author.id === user?.id &&
            status === "wont_fix" &&
            ageSeconds < 60;

        const { error: apiError } = await apiClient.PATCH(
            "/api/issues/{number}",
            {
                params: { path: { number: currentIssue.number.toString() } },
                body: { status },
            },
        );
        if (apiError) {
            toast({ ...copy.toasts.genericError, variant: "destructive" });
            return;
        }

        await refresh();

        if (isSelfWontFixSoon) {
            toast(copy.toasts.issueInstantSelfTriage);
        } else if (status === "wont_fix") {
            toast(copy.toasts.issueClosedWontFix);
        } else {
            toast(copy.toasts.issueUpdated);
        }
    }

    async function changePriority(priority: IssuePriority) {
        const { error: apiError } = await apiClient.PATCH(
            "/api/issues/{number}",
            {
                params: { path: { number: currentIssue.number.toString() } },
                body: { priority },
            },
        );
        if (apiError) {
            toast({ ...copy.toasts.genericError, variant: "destructive" });
            return;
        }
        await refresh();
    }

    function startEditingIssue() {
        setEditedTitle(currentIssue.title);
        setEditedBody(currentIssue.body);
        setEditedBodyAttachments([]);
        setIsEditingIssue(true);
    }

    async function saveIssueEdit() {
        if (!editedTitle.trim()) return;
        const { error: apiError } = await apiClient.PATCH(
            "/api/issues/{number}",
            {
                params: { path: { number: currentIssue.number.toString() } },
                body: {
                    title: editedTitle.trim(),
                    body: editedBody,
                    attachment_ids: editedBodyAttachments.map((att) => att.id),
                },
            },
        );
        if (apiError) {
            toast({ ...copy.toasts.genericError, variant: "destructive" });
            return;
        }
        setIsEditingIssue(false);
        setEditedBodyAttachments([]);
        await refresh();
        toast(copy.toasts.issueUpdated);
    }

    function startEditingComment(commentId: string, body: string) {
        setEditingCommentId(commentId);
        setEditedCommentBody(body);
        setEditedCommentAttachments([]);
    }

    async function saveCommentEdit() {
        if (!editingCommentId || !editedCommentBody.trim()) return;
        const { error: apiError } = await apiClient.PATCH(
            "/api/comments/{id}",
            {
                params: { path: { id: editingCommentId } },
                body: {
                    body: editedCommentBody,
                    attachment_ids: editedCommentAttachments.map(
                        (att) => att.id,
                    ),
                },
            },
        );
        if (apiError) {
            toast({ ...copy.toasts.genericError, variant: "destructive" });
            return;
        }
        setEditingCommentId(null);
        setEditedCommentBody("");
        setEditedCommentAttachments([]);
        await refresh();
        toast(copy.toasts.commentUpdated);
    }

    async function changeAssignee(nextAssigneeId: string | null) {
        const { error: apiError } = await apiClient.PATCH(
            "/api/issues/{number}",
            {
                params: { path: { number: currentIssue.number.toString() } },
                body: { assignee_id: nextAssigneeId },
            },
        );
        if (apiError) {
            toast({ ...copy.toasts.genericError, variant: "destructive" });
            return;
        }
        await refresh();
    }

    async function attachLabel(labelId: string) {
        const { error: apiError } = await apiClient.POST(
            "/api/issues/{number}/labels",
            {
                params: { path: { number: currentIssue.number.toString() } },
                body: { label_id: labelId },
            },
        );
        if (apiError) {
            toast({ ...copy.toasts.genericError, variant: "destructive" });
            return;
        }
        await refresh();
    }

    async function detachLabel(labelId: string) {
        const { error: apiError } = await apiClient.DELETE(
            "/api/issues/{number}/labels/{labelId}",
            {
                params: {
                    path: {
                        number: currentIssue.number.toString(),
                        labelId,
                    },
                },
            },
        );
        if (apiError) {
            toast({ ...copy.toasts.genericError, variant: "destructive" });
            return;
        }
        await refresh();
    }

    async function submitComment(event: React.FormEvent) {
        event.preventDefault();
        if (!commentBody.trim()) return;

        const { error: apiError } = await apiClient.POST(
            "/api/issues/{number}/comments",
            {
                params: { path: { number: currentIssue.number.toString() } },
                body: {
                    body: commentBody,
                    attachment_ids: commentAttachments.map(
                        (attachment) => attachment.id,
                    ),
                },
            },
        );
        if (apiError) {
            toast({ ...copy.toasts.genericError, variant: "destructive" });
            return;
        }
        setCommentBody("");
        setCommentAttachments([]);
        await refresh();
        toast(copy.toasts.commentCreated);
    }

    async function deleteComment(id: string) {
        const { error: apiError } = await apiClient.DELETE(
            "/api/comments/{id}",
            { params: { path: { id } } },
        );
        if (apiError) {
            toast({ ...copy.toasts.genericError, variant: "destructive" });
            return;
        }
        await refresh();
        toast(copy.toasts.commentDeleted);
    }

    async function copyPrompt() {
        const prompt = issueToPrompt(
            {
                number: currentIssue.number,
                title: currentIssue.title,
                status: currentIssue.status,
                priority: currentIssue.priority,
                body: currentIssue.body,
                author: currentIssue.author,
                assignee: currentIssue.assignee,
                initiative: currentIssue.initiative,
                labels: currentIssue.labels.map((label) => ({ name: label.name })),
                created_at: currentIssue.created_at,
                updated_at: currentIssue.updated_at,
                closed_at: currentIssue.closed_at,
            },
            comments.map((comment) => ({
                author: comment.author,
                body: comment.body,
                created_at: comment.created_at,
            })),
        );
        await navigator.clipboard.writeText(prompt);
        toast(copy.toasts.copiedPrompt);
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div>
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-mono">#{currentIssue.number}</span>
                            <span>·</span>
                            <span>
                                filed by {currentIssue.author.name}{" "}
                                {formatDistanceToNow(
                                    new Date(currentIssue.created_at * 1000),
                                    { addSuffix: true },
                                )}
                            </span>
                        </div>
                        {isEditingIssue ? (
                            <input
                                type="text"
                                value={editedTitle}
                                onChange={(event) =>
                                    setEditedTitle(event.target.value)
                                }
                                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-2xl font-bold tracking-tight outline-none focus:ring-2 focus:ring-ring"
                            />
                        ) : (
                            <h1 className="mt-1 text-2xl font-bold tracking-tight">
                                {currentIssue.title}
                            </h1>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <StatusChip status={currentIssue.status} />
                            <PriorityChip priority={currentIssue.priority} />
                            {currentIssue.initiative && (
                                <LabelChip
                                    name={
                                        currentIssue.initiative.archived
                                            ? `${currentIssue.initiative.name} (archived)`
                                            : currentIssue.initiative.name
                                    }
                                    color={currentIssue.initiative.color}
                                    className={
                                        currentIssue.initiative.archived
                                            ? "opacity-50 line-through"
                                            : ""
                                    }
                                />
                            )}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {isEditingIssue ? (
                            <Fragment>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsEditingIssue(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={saveIssueEdit}
                                    disabled={!editedTitle.trim()}
                                >
                                    Save
                                </Button>
                            </Fragment>
                        ) : (
                            <Fragment>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={startEditingIssue}
                                >
                                    <Pencil className="mr-1 h-3.5 w-3.5" />
                                    Edit
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={copyPrompt}
                                >
                                    <Copy className="mr-1 h-3.5 w-3.5" />
                                    Copy to markdown
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(-1)}
                                >
                                    Back
                                </Button>
                            </Fragment>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Description
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isEditingIssue ? (
                                <div className="space-y-2">
                                    <MarkdownEditor
                                        value={editedBody}
                                        onChange={setEditedBody}
                                        onAttachmentUploaded={(attachment) =>
                                            setEditedBodyAttachments((prev) => [
                                                ...prev,
                                                attachment,
                                            ])
                                        }
                                        placeholder="Description…"
                                        minRows={8}
                                    />
                                    <AttachmentChips
                                        attachments={editedBodyAttachments}
                                        onRemove={(id) =>
                                            setEditedBodyAttachments((prev) =>
                                                prev.filter(
                                                    (att) => att.id !== id,
                                                ),
                                            )
                                        }
                                    />
                                </div>
                            ) : currentIssue.body.trim() ? (
                                <MarkdownView markdown={currentIssue.body} />
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Terse. Bold. No description provided.
                                </p>
                            )}
                            {!isEditingIssue && currentIssue.attachments.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-4">
                                    {currentIssue.attachments.map((attachment) => (
                                        <a
                                            key={attachment.id}
                                            href={attachment.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="rounded border border-border bg-muted px-2 py-1 text-xs hover:bg-accent"
                                        >
                                            {attachment.filename}
                                        </a>
                                    ))}
                                </div>
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
                                    {copy.emptyStates.commentList}
                                </p>
                            ) : (
                                comments.map((comment) => (
                                    <Fragment key={comment.id}>
                                        <div className="flex items-start gap-3 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                                            <Avatar className="h-8 w-8 shrink-0">
                                                <AvatarFallback className="text-xs">
                                                    {initials(
                                                        comment.author.name,
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>
                                                        <span className="font-medium text-foreground">
                                                            {
                                                                comment.author
                                                                    .name
                                                            }
                                                        </span>{" "}
                                                        ·{" "}
                                                        {formatDistanceToNow(
                                                            new Date(
                                                                comment.created_at *
                                                                    1000,
                                                            ),
                                                            { addSuffix: true },
                                                        )}
                                                    </span>
                                                    {(comment.author.id ===
                                                        user?.id ||
                                                        isOrgAdmin) &&
                                                        editingCommentId !==
                                                            comment.id && (
                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 px-2 text-xs"
                                                                    onClick={() =>
                                                                        startEditingComment(
                                                                            comment.id,
                                                                            comment.body,
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil className="h-3 w-3" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 px-2 text-xs"
                                                                    onClick={() =>
                                                                        deleteComment(
                                                                            comment.id,
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                </div>
                                                {editingCommentId ===
                                                comment.id ? (
                                                    <div className="mt-1 space-y-2">
                                                        <MarkdownEditor
                                                            value={
                                                                editedCommentBody
                                                            }
                                                            onChange={
                                                                setEditedCommentBody
                                                            }
                                                            onAttachmentUploaded={(
                                                                attachment,
                                                            ) =>
                                                                setEditedCommentAttachments(
                                                                    (prev) => [
                                                                        ...prev,
                                                                        attachment,
                                                                    ],
                                                                )
                                                            }
                                                            minRows={3}
                                                        />
                                                        <AttachmentChips
                                                            attachments={
                                                                editedCommentAttachments
                                                            }
                                                            onRemove={(id) =>
                                                                setEditedCommentAttachments(
                                                                    (prev) =>
                                                                        prev.filter(
                                                                            (
                                                                                att,
                                                                            ) =>
                                                                                att.id !==
                                                                                id,
                                                                        ),
                                                                )
                                                            }
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setEditingCommentId(
                                                                        null,
                                                                    );
                                                                    setEditedCommentBody(
                                                                        "",
                                                                    );
                                                                }}
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                onClick={
                                                                    saveCommentEdit
                                                                }
                                                                disabled={
                                                                    !editedCommentBody.trim()
                                                                }
                                                            >
                                                                Save
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="mt-1">
                                                        <MarkdownView
                                                            markdown={
                                                                comment.body
                                                            }
                                                        />
                                                    </div>
                                                )}
                                                {comment.attachments.length >
                                                    0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        {comment.attachments.map(
                                                            (attachment) => (
                                                                <a
                                                                    key={
                                                                        attachment.id
                                                                    }
                                                                    href={
                                                                        attachment.url
                                                                    }
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="rounded border border-border bg-muted px-2 py-0.5 text-xs hover:bg-accent"
                                                                >
                                                                    {
                                                                        attachment.filename
                                                                    }
                                                                </a>
                                                            ),
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Fragment>
                                ))
                            )}

                            <form
                                onSubmit={submitComment}
                                className="space-y-2 border-t border-border/50 pt-4"
                            >
                                <MarkdownEditor
                                    value={commentBody}
                                    onChange={setCommentBody}
                                    onAttachmentUploaded={(attachment) =>
                                        setCommentAttachments((prev) => [
                                            ...prev,
                                            attachment,
                                        ])
                                    }
                                    placeholder="Add a comment… or a hot take."
                                    minRows={4}
                                />
                                <AttachmentChips
                                    attachments={commentAttachments}
                                    onRemove={(id) =>
                                        setCommentAttachments((prev) =>
                                            prev.filter(
                                                (attachment) =>
                                                    attachment.id !== id,
                                            ),
                                        )
                                    }
                                />
                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={!commentBody.trim()}
                                    >
                                        Post comment
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <aside className="space-y-4">
                    <Card>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-1">
                                <p className="text-xs uppercase text-muted-foreground">
                                    Status
                                </p>
                                <Select
                                    value={currentIssue.status}
                                    onValueChange={(value) =>
                                        changeStatus(value as IssueStatus)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ISSUE_STATUSES.map((value) => (
                                            <SelectItem
                                                key={value}
                                                value={value}
                                            >
                                                {STATUS_META[value].label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs uppercase text-muted-foreground">
                                    Priority
                                </p>
                                <Select
                                    value={currentIssue.priority}
                                    onValueChange={(value) =>
                                        changePriority(value as IssuePriority)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ISSUE_PRIORITIES.map((value) => (
                                            <SelectItem
                                                key={value}
                                                value={value}
                                            >
                                                {PRIORITY_META[value].label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs uppercase text-muted-foreground">
                                    Assignee
                                </p>
                                <Select
                                    value={currentIssue.assignee?.id ?? UNASSIGNED}
                                    onValueChange={(value) =>
                                        changeAssignee(
                                            value === UNASSIGNED
                                                ? null
                                                : value,
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={UNASSIGNED}>
                                            Unassigned
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
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs uppercase text-muted-foreground">
                                    Labels
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {currentIssue.labels.length === 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            Untagged.
                                        </p>
                                    )}
                                    {currentIssue.labels.map((label) => (
                                        <LabelChip
                                            key={label.id}
                                            name={label.name}
                                            color={label.color}
                                            onRemove={() =>
                                                detachLabel(label.id)
                                            }
                                        />
                                    ))}
                                </div>
                                {availableLabels.length > 0 && (
                                    <Select
                                        value=""
                                        onValueChange={(value) =>
                                            attachLabel(value)
                                        }
                                    >
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Add label…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableLabels.map((label) => (
                                                <SelectItem
                                                    key={label.id}
                                                    value={label.id}
                                                >
                                                    {label.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            <div className="space-y-1 text-xs text-muted-foreground">
                                <p>
                                    <span className="uppercase">Author:</span>{" "}
                                    <span className="text-foreground">
                                        {currentIssue.author.name}
                                    </span>
                                </p>
                                {currentIssue.assignee && (
                                    <p>
                                        <span className="uppercase">
                                            Assignee:
                                        </span>{" "}
                                        <span className="text-foreground">
                                            {currentIssue.assignee.name}
                                        </span>
                                    </p>
                                )}
                                <p>
                                    <span className="uppercase">Created:</span>{" "}
                                    {formatFullDate(currentIssue.created_at)}
                                </p>
                                <p>
                                    <span className="uppercase">Updated:</span>{" "}
                                    {formatFullDate(currentIssue.updated_at)}
                                </p>
                                {currentIssue.closed_at && (
                                    <p>
                                        <span className="uppercase">
                                            Closed:
                                        </span>{" "}
                                        {formatFullDate(currentIssue.closed_at)}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </div>
    );
}
