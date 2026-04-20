import { fromHono } from "chanfana";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "@worker/routes/auth";
import { systemRoutes } from "@worker/routes/system/index";
import { dbMiddleware } from "@worker/middleware/db";
import { rateLimit } from "@worker/middleware/rate-limit";
import type { AppEnv } from "@worker/types";
import { logger, errorContext } from "@worker/lib/logger";
import { organizationApiPaths } from "@worker/lib/openapi-org-schema";
import { LandingPage } from "@worker/dot-com/pages/landing";
import { BlogIndexPage } from "@worker/dot-com/pages/blog-index";
import { BlogPostPage } from "@worker/dot-com/pages/blog-post";
import { PrivacyPage } from "@worker/dot-com/pages/privacy";
import { TermsPage } from "@worker/dot-com/pages/terms";
import { getAllPosts, getPostBySlug } from "@worker/dot-com/blog/loader";
import { SITE_URL, STATIC_PAGES } from "@worker/dot-com/seo";

const app = new Hono<AppEnv>();

// Global error handler
app.onError((error, ctx) => {
    const { errorMessage, errorName } = errorContext(error);
    logger.error("unhandled error", {
        errorMessage,
        errorName,
        method: ctx.req.method,
        path: ctx.req.path,
    });
    return ctx.json({ error: "Internal server error" }, 500);
});

// Request logging
app.use("*", async (ctx, next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    logger.info("request", {
        method: ctx.req.method,
        path: ctx.req.path,
        status: ctx.res.status,
        duration,
    });
});

// CORS — lock to BASE_URL in production, reflect request origin in dev.
app.use("*", async (ctx, next) => {
    const configuredOrigin = ctx.env.BASE_URL;
    return cors({
        origin: configuredOrigin
            ? configuredOrigin
            : (requestOrigin) => requestOrigin || "*",
        credentials: true,
    })(ctx, next);
});

// Inject DB client into context for all API routes
app.use("/api/*", dbMiddleware);

// Rate limit auth routes
app.use("/api/auth/*", rateLimit);

// Auth routes (Better Auth handler + Turnstile interception)
app.route("/api/auth", authRoutes);

// OpenAPI-documented feature routes
const openapi = fromHono(app, {
    docs_url: "/api/docs",
    openapi_url: "/api/openapi.json",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: {
        info: {
            title: "API",
            version: "0.1.0",
            description: "API documentation",
        },
        components: {
            securitySchemes: {
                session: {
                    type: "apiKey",
                    in: "cookie",
                    name: "better-auth.session_token",
                },
            },
        },
        paths: {
            ...organizationApiPaths,
        },
    } as any,
});

openapi.route("/api/system", systemRoutes);

// --- Marketing SSR routes ---

const isDev = !!(import.meta as unknown as { env: { DEV: boolean } }).env?.DEV;

function getCssUrl(): string {
    if (isDev) {
        return "/src/react-app/src/globals.css";
    }
    return "/assets/index.css";
}

app.get("/", (ctx) => {
    const cssUrl = getCssUrl();
    const recentPosts = getAllPosts().slice(0, 3);
    return ctx.html(LandingPage({ cssUrl, recentPosts }));
});

app.get("/robots.txt", (ctx) => {
    return ctx.text(
        [
            "User-agent: *",
            "Allow: /",
            "Disallow: /app/",
            "Disallow: /api/",
            "",
            `Sitemap: ${SITE_URL}/sitemap.xml`,
        ].join("\n"),
    );
});

app.get("/sitemap.xml", (ctx) => {
    const posts = getAllPosts();

    const staticEntries = STATIC_PAGES.map(
        (page) =>
            `  <url>\n    <loc>${SITE_URL}${page.path}</loc>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>${page.lastmod ? `\n    <lastmod>${page.lastmod}</lastmod>` : ""}\n  </url>`,
    );

    const postEntries = posts.map(
        (post) =>
            `  <url>\n    <loc>${SITE_URL}/blog/${post.slug}</loc>\n    <lastmod>${post.date}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
    );

    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...staticEntries,
        ...postEntries,
        "</urlset>",
    ].join("\n");

    return ctx.body(xml, 200, { "Content-Type": "application/xml" });
});

app.get("/privacy", (ctx) => {
    const cssUrl = getCssUrl();
    return ctx.html(PrivacyPage({ cssUrl }));
});

app.get("/terms", (ctx) => {
    const cssUrl = getCssUrl();
    return ctx.html(TermsPage({ cssUrl }));
});

app.get("/blog", (ctx) => {
    const cssUrl = getCssUrl();
    const posts = getAllPosts();
    return ctx.html(BlogIndexPage({ cssUrl, posts }));
});

app.get("/blog/:slug", (ctx) => {
    const cssUrl = getCssUrl();
    const post = getPostBySlug(ctx.req.param("slug"));
    if (!post) {
        return ctx.notFound();
    }
    return ctx.html(BlogPostPage({ cssUrl, post }));
});

// SPA fallback — serve index.html for all /app/* paths.
app.get("/app/*", (ctx) => {
    const url = new URL(ctx.req.url);
    url.pathname = "/index.html";
    return ctx.env.ASSETS.fetch(new Request(url.toString(), ctx.req.raw));
});

// Static asset passthrough for everything else (CSS, JS, images, fonts).
app.get("*", (ctx) => ctx.env.ASSETS.fetch(ctx.req.raw));

export default app;
