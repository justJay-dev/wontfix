import { useAuth } from "@/hooks/use-auth";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Mail } from "lucide-react";

export function Dashboard() {
    const { user } = useAuth();
    const { data: activeOrg } = authClient.useActiveOrganization();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Welcome, {user?.name ?? "there"}!</CardTitle>
                </CardHeader>
                <CardContent>
                    {activeOrg ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building2 className="h-4 w-4" />
                                <span>
                                    You are working in{" "}
                                    <span className="font-medium text-foreground">
                                        {activeOrg.name}
                                    </span>
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Use the sidebar to manage members, settings,
                                and more.
                            </p>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">
                            No organization selected. Use the switcher in the
                            sidebar to get started.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
