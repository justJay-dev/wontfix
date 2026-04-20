import { createAuthClient } from "better-auth/react";
import { adminClient, organizationClient } from "better-auth/client/plugins";
import { ac } from "@worker/lib/access-control";

export const authClient = createAuthClient({
    plugins: [adminClient(), organizationClient({ ac })],
});

export const { signIn, signUp, signOut, useSession } = authClient;
