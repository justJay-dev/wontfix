import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useInitiatives, useCreateIssue } from "@/hooks/use-wontfix";
import { useOrgMembers } from "@/hooks/use-org-members";
import {
    ISSUE_PRIORITIES,
    PRIORITY_META,
    NO_INITIATIVE,
    UNASSIGNED,
    type IssuePriority,
} from "@/lib/wontfix-enums";
import { copy } from "@/lib/copy";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownEditor } from "@/components/markdown/editor";
import { AttachmentChips } from "@/components/markdown/attachment-chips";
import type { UploadedAttachment } from "@/hooks/use-attachment-upload";

export function NewIssue() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const { data: initiativesData } = useInitiatives();
    const { members } = useOrgMembers();
    const createIssue = useCreateIssue();

    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [priority, setPriority] = useState<IssuePriority>("meh");
    const [initiativeId, setInitiativeId] = useState<string>(
        searchParams.get("initiative") ?? NO_INITIATIVE,
    );
    const [assigneeId, setAssigneeId] = useState<string>(UNASSIGNED);
    const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);

    const initiatives = initiativesData?.data ?? [];

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (!title.trim()) return;

        try {
            const result = await createIssue.mutateAsync({
                title: title.trim(),
                body,
                priority,
                initiative_id:
                    initiativeId === NO_INITIATIVE ? null : initiativeId,
                assignee_id:
                    assigneeId === UNASSIGNED ? null : assigneeId,
                attachment_ids: attachments.map((attachment) => attachment.id),
            });
            toast(copy.toasts.issueCreated);
            navigate(`/issues/${result.data.number}`);
        } catch (error) {
            console.error(error);
            toast({
                ...copy.toasts.genericError,
                variant: "destructive",
            });
        }
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">New issue</h1>
                <p className="text-sm text-muted-foreground">
                    Describe the problem. Be specific. We'll judge you either way.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                required
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder="Login button shows a 500 on Fridays"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                                <Label>Initiative</Label>
                                <Select
                                    value={initiativeId}
                                    onValueChange={setInitiativeId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="No initiative" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={NO_INITIATIVE}>
                                            No initiative
                                        </SelectItem>
                                        {initiatives.map((initiative) => (
                                            <SelectItem
                                                key={initiative.id}
                                                value={initiative.id}
                                            >
                                                {initiative.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Priority</Label>
                                <Select
                                    value={priority}
                                    onValueChange={(value) =>
                                        setPriority(value as IssuePriority)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ISSUE_PRIORITIES.map((value) => (
                                            <SelectItem key={value} value={value}>
                                                {PRIORITY_META[value].label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Assignee</Label>
                                <Select
                                    value={assigneeId}
                                    onValueChange={setAssigneeId}
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
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <MarkdownEditor
                                value={body}
                                onChange={setBody}
                                onAttachmentUploaded={(attachment) =>
                                    setAttachments((prev) => [
                                        ...prev,
                                        attachment,
                                    ])
                                }
                                placeholder="Steps to reproduce, expected vs. actual, memes, etc."
                                minRows={10}
                            />
                            <AttachmentChips
                                attachments={attachments}
                                onRemove={(id) =>
                                    setAttachments((prev) =>
                                        prev.filter((att) => att.id !== id),
                                    )
                                }
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(-1)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    createIssue.isPending || !title.trim()
                                }
                            >
                                {createIssue.isPending
                                    ? "Filing…"
                                    : "File issue"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
