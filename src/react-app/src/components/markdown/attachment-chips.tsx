import { Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadedAttachment } from "@/hooks/use-attachment-upload";

interface AttachmentChipsProps {
    attachments: UploadedAttachment[];
    onRemove?: (id: string) => void;
    className?: string;
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentChips({
    attachments,
    onRemove,
    className,
}: AttachmentChipsProps) {
    if (attachments.length === 0) return null;
    return (
        <div className={cn("flex flex-wrap gap-1.5", className)}>
            {attachments.map((attachment) => (
                <span
                    key={attachment.id}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs"
                    title={`${attachment.content_type} · ${formatSize(attachment.size_bytes)}`}
                >
                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                    <a
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                    >
                        {attachment.filename}
                    </a>
                    <span className="text-muted-foreground">
                        {formatSize(attachment.size_bytes)}
                    </span>
                    {onRemove && (
                        <button
                            type="button"
                            onClick={() => onRemove(attachment.id)}
                            className="ml-0.5 text-muted-foreground hover:text-foreground"
                            aria-label={`Remove ${attachment.filename}`}
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </span>
            ))}
        </div>
    );
}
