import { cn } from "@/lib/utils";

interface LabelChipProps {
    name: string;
    color: string;
    onRemove?: () => void;
    className?: string;
}

export function LabelChip({ name, color, onRemove, className }: LabelChipProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                className,
            )}
            style={{
                borderColor: color,
                color,
                backgroundColor: `${color}1A`,
            }}
        >
            {name}
            {onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="ml-0.5 opacity-60 hover:opacity-100"
                    aria-label={`Remove ${name}`}
                >
                    ×
                </button>
            )}
        </span>
    );
}
