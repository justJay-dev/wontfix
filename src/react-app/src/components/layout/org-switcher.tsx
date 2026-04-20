import { Fragment, useState } from "react";
import { ChevronsUpDown, Plus, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

const createOrgSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    slug: z
        .string()
        .min(1, "Slug is required")
        .max(50)
        .regex(
            /^[a-z0-9-]+$/,
            "Slug must be lowercase alphanumeric with hyphens",
        ),
});

type CreateOrgFormValues = z.infer<typeof createOrgSchema>;

function CreateOrgDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { toast } = useToast();
    const form = useForm<CreateOrgFormValues>({
        resolver: zodResolver(createOrgSchema),
        defaultValues: { name: "", slug: "" },
    });

    async function onSubmit(values: CreateOrgFormValues) {
        const result = await authClient.organization.create({
            name: values.name,
            slug: values.slug,
        });
        if (result.error) {
            toast({
                title: "Failed to create organization",
                description: result.error.message ?? "Something went wrong.",
                variant: "destructive",
            });
            return;
        }
        toast({ title: "Organization created" });
        form.reset();
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Organization</DialogTitle>
                    <DialogDescription>
                        Create a new organization to collaborate with your team.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
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
                                            placeholder="Acme Inc."
                                            {...field}
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
                                        <Input
                                            placeholder="acme-inc"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={form.formState.isSubmitting}
                            >
                                {form.formState.isSubmitting
                                    ? "Creating..."
                                    : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export function OrgSwitcher() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [createOpen, setCreateOpen] = useState(false);
    const isAdmin = user?.role === "admin";

    const { data: activeOrg, isPending: activeLoading } =
        authClient.useActiveOrganization();
    const { data: orgs } = authClient.useListOrganizations();

    const orgList = orgs ?? [];

    async function handleSwitch(organizationId: string) {
        const result = await authClient.organization.setActive({
            organizationId,
        });
        if (result.error) {
            toast({
                title: "Failed to switch organization",
                description: result.error.message ?? "Something went wrong.",
                variant: "destructive",
            });
        }
    }

    return (
        <Fragment>
            <SidebarMenu>
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton className="w-full justify-between">
                                <div className="flex items-center gap-2 truncate">
                                    <Building2 className="h-4 w-4 shrink-0" />
                                    <span className="truncate">
                                        {activeLoading
                                            ? "Loading..."
                                            : activeOrg?.name ?? "No organization"}
                                    </span>
                                </div>
                                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-64"
                            align="start"
                            side="bottom"
                        >
                            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {orgList.length === 0 ? (
                                <DropdownMenuItem disabled>
                                    No organizations
                                </DropdownMenuItem>
                            ) : (
                                orgList.map((org) => (
                                    <DropdownMenuItem
                                        key={org.id}
                                        onClick={() => handleSwitch(org.id)}
                                        className={
                                            org.id === activeOrg?.id
                                                ? "bg-accent"
                                                : ""
                                        }
                                    >
                                        <Building2 className="mr-2 h-4 w-4" />
                                        <span className="truncate">
                                            {org.name}
                                        </span>
                                    </DropdownMenuItem>
                                ))
                            )}
                            {isAdmin && (
                                <Fragment>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => setCreateOpen(true)}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Organization
                                    </DropdownMenuItem>
                                </Fragment>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>
            <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
        </Fragment>
    );
}
