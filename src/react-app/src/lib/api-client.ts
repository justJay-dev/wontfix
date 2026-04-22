import createClient from "openapi-fetch";
import type { paths } from "@/lib/api-types";

export const apiClient = createClient<paths>({
    baseUrl: "/",
});

// Single place that reacts to session-expired 401s. Skipped for the
// auth endpoints themselves (login/sign-up return 401s by design).
apiClient.use({
    onResponse({ request, response }) {
        if (response.status !== 401) return;
        const url = new URL(request.url);
        if (url.pathname.startsWith("/api/auth")) return;
        if (url.pathname.startsWith("/api/public")) return;
        if (typeof window === "undefined") return;
        if (window.location.pathname.startsWith("/app/login")) return;
        // Don't bounce visitors off public-view pages to sign in.
        if (window.location.pathname.startsWith("/app/public/")) return;
        const target = `/app/login?redirect=${encodeURIComponent(
            window.location.pathname + window.location.search,
        )}`;
        window.location.replace(target);
    },
});
