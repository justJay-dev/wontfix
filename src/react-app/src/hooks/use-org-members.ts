import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export interface OrgMemberSummary {
    id: string;
    userId: string;
    name: string;
    email: string;
    image: string | null;
    role: string;
}

interface OrgMemberRaw {
    id: string;
    role: string;
    user: { id: string; name: string; email: string; image?: string | null };
}

export function useOrgMembers() {
    const { data: activeOrg } = authClient.useActiveOrganization();
    const organizationId = activeOrg?.id ?? "";
    const [members, setMembers] = useState<OrgMemberSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!organizationId) {
            setMembers([]);
            return;
        }
        let cancelled = false;
        setIsLoading(true);
        authClient.organization
            .getFullOrganization({ query: { organizationId } })
            .then((result) => {
                if (cancelled) return;
                const raw =
                    ((result.data as unknown as { members?: OrgMemberRaw[] })
                        ?.members ?? []) satisfies OrgMemberRaw[];
                setMembers(
                    raw.map((member) => ({
                        id: member.id,
                        userId: member.user.id,
                        name: member.user.name,
                        email: member.user.email,
                        image: member.user.image ?? null,
                        role: member.role,
                    })),
                );
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [organizationId]);

    return { members, isLoading };
}
