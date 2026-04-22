import { useState } from "react";
import { Link } from "react-router-dom";
import { Archive, Eye, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useInitiatives, useCreateInitiative } from "@/hooks/use-wontfix";
import { copy } from "@/lib/copy";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
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

const newInitiativeSchema = z.object({
    name: z.string().min(1, "Name is required").max(120),
    slug: z
        .string()
        .min(1, "Slug is required")
        .max(80)
        .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
    description: z.string().default(""),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

type NewInitiativeForm = z.infer<typeof newInitiativeSchema>;

export function InitiativesList() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [showArchived, setShowArchived] = useState(false);
    const { data, isLoading } = useInitiatives(showArchived);
    const createInitiative = useCreateInitiative();

    const [open, setOpen] = useState(false);
    const form = useForm<NewInitiativeForm>({
        resolver: zodResolver(newInitiativeSchema),
        defaultValues: {
            name: "",
            slug: "",
            description: "",
            color: COLOR_SWATCHES[0],
        },
    });

    const initiatives = data?.data ?? [];

    async function handleCreate(values: NewInitiativeForm) {
        try {
            await createInitiative.mutateAsync({
                name: values.name.trim(),
                slug: values.slug || slugify(values.name),
                description: values.description,
                color: values.color,
            });
            toast(copy.toasts.initiativeCreated);
            setOpen(false);
            form.reset();
            await queryClient.invalidateQueries({ queryKey: ["initiatives"] });
        } catch (error) {
            console.error(error);
            toast({ ...copy.toasts.genericError, variant: "destructive" });
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Initiatives
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        An umbrella for related issues. Or excuses.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={showArchived ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setShowArchived((prev) => !prev)}
                    >
                        <Archive className="mr-1 h-3.5 w-3.5" />
                        {showArchived ? "Hide archived" : "Show archived"}
                    </Button>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-1 h-4 w-4" />
                                New initiative
                            </Button>
                        </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>New initiative</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(handleCreate)}
                                className="space-y-4"
                            >
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    onChange={(event) => {
                                                        field.onChange(event);
                                                        const currentSlug =
                                                            form.getValues(
                                                                "slug",
                                                            );
                                                        const derived =
                                                            slugify(field.value);
                                                        if (
                                                            !currentSlug ||
                                                            currentSlug === derived
                                                        ) {
                                                            form.setValue(
                                                                "slug",
                                                                slugify(
                                                                    event.target
                                                                        .value,
                                                                ),
                                                            );
                                                        }
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="slug"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Slug</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <MarkdownEditor
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    minRows={4}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="color"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Color</FormLabel>
                                            <FormControl>
                                                <div className="flex gap-2">
                                                    {COLOR_SWATCHES.map(
                                                        (swatch) => (
                                                            <button
                                                                key={swatch}
                                                                type="button"
                                                                className={
                                                                    "h-7 w-7 rounded-full border-2 transition " +
                                                                    (field.value ===
                                                                    swatch
                                                                        ? "border-foreground"
                                                                        : "border-transparent")
                                                                }
                                                                style={{
                                                                    backgroundColor:
                                                                        swatch,
                                                                }}
                                                                onClick={() =>
                                                                    field.onChange(
                                                                        swatch,
                                                                    )
                                                                }
                                                                aria-label={`Pick ${swatch}`}
                                                            />
                                                        ),
                                                    )}
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={createInitiative.isPending}
                                    >
                                        {createInitiative.isPending
                                            ? "Creating…"
                                            : "Create"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                    </Dialog>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-14 w-full" />
                    ))}
                </div>
            ) : initiatives.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center text-muted-foreground">
                        <p className="text-lg font-medium">
                            {copy.emptyStates.initiativeList}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {initiatives.map((initiative) => (
                        <Link
                            key={initiative.id}
                            to={`/initiatives/${initiative.slug}`}
                            className={
                                "group rounded-md border border-border bg-card p-4 transition hover:bg-accent/40 " +
                                (initiative.archived_at ? "opacity-60" : "")
                            }
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: initiative.color }}
                                />
                                <span className="font-medium group-hover:text-primary">
                                    {initiative.name}
                                </span>
                                {initiative.archived_at && (
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                                        Archived
                                    </span>
                                )}
                                {initiative.is_public && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase text-emerald-700 dark:text-emerald-300">
                                        <Eye className="h-2.5 w-2.5" />
                                        Public
                                    </span>
                                )}
                            </div>
                            {initiative.description && (
                                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                    {initiative.description}
                                </p>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
