import { Fragment, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    MoreHorizontal,
    UserPlus,
    Search,
    Mail,
    Clock,
    X,
} from "lucide-react";
import { format } from "date-fns";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

// --- Schemas ---

const inviteSchema = z.object({
    email: z.string().email("Invalid email address"),
    role: z.enum(["member", "admin", "owner"]).default("member"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

// --- Helpers ---

function getUserInitials(name: string): string {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function formatDate(dateValue: string | Date | number | null | undefined): string {
    if (!dateValue) return "--";
    const date =
        typeof dateValue === "number"
            ? new Date(dateValue * 1000)
            : new Date(dateValue);
    return format(date, "MMM d, yyyy");
}

function roleBadgeVariant(
    role: string,
): "default" | "secondary" | "outline" {
    switch (role) {
        case "owner":
            return "default";
        case "admin":
            return "secondary";
        default:
            return "outline";
    }
}

// --- Invite Dialog ---

interface InviteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: string;
}

function InviteDialog({
    open,
    onOpenChange,
    organizationId,
}: InviteDialogProps) {
    const { toast } = useToast();
    const form = useForm<InviteFormValues>({
        resolver: zodResolver(inviteSchema),
        defaultValues: { email: "", role: "member" },
    });

    async function onSubmit(values: InviteFormValues) {
        const result = await authClient.organization.inviteMember({
            email: values.email,
            role: values.role,
            organizationId,
        });
        if (result.error) {
            toast({
                title: "Failed to send invitation",
                description: result.error.message ?? "Something went wrong.",
                variant: "destructive",
            });
            return;
        }
        toast({
            title: "Invitation sent",
            description: `An invitation has been sent to ${values.email}.`,
        });
        form.reset();
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Invite Member</DialogTitle>
                    <DialogDescription>
                        Send an invitation to join this organization.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="colleague@example.com"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role</FormLabel>
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="member">
                                                Member
                                            </SelectItem>
                                            <SelectItem value="admin">
                                                Admin
                                            </SelectItem>
                                            <SelectItem value="owner">
                                                Owner
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
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
                                    ? "Sending..."
                                    : "Send Invitation"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// --- Change Role Dialog ---

interface ChangeRoleDialogProps {
    member: { id: string; user: { name: string }; role: string } | null;
    onOpenChange: (open: boolean) => void;
    organizationId: string;
}

function ChangeRoleDialog({
    member,
    onOpenChange,
    organizationId,
}: ChangeRoleDialogProps) {
    const { toast } = useToast();
    const [role, setRole] = useState(member?.role ?? "member");
    const [isPending, setIsPending] = useState(false);

    // Sync role when member changes
    if (member && role !== member.role && !isPending) {
        setRole(member.role);
    }

    async function handleSave() {
        if (!member) return;
        setIsPending(true);
        const result = await authClient.organization.updateMemberRole({
            memberId: member.id,
            role,
            organizationId,
        });
        setIsPending(false);
        if (result.error) {
            toast({
                title: "Failed to update role",
                description: result.error.message ?? "Something went wrong.",
                variant: "destructive",
            });
            return;
        }
        toast({
            title: "Role updated",
            description: `${member.user.name}'s role has been updated to ${role}.`,
        });
        onOpenChange(false);
    }

    return (
        <Dialog open={!!member} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Change Role</DialogTitle>
                    <DialogDescription>
                        Update {member?.user.name}'s role in this organization.
                    </DialogDescription>
                </DialogHeader>
                <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                </Select>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isPending}>
                        {isPending ? "Saving..." : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Remove Member Dialog ---

interface RemoveMemberDialogProps {
    member: { id: string; user: { name: string } } | null;
    onOpenChange: (open: boolean) => void;
    organizationId: string;
}

function RemoveMemberDialog({
    member,
    onOpenChange,
    organizationId,
}: RemoveMemberDialogProps) {
    const { toast } = useToast();
    const [isPending, setIsPending] = useState(false);

    async function handleRemove() {
        if (!member) return;
        setIsPending(true);
        const result = await authClient.organization.removeMember({
            memberIdOrEmail: member.id,
            organizationId,
        });
        setIsPending(false);
        if (result.error) {
            toast({
                title: "Failed to remove member",
                description: result.error.message ?? "Something went wrong.",
                variant: "destructive",
            });
            return;
        }
        toast({
            title: "Member removed",
            description: `${member.user.name} has been removed from the organization.`,
        });
        onOpenChange(false);
    }

    return (
        <AlertDialog open={!!member} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Remove {member?.user.name}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        This will revoke their access to this organization. They
                        can be re-invited later.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleRemove}
                        disabled={isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isPending ? "Removing..." : "Remove"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// --- Member Row Actions ---

interface MemberRowActionsProps {
    member: { id: string; user: { name: string }; role: string };
    onChangeRole: (member: MemberRowActionsProps["member"]) => void;
    onRemove: (member: MemberRowActionsProps["member"]) => void;
}

function MemberRowActions({
    member,
    onChangeRole,
    onRemove,
}: MemberRowActionsProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="sr-only">Open actions</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onChangeRole(member)}>
                    Change role
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => onRemove(member)}
                    className="text-destructive focus:text-destructive"
                >
                    Remove
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// --- Main Page ---

export function Members() {
    const { toast } = useToast();
    const [search, setSearch] = useState("");
    const [inviteOpen, setInviteOpen] = useState(false);
    const [changeRoleMember, setChangeRoleMember] = useState<{
        id: string;
        user: { name: string };
        role: string;
    } | null>(null);
    const [removeMember, setRemoveMember] = useState<{
        id: string;
        user: { name: string };
    } | null>(null);

    const { data: activeOrg } = authClient.useActiveOrganization();
    const organizationId = activeOrg?.id ?? "";

    interface OrgMember {
        id: string;
        role: string;
        createdAt: string;
        user: { id: string; name: string; email: string; image?: string };
    }

    interface OrgInvitation {
        id: string;
        email: string;
        role: string;
        status: string;
        expiresAt: string;
    }

    interface FullOrgData {
        members: OrgMember[];
        invitations: OrgInvitation[];
    }

    const [fullOrg, setFullOrg] = useState<FullOrgData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!organizationId) return;
        setIsLoading(true);
        authClient.organization
            .getFullOrganization({ query: { organizationId } })
            .then((result) => {
                if (result.data) {
                    setFullOrg(result.data as unknown as FullOrgData);
                }
            })
            .finally(() => setIsLoading(false));
    }, [organizationId]);

    const members: OrgMember[] = fullOrg?.members ?? [];
    const invitations: OrgInvitation[] = fullOrg?.invitations ?? [];

    const pendingInvitations = invitations.filter(
        (invitation) => invitation.status === "pending",
    );

    const filteredMembers = search
        ? members.filter(
              (member) =>
                  member.user.name
                      .toLowerCase()
                      .includes(search.toLowerCase()) ||
                  member.user.email
                      .toLowerCase()
                      .includes(search.toLowerCase()),
          )
        : members;

    async function handleCancelInvitation(invitationId: string) {
        const result = await authClient.organization.cancelInvitation({
            invitationId,
        });
        if (result.error) {
            toast({
                title: "Failed to cancel invitation",
                description: result.error.message ?? "Something went wrong.",
                variant: "destructive",
            });
            return;
        }
        toast({ title: "Invitation cancelled" });
    }

    if (!activeOrg) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-foreground">Members</h1>
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        No organization selected. Use the switcher in the
                        sidebar to select one.
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <Fragment>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Members
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Manage members and invitations for{" "}
                            {activeOrg.name}.
                        </p>
                    </div>
                    <Button onClick={() => setInviteOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite
                    </Button>
                </div>

                <Tabs defaultValue="members">
                    <TabsList>
                        <TabsTrigger value="members">
                            Members ({members.length})
                        </TabsTrigger>
                        <TabsTrigger value="invitations">
                            Invitations ({pendingInvitations.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="members" className="mt-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                    <CardTitle className="text-base font-medium">
                                        All Members
                                    </CardTitle>
                                    <div className="relative ml-auto w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by name or email..."
                                            value={search}
                                            onChange={(event) =>
                                                setSearch(event.target.value)
                                            }
                                            className="pl-8"
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Member</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Joined</TableHead>
                                            <TableHead className="w-10" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={4}
                                                    className="h-24 text-center text-muted-foreground"
                                                >
                                                    Loading members...
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredMembers.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={4}
                                                    className="h-24 text-center text-muted-foreground"
                                                >
                                                    {search
                                                        ? "No members match your search."
                                                        : "No members found."}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredMembers.map((member) => (
                                                <TableRow key={member.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarFallback className="text-xs">
                                                                    {getUserInitials(
                                                                        member
                                                                            .user
                                                                            .name,
                                                                    )}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium">
                                                                    {
                                                                        member
                                                                            .user
                                                                            .name
                                                                    }
                                                                </p>
                                                                <p className="truncate text-xs text-muted-foreground">
                                                                    {
                                                                        member
                                                                            .user
                                                                            .email
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={roleBadgeVariant(
                                                                member.role,
                                                            )}
                                                        >
                                                            {member.role}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {formatDate(
                                                            member.createdAt,
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <MemberRowActions
                                                            member={member}
                                                            onChangeRole={
                                                                setChangeRoleMember
                                                            }
                                                            onRemove={
                                                                setRemoveMember
                                                            }
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="invitations" className="mt-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-medium">
                                    Pending Invitations
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Expires</TableHead>
                                            <TableHead className="w-10" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingInvitations.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={4}
                                                    className="h-24 text-center text-muted-foreground"
                                                >
                                                    No pending invitations.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            pendingInvitations.map(
                                                (invitation) => (
                                                    <TableRow
                                                        key={invitation.id}
                                                    >
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                                <span className="text-sm">
                                                                    {
                                                                        invitation.email
                                                                    }
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={roleBadgeVariant(
                                                                    invitation.role,
                                                                )}
                                                            >
                                                                {
                                                                    invitation.role
                                                                }
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                <Clock className="h-3 w-3" />
                                                                {formatDate(
                                                                    invitation.expiresAt,
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0"
                                                                onClick={() =>
                                                                    handleCancelInvitation(
                                                                        invitation.id,
                                                                    )
                                                                }
                                                                title="Cancel invitation"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <InviteDialog
                open={inviteOpen}
                onOpenChange={setInviteOpen}
                organizationId={organizationId}
            />
            <ChangeRoleDialog
                member={changeRoleMember}
                onOpenChange={(open) => !open && setChangeRoleMember(null)}
                organizationId={organizationId}
            />
            <RemoveMemberDialog
                member={removeMember}
                onOpenChange={(open) => !open && setRemoveMember(null)}
                organizationId={organizationId}
            />
        </Fragment>
    );
}
