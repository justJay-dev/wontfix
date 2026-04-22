import { Fragment, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  KeyRound,
  Mail,
  MoreHorizontal,
  PlusCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCog,
} from "lucide-react";
import { format } from "date-fns";
import { authClient } from "@/lib/auth-client";
import type { operations } from "@/lib/api-types";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type SystemUser =
    operations["listSystemUsers"]["responses"]["200"]["content"]["application/json"]["data"][number];
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

// --- Schemas ---

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["user", "admin"]).default("user"),
});

const editUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  role: z.enum(["user", "admin"]),
});

const banUserSchema = z.object({
  ban_reason: z.string().max(500).optional(),
});

const setPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;
type EditUserFormValues = z.infer<typeof editUserSchema>;
type BanUserFormValues = z.infer<typeof banUserSchema>;
type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

// --- Helpers ---

function getUserInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(timestamp: number | string | null | undefined): string {
  if (timestamp === null || timestamp === undefined) return "—";
  const date =
    typeof timestamp === "number"
      ? new Date(timestamp * 1000)
      : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "MMM d, yyyy");
}

// --- Create User Dialog ---

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createUser = useMutation({
    mutationFn: async (values: CreateUserFormValues) => {
      const response = await fetch("/api/system/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as { error?: string }).error ?? "Failed to create user");
      }
      return response.json() as Promise<{ data: SystemUser }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system/users"] });
      onOpenChange(false);
      form.reset();
      toast({ title: "User created", description: "The new user account is ready." });
    },
    onError: (error) => {
      toast({ title: "Failed to create user", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", password: "", role: "user" },
  });

  function onSubmit(values: CreateUserFormValues) {
    createUser.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Create a new user account. They can sign in immediately with these credentials.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Min. 8 characters" {...field} />
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {createUser.error && (
              <p className="text-sm text-destructive">{createUser.error.message}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? "Creating…" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Edit User Dialog ---

interface EditUserDialogProps {
  user: SystemUser | null;
  onOpenChange: (open: boolean) => void;
}

function EditUserDialog({ user, onOpenChange }: EditUserDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    values: user ? { name: user.name, role: user.role as "user" | "admin" } : undefined,
  });

  const editUser = useMutation({
    mutationFn: async (values: EditUserFormValues) => {
      if (!user) return;
      const response = await fetch(`/api/system/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as { error?: string }).error ?? "Failed to update user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system/users"] });
      onOpenChange(false);
      toast({ title: "User updated", description: `${user?.name}'s account has been updated.` });
    },
    onError: (error) => {
      toast({ title: "Failed to update user", description: error.message, variant: "destructive" });
    },
  });

  function onSubmit(values: EditUserFormValues) {
    editUser.mutate(values);
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update {user?.name}&apos;s account details.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} />
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editUser.isPending}>
                {editUser.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Ban User Dialog ---

interface BanUserDialogProps {
  user: SystemUser | null;
  onOpenChange: (open: boolean) => void;
}

function BanUserDialog({ user, onOpenChange }: BanUserDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<BanUserFormValues>({
    resolver: zodResolver(banUserSchema),
    defaultValues: { ban_reason: "" },
  });

  const banMutation = useMutation({
    mutationFn: async (values: BanUserFormValues) => {
      if (!user) return;
      const response = await fetch(`/api/system/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: true, ban_reason: values.ban_reason || null }),
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as { error?: string }).error ?? "Failed to ban user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system/users"] });
      onOpenChange(false);
      form.reset();
      toast({ title: "User banned", description: `${user?.name} has been banned.` });
    },
    onError: (error) => {
      toast({ title: "Failed to ban user", description: error.message, variant: "destructive" });
    },
  });

  function onSubmit(values: BanUserFormValues) {
    banMutation.mutate(values);
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ban User</DialogTitle>
          <DialogDescription>
            Ban {user?.name} from accessing the platform. You can unban them at any time.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="ban_reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Reason for ban" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={banMutation.isPending}>
                {banMutation.isPending ? "Banning…" : "Ban User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Unban Confirm Dialog ---

interface UnbanDialogProps {
  user: SystemUser | null;
  onOpenChange: (open: boolean) => void;
}

function UnbanDialog({ user, onOpenChange }: UnbanDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const unbanMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const response = await fetch(`/api/system/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: false, ban_reason: null }),
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as { error?: string }).error ?? "Failed to unban user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system/users"] });
      onOpenChange(false);
      toast({ title: "User unbanned", description: `${user?.name}'s access has been restored.` });
    },
    onError: (error) => {
      toast({ title: "Failed to unban user", description: error.message, variant: "destructive" });
    },
  });

  return (
    <AlertDialog open={!!user} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unban {user?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will restore their access to the platform immediately.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => unbanMutation.mutate()}
            disabled={unbanMutation.isPending}
          >
            {unbanMutation.isPending ? "Unbanning…" : "Unban User"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// --- Set Password Dialog ---

interface SetPasswordDialogProps {
  user: SystemUser | null;
  onOpenChange: (open: boolean) => void;
}

function SetPasswordDialog({ user, onOpenChange }: SetPasswordDialogProps) {
  const { toast } = useToast();
  const form = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "" },
  });
  const mutation = useMutation({
    mutationFn: async (values: SetPasswordFormValues) => {
      if (!user) throw new Error("No user selected");
      const result = await authClient.admin.setUserPassword({
        userId: user.id,
        newPassword: values.password,
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to set password");
      }
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "The user can sign in with the new password immediately.",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to set password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: SetPasswordFormValues) {
    mutation.mutate(values);
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set password</DialogTitle>
          <DialogDescription>
            Assign a new password for {user?.name}. They can sign in with it
            immediately. Share it over a secure channel — they can change it
            from the sign-in flow afterwards.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
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
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save password"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Reset Password Dialog (email link) ---

interface ResetPasswordDialogProps {
  user: SystemUser | null;
  onOpenChange: (open: boolean) => void;
}

function ResetPasswordDialog({ user, onOpenChange }: ResetPasswordDialogProps) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user selected");
      const result = await authClient.forgetPassword({
        email: user.email,
        redirectTo: `${window.location.origin}/app/reset-password`,
      });
      if (result.error) {
        throw new Error(
          result.error.message ?? "Failed to send reset email",
        );
      }
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Reset email sent",
        description: `A password-reset link is on its way to ${user?.email}.`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to send reset email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AlertDialog open={!!user} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Send reset email to {user?.name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {user?.email} will receive a link to choose a new password. The
            link expires after use or after the token's TTL, whichever comes
            first.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Sending…" : "Send email"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// --- Delete User Dialog ---

interface DeleteUserDialogProps {
  user: SystemUser | null;
  onOpenChange: (open: boolean) => void;
}

function DeleteUserDialog({ user, onOpenChange }: DeleteUserDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No user selected");
      const result = await authClient.admin.removeUser({ userId: user.id });
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to delete user");
      }
      return result;
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: `${user?.name} has been removed from the platform.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/system/users"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AlertDialog open={!!user} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {user?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the user, their sessions, and credential
            accounts. Their authored issues and comments stay — those fields
            reference the user id, so history won't disappear, but no one can
            sign in as them again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Deleting…" : "Delete user"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// --- User Row Actions ---

interface UserRowActionsProps {
  user: SystemUser;
  onEdit: (user: SystemUser) => void;
  onBan: (user: SystemUser) => void;
  onUnban: (user: SystemUser) => void;
  onSetPassword: (user: SystemUser) => void;
  onResetPassword: (user: SystemUser) => void;
  onDelete: (user: SystemUser) => void;
}

function UserRowActions({
  user,
  onEdit,
  onBan,
  onUnban,
  onSetPassword,
  onResetPassword,
  onDelete,
}: UserRowActionsProps) {
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
        <DropdownMenuItem onClick={() => onEdit(user)}>
          <UserCog className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSetPassword(user)}>
          <KeyRound className="mr-2 h-4 w-4" />
          Set password
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onResetPassword(user)}>
          <Mail className="mr-2 h-4 w-4" />
          Send reset email
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {user.banned ? (
          <DropdownMenuItem onClick={() => onUnban(user)}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Unban
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => onBan(user)}
            className="text-destructive focus:text-destructive"
          >
            <ShieldAlert className="mr-2 h-4 w-4" />
            Ban
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => onDelete(user)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// --- Main Page ---

export function SystemUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<SystemUser | null>(null);
  const [banUser, setBanUser] = useState<SystemUser | null>(null);
  const [unbanUser, setUnbanUser] = useState<SystemUser | null>(null);
  const [setPasswordUser, setSetPasswordUser] = useState<SystemUser | null>(
    null,
  );
  const [resetPasswordUser, setResetPasswordUser] = useState<SystemUser | null>(
    null,
  );
  const [deleteUser, setDeleteUser] = useState<SystemUser | null>(null);

  const { data: settingsData } = useQuery({
    queryKey: ["/api/system/settings"],
    queryFn: async () => {
      const response = await fetch("/api/system/settings", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json() as Promise<{ data: { signups_enabled: boolean } }>;
    },
  });

  const toggleSignups = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch("/api/system/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signups_enabled: enabled }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update settings");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system/settings"] });
    },
    onError: (error) => {
      toast({ title: "Failed to update settings", description: error.message, variant: "destructive" });
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["/api/system/users"],
    queryFn: async () => {
      const response = await fetch("/api/system/users", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json() as Promise<{ data: SystemUser[] }>;
    },
  });

  const users = data?.data ?? [];

  const filteredUsers = search
    ? users.filter(
        (user) =>
          user.name.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  return (
    <Fragment>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Users</h1>
            <p className="text-sm text-muted-foreground">
              Manage all user accounts on the platform.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create User
          </Button>
        </div>

        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="space-y-0.5">
              <Label htmlFor="signups-toggle" className="text-sm font-medium">
                Allow signups
              </Label>
              <p className="text-xs text-muted-foreground">
                When disabled, only admins can create new accounts.
              </p>
            </div>
            <Switch
              id="signups-toggle"
              checked={settingsData?.data.signups_enabled ?? true}
              onCheckedChange={(checked) => toggleSignups.mutate(checked)}
              disabled={toggleSignups.isPending}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base font-medium">
                All Users
                {!isLoading && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({filteredUsers.length})
                  </span>
                )}
              </CardTitle>
              <div className="relative ml-auto w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Loading users…
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      {search ? "No users match your search." : "No users found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getUserInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{user.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.banned ? (
                          <Badge variant="destructive">Banned</Badge>
                        ) : user.emailVerified ? (
                          <Badge variant="outline">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Unverified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>
                        <UserRowActions
                          user={user}
                          onEdit={setEditUser}
                          onBan={setBanUser}
                          onUnban={setUnbanUser}
                          onSetPassword={setSetPasswordUser}
                          onResetPassword={setResetPasswordUser}
                          onDelete={setDeleteUser}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditUserDialog user={editUser} onOpenChange={(open) => !open && setEditUser(null)} />
      <BanUserDialog user={banUser} onOpenChange={(open) => !open && setBanUser(null)} />
      <UnbanDialog user={unbanUser} onOpenChange={(open) => !open && setUnbanUser(null)} />
      <SetPasswordDialog
        user={setPasswordUser}
        onOpenChange={(open) => !open && setSetPasswordUser(null)}
      />
      <ResetPasswordDialog
        user={resetPasswordUser}
        onOpenChange={(open) => !open && setResetPasswordUser(null)}
      />
      <DeleteUserDialog
        user={deleteUser}
        onOpenChange={(open) => !open && setDeleteUser(null)}
      />
    </Fragment>
  );
}
