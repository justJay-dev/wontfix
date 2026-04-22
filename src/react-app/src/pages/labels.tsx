import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useLabels, useCreateLabel } from "@/hooks/use-wontfix";
import { apiClient } from "@/lib/api-client";
import { copy } from "@/lib/copy";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LabelChip } from "@/components/issues/label-chip";

const COLOR_SWATCHES = [
    "#6b7280",
    "#4288c9",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#a855f7",
    "#ec4899",
];

export function LabelsPage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { data } = useLabels();
    const createLabel = useCreateLabel();

    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [color, setColor] = useState(COLOR_SWATCHES[0]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editColor, setEditColor] = useState(COLOR_SWATCHES[0]);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [confirmDeleteLabel, setConfirmDeleteLabel] = useState<{
        id: string;
        name: string;
    } | null>(null);

    const labels = data?.data ?? [];

    async function handleCreate(event: React.FormEvent) {
        event.preventDefault();
        if (!name.trim()) return;
        try {
            await createLabel.mutateAsync({ name: name.trim(), color });
            toast(copy.toasts.labelCreated);
            setOpen(false);
            setName("");
            setColor(COLOR_SWATCHES[0]);
            await queryClient.invalidateQueries({ queryKey: ["labels"] });
        } catch (error) {
            console.error(error);
            toast({ ...copy.toasts.genericError, variant: "destructive" });
        }
    }

    function startEdit(label: { id: string; name: string; color: string }) {
        setEditingId(label.id);
        setEditName(label.name);
        setEditColor(label.color);
    }

    async function saveEdit(event: React.FormEvent) {
        event.preventDefault();
        if (!editingId || !editName.trim()) return;
        setIsSavingEdit(true);
        const { error } = await apiClient.PATCH("/api/labels/{id}", {
            params: { path: { id: editingId } },
            body: { name: editName.trim(), color: editColor },
        });
        setIsSavingEdit(false);
        if (error) {
            toast({ ...copy.toasts.genericError, variant: "destructive" });
            return;
        }
        setEditingId(null);
        toast(copy.toasts.labelUpdated);
        await queryClient.invalidateQueries({ queryKey: ["labels"] });
    }

    async function handleDelete(id: string) {
        const { error } = await apiClient.DELETE("/api/labels/{id}", {
            params: { path: { id } },
        });
        if (error) {
            toast({ ...copy.toasts.genericError, variant: "destructive" });
            return;
        }
        toast(copy.toasts.labelDeleted);
        await queryClient.invalidateQueries({ queryKey: ["labels"] });
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Labels</h1>
                    <p className="text-sm text-muted-foreground">
                        Taxonomies for the untriaged.
                    </p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-1 h-4 w-4" />
                            New label
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>New label</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                    required
                                    value={name}
                                    onChange={(event) =>
                                        setName(event.target.value)
                                    }
                                    maxLength={32}
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
                                                (color === swatch
                                                    ? "border-foreground"
                                                    : "border-transparent")
                                            }
                                            style={{ backgroundColor: swatch }}
                                            onClick={() => setColor(swatch)}
                                        />
                                    ))}
                                </div>
                            </div>
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
                                    disabled={createLabel.isPending}
                                >
                                    {createLabel.isPending
                                        ? "Creating…"
                                        : "Create"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {labels.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center text-muted-foreground">
                        {copy.emptyStates.labelList}
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="flex flex-wrap gap-2 p-4">
                        {labels.map((label) => (
                            <div
                                key={label.id}
                                className="flex items-center gap-1"
                            >
                                <LabelChip
                                    name={label.name}
                                    color={label.color}
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => startEdit(label)}
                                    aria-label={`Edit ${label.name}`}
                                >
                                    <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() =>
                                        setConfirmDeleteLabel({
                                            id: label.id,
                                            name: label.name,
                                        })
                                    }
                                    aria-label={`Delete ${label.name}`}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <AlertDialog
                open={confirmDeleteLabel !== null}
                onOpenChange={(open) => !open && setConfirmDeleteLabel(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete "{confirmDeleteLabel?.name}"?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will untag every issue that uses this label.
                            You can recreate the label later, but re-tagging is
                            on you.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async () => {
                                if (confirmDeleteLabel) {
                                    await handleDelete(confirmDeleteLabel.id);
                                }
                                setConfirmDeleteLabel(null);
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog
                open={editingId !== null}
                onOpenChange={(open) => !open && setEditingId(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit label</DialogTitle>
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
                                maxLength={32}
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
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingId(null)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSavingEdit}>
                                {isSavingEdit ? "Saving…" : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
