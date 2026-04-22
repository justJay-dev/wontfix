import {
    Fragment,
    useCallback,
    useRef,
    useState,
    type ClipboardEvent,
    type DragEvent,
} from "react";
import { Eye, Pencil } from "lucide-react";
import {
    useAttachmentUpload,
    type UploadedAttachment,
} from "@/hooks/use-attachment-upload";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MarkdownView } from "@/components/markdown/view";

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    onAttachmentUploaded?: (attachment: UploadedAttachment) => void;
    placeholder?: string;
    minRows?: number;
    className?: string;
}

function insertAtCursor(
    textarea: HTMLTextAreaElement,
    insertion: string,
): { next: string; cursor: number } {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    const next = `${before}${insertion}${after}`;
    return { next, cursor: start + insertion.length };
}

export function MarkdownEditor({
    value,
    onChange,
    onAttachmentUploaded,
    placeholder,
    minRows = 8,
    className,
}: MarkdownEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [mode, setMode] = useState<"edit" | "preview">("edit");
    const [dragOver, setDragOver] = useState(false);
    const { upload, isUploading } = useAttachmentUpload();

    const handleFile = useCallback(
        async (file: File) => {
            const attachment = await upload(file);
            onAttachmentUploaded?.(attachment);
            const isImage = attachment.content_type.startsWith("image/");
            const markdown = isImage
                ? `\n![${attachment.filename}](${attachment.url})\n`
                : `\n[${attachment.filename}](${attachment.url})\n`;
            const textarea = textareaRef.current;
            if (textarea) {
                const { next, cursor } = insertAtCursor(textarea, markdown);
                onChange(next);
                requestAnimationFrame(() => {
                    textarea.focus();
                    textarea.setSelectionRange(cursor, cursor);
                });
            } else {
                onChange(value + markdown);
            }
        },
        [upload, onAttachmentUploaded, onChange, value],
    );

    const onPaste = useCallback(
        async (event: ClipboardEvent<HTMLTextAreaElement>) => {
            const files = Array.from(event.clipboardData?.files ?? []);
            if (files.length === 0) return;
            event.preventDefault();
            for (const file of files) {
                try {
                    await handleFile(file);
                } catch (err) {
                    console.error("paste upload failed", err);
                }
            }
        },
        [handleFile],
    );

    const onDrop = useCallback(
        async (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setDragOver(false);
            const files = Array.from(event.dataTransfer?.files ?? []);
            for (const file of files) {
                try {
                    await handleFile(file);
                } catch (err) {
                    console.error("drop upload failed", err);
                }
            }
        },
        [handleFile],
    );

    return (
        <div
            className={cn(
                "rounded-md border border-input bg-background shadow-sm",
                dragOver && "ring-2 ring-primary",
                className,
            )}
            onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
        >
            <div className="flex items-center justify-between border-b border-border/50 px-2 py-1">
                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant={mode === "edit" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setMode("edit")}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Write</span>
                    </Button>
                    <Button
                        type="button"
                        variant={mode === "preview" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setMode("preview")}
                    >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Preview</span>
                    </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                    {isUploading
                        ? "Uploading…"
                        : "Drop or paste files to attach"}
                </span>
            </div>
            {mode === "edit" ? (
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onPaste={onPaste}
                    placeholder={placeholder}
                    rows={minRows}
                    className="w-full resize-y bg-transparent px-3 py-2 font-mono text-sm outline-none"
                />
            ) : (
                <div className="px-3 py-2 min-h-[10rem]">
                    {value.trim() ? (
                        <MarkdownView markdown={value} />
                    ) : (
                        <Fragment>
                            <p className="text-sm text-muted-foreground">
                                Nothing to preview yet.
                            </p>
                        </Fragment>
                    )}
                </div>
            )}
        </div>
    );
}
