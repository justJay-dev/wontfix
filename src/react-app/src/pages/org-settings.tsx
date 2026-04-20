import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const orgSettingsSchema = z.object({
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

type OrgSettingsFormValues = z.infer<typeof orgSettingsSchema>;

export function OrgSettings() {
    const { toast } = useToast();
    const { data: activeOrg, isPending } = authClient.useActiveOrganization();

    const form = useForm<OrgSettingsFormValues>({
        resolver: zodResolver(orgSettingsSchema),
        values: activeOrg
            ? { name: activeOrg.name, slug: activeOrg.slug }
            : undefined,
    });

    async function onSubmit(values: OrgSettingsFormValues) {
        if (!activeOrg) return;
        const result = await authClient.organization.update({
            organizationId: activeOrg.id,
            data: {
                name: values.name,
                slug: values.slug,
            },
        });
        if (result.error) {
            toast({
                title: "Failed to update organization",
                description: result.error.message ?? "Something went wrong.",
                variant: "destructive",
            });
            return;
        }
        toast({ title: "Organization updated" });
    }

    if (!activeOrg && !isPending) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-foreground">
                    Organization Settings
                </h1>
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        No organization selected. Use the switcher in the
                        sidebar to select one.
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isPending) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-foreground">
                    Organization Settings
                </h1>
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        Loading...
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">
                    Organization Settings
                </h1>
                <p className="text-sm text-muted-foreground">
                    Manage settings for {activeOrg?.name}.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium">
                        General
                    </CardTitle>
                </CardHeader>
                <CardContent>
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
                                        <FormLabel>Organization Name</FormLabel>
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
                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={form.formState.isSubmitting}
                                >
                                    {form.formState.isSubmitting
                                        ? "Saving..."
                                        : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Separator />

            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-base font-medium text-destructive">
                        Danger Zone
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">
                                Delete Organization
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Permanently delete this organization and all
                                associated data.
                            </p>
                        </div>
                        <DeleteOrgButton organizationId={activeOrg?.id ?? ""} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function DeleteOrgButton({
    organizationId,
}: {
    organizationId: string;
}) {
    const { toast } = useToast();

    async function handleDelete() {
        const result = await authClient.organization.delete({
            organizationId,
        });
        if (result.error) {
            toast({
                title: "Failed to delete organization",
                description: result.error.message ?? "Something went wrong.",
                variant: "destructive",
            });
        }
    }

    return (
        <Button variant="destructive" size="sm" onClick={handleDelete}>
            Delete
        </Button>
    );
}
