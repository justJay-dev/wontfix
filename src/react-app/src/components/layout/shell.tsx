import { useEffect, useRef } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/hooks/use-auth";
import { copy } from "@/lib/copy";

interface ShellProps {
    children: React.ReactNode;
}

function Loading() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
    );
}

function NoOrg() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background p-6 text-center">
            <h1 className="text-2xl font-bold">{copy.brand.name}</h1>
            <p className="text-sm text-muted-foreground">
                You aren't a member of any organization yet.
            </p>
            <p className="text-sm text-muted-foreground">
                {isAdmin
                    ? "Create one from the sidebar switcher — or run `make bootstrap` to get going."
                    : "Ask an admin to invite you."}
            </p>
        </div>
    );
}

export function Shell({ children }: ShellProps) {
    const { data: activeOrg, isPending: activeLoading } =
        authClient.useActiveOrganization();
    const { data: orgs, isPending: orgsLoading } =
        authClient.useListOrganizations();

    // Auto-pick the first org if the session has no active one but the
    // user is a member somewhere. Without this every org-scoped API call
    // returns 403 on a fresh session.
    const autoSwitchAttempted = useRef(false);
    useEffect(() => {
        if (autoSwitchAttempted.current) return;
        if (activeLoading || orgsLoading) return;
        if (activeOrg) return;
        if (!orgs || orgs.length === 0) return;
        autoSwitchAttempted.current = true;
        authClient.organization.setActive({ organizationId: orgs[0].id });
    }, [activeOrg, activeLoading, orgs, orgsLoading]);

    if (activeLoading || orgsLoading) return <Loading />;
    if (!orgs || orgs.length === 0) return <NoOrg />;
    // Auto-switch in flight — show loading until activeOrg resolves.
    if (!activeOrg) return <Loading />;

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <Header />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
