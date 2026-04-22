import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownViewProps {
    markdown: string;
    className?: string;
}

export function MarkdownView({ markdown, className }: MarkdownViewProps) {
    return (
        <div
            className={cn(
                "prose prose-sm max-w-none dark:prose-invert",
                "prose-headings:font-semibold prose-pre:bg-muted prose-pre:text-foreground",
                "prose-img:rounded-md prose-img:border prose-img:border-border",
                className,
            )}
        >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
    );
}
