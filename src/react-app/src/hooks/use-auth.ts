import { useSession } from "@/lib/auth-client";

export function useAuth() {
  const { data: session, isPending: isLoading } = useSession();

  return {
    user: session?.user ?? null,
    session: session?.session ?? null,
    isLoading,
  };
}
