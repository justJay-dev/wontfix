import { Fragment, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export function AcceptInvitation() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);

    const [invitation, setInvitation] = useState<{
        organizationName: string;
        inviterEmail: string;
        role: string;
    } | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        authClient.organization
            .getInvitation({ query: { id } })
            .then((result) => {
                if (result.error) {
                    setFetchError(
                        result.error.message ??
                            "Invitation not found or has expired.",
                    );
                    return;
                }
                if (result.data) {
                    setInvitation({
                        organizationName: result.data.organizationName,
                        inviterEmail: result.data.inviterEmail,
                        role: result.data.role,
                    });
                }
            })
            .catch(() => {
                setFetchError("Could not load the invitation.");
            });
    }, [id]);

    async function handleAccept() {
        if (!id) return;
        setIsLoading(true);
        const result = await authClient.organization.acceptInvitation({
            invitationId: id,
        });
        setIsLoading(false);
        if (result.error) {
            toast({
                title: "Failed to accept invitation",
                description: result.error.message ?? "Something went wrong.",
                variant: "destructive",
            });
            return;
        }
        toast({
            title: "Invitation accepted",
            description: "You have joined the organization.",
        });
        navigate("/");
    }

    async function handleReject() {
        if (!id) return;
        setIsRejecting(true);
        const result = await authClient.organization.rejectInvitation({
            invitationId: id,
        });
        setIsRejecting(false);
        if (result.error) {
            toast({
                title: "Failed to decline invitation",
                description: result.error.message ?? "Something went wrong.",
                variant: "destructive",
            });
            return;
        }
        toast({ title: "Invitation declined" });
        navigate("/");
    }

    if (fetchError) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Invalid invitation</CardTitle>
                        <CardDescription>{fetchError}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button variant="outline" onClick={() => navigate("/")}>
                            Go to dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (!invitation) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <p className="text-sm text-muted-foreground">
                    Loading invitation…
                </p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>You've been invited</CardTitle>
                    <CardDescription>
                        <strong>{invitation.inviterEmail}</strong> has invited
                        you to join{" "}
                        <strong>{invitation.organizationName}</strong> as a{" "}
                        <strong>{invitation.role}</strong>.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex gap-3">
                    <Button
                        onClick={handleAccept}
                        disabled={isLoading || isRejecting}
                    >
                        {isLoading ? "Accepting…" : "Accept"}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleReject}
                        disabled={isLoading || isRejecting}
                    >
                        {isRejecting ? "Declining…" : "Decline"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
