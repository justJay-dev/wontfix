import { STATUS_META, type IssueStatus } from "@/lib/wontfix-enums";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatusChipProps {
    status: IssueStatus;
    className?: string;
}

export function StatusChip({ status, className }: StatusChipProps) {
    const meta = STATUS_META[status];
    return (
        <TooltipProvider delayDuration={150}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span
                        className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            meta.className,
                            className,
                        )}
                    >
                        {meta.label}
                    </span>
                </TooltipTrigger>
                <TooltipContent>{meta.tooltip}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
