# wontfix

A multi-tenant issue tracker built on **Cloudflare Workers**. Issues, initiatives (groupings of issues), comments, labels, file attachments, a public roadmap per org, and a marketing site with a blog — all deployed to the edge as a single Worker.

## Tech Stack

| Layer           | Technology                                         |
| --------------- | -------------------------------------------------- |
| Runtime         | Cloudflare Workers                                 |
| API             | Hono + Chanfana (OpenAPI)                          |
| Frontend (app)  | React 18, React Router, Tailwind CSS v4, shadcn/ui |
| Marketing site  | Hono JSX (SSR)                                     |
| Auth            | Better Auth (email/password, invitations, admin)   |
| Database        | Cloudflare D1 (SQLite) via Drizzle ORM             |
| File storage    | Cloudflare R2 (attachments)                        |
| Email           | Resend (transactional)                             |
| Editor          | MDX Editor (issue/comment bodies)                  |
| Build           | Vite + @cloudflare/vite-plugin                     |
| Package manager | Bun                                                |

## Project Structure

```
src/
  worker/                  # Cloudflare Worker (server)
    index.ts               # Hono app entry — routes, CORS, SPA fallback
    types.ts               # AppEnv, AppContext, AuthContext, Env bindings
    db/
      schema.ts            # Drizzle schema (auth, orgs, RBAC, issues, initiatives, ...)
      client.ts            # Drizzle client factory
    lib/
      better-auth.ts       # Auth configuration (Better Auth + Drizzle adapter)
      base-endpoint.ts     # BaseEndpoint — adds getAuth/getDb/hasPermission
      audit.ts             # logAudit — writes to audit_log on every mutation
      email.ts             # Resend email sending helper
      password.ts          # Password hashing utilities
    middleware/
      db.ts                # Injects Drizzle client into context
      permissions.ts       # Session resolution, org lookup, permission loading
      rate-limit.ts        # IP-based rate limiting (auth routes)
    routes/
      auth.ts              # /api/auth/* — Turnstile + Better Auth handler
      issues/              # /api/issues — CRUD, close, label add/remove
      initiatives/         # /api/initiatives — CRUD, archive/unarchive
      comments/            # /api/comments — per-issue threads
      labels/              # /api/labels — org-scoped labels
      attachments/         # /api/attachments — R2 upload/download
      public/              # /api/public — unauthenticated roadmap endpoints
      system/              # /api/system/* — global admin endpoints
    schemas/               # Zod request/response schemas per feature
    emails/                # Handlebars email templates
    dot-com/               # SSR marketing site (landing, blog, privacy, terms)

  react-app/               # React SPA (served under /app/*)
    src/
      app.tsx              # Router — login, signup, issues, initiatives, members, system
      lib/
        auth-client.ts     # Better Auth React client
        api-client.ts      # Typed fetch client (openapi-fetch)
        api-types.d.ts     # Generated OpenAPI types
      hooks/               # useAuth, useToast, useTheme, useMobile
      components/
        ui/                # shadcn/ui primitives
        layout/            # Shell, header, sidebar
      pages/
        issues/            # List, board (kanban), detail, new
        initiatives/       # List, detail
        public/            # Public initiative + issue views (no auth)
        system/            # Admin-only pages

content/blog/              # Markdown blog posts (frontmatter + body)
scripts/                   # bootstrap, seed, init-admin, generate-client, generate-sitemap
drizzle/                   # Generated migration files
```

## Data Model

- **Issues** — per-org auto-incrementing number, status (`new`, `in_progress`, `closed`, etc.), priority (`meh`, `spicy`, `on_fire`, `prod_is_down`, `an_executive_is_pissed`), optional initiative, author, assignee.
- **Initiatives** — named grouping of issues with a slug, color, description, and optional `isPublic` flag to expose at `/app/public/:orgSlug/:slug`.
- **Comments** — threaded under an issue.
- **Labels** — org-scoped, attached to issues many-to-many.
- **Attachments** — R2-backed file uploads on issues or comments.
- **Orgs + memberships + roles + permissions** — multi-tenant RBAC (see below).

## How It Works

The Worker handles three concerns via a single Hono app:

1. **Marketing site** (`/`, `/blog`, `/privacy`, `/terms`) — server-rendered with Hono JSX. Includes SEO (structured data, sitemap, robots.txt).
2. **API** (`/api/*`) — OpenAPI-documented endpoints via Chanfana, with Swagger UI at `/api/docs`. Auth is handled by Better Auth at `/api/auth/*`.
3. **Dashboard SPA** (`/app/*`) — Vite-built React app. The Worker serves `index.html` for all `/app/*` paths, and React Router takes over client-side.

Static assets are served from a Cloudflare Workers Assets binding.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- Wrangler CLI (included as a dev dependency)

### 1. Clone and install

```sh
git clone <your-repo-url>
cd wontfix
make setup
```

`make setup` installs deps and creates the D1 database and R2 bucket. Copy the printed `database_id` into [wrangler.toml](wrangler.toml) (top-level and `env.production`).

### 2. Configure environment variables

```sh
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and set:

- `BETTER_AUTH_SECRET` — random 32+ char string. `openssl rand -hex 32`.
- `RESEND_API_KEY` — (optional) [Resend](https://resend.com) API key for transactional email.
- `TURNSTILE_SECRET_KEY` — [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) secret key. Required for sign-up.

### 3. Bootstrap local DB

```sh
make generate-migrations
make migrate
make bootstrap EMAIL=you@example.com NAME="Your Name" PASSWORD=changeme
```

`make bootstrap` is idempotent: it creates an admin user, an org with a membership, default labels, and seeds the `wontfix` sample issues/initiatives/comments/attachments. Re-running is safe.

### 4. Start the dev server

```sh
make dev
```

- Marketing site: `http://localhost:8787`
- Dashboard: `http://localhost:8787/app`
- System admin: `http://localhost:8787/app/system/users` (admin only)
- API docs: `http://localhost:8787/api/docs`

## Public Roadmap

Initiatives with `isPublic = true` are reachable without auth at:

- `/app/public/:orgSlug/:initiativeSlug` — initiative overview with its issues
- `/app/public/:orgSlug/:initiativeSlug/:issueNumber` — individual issue

Backend is served by `/api/public/*`, which bypasses the normal auth middleware.

## RBAC

Role-based access control scoped to organizations (multi-tenancy).

### Data model

```
users ──────────────────────────────── (global accounts, one per person)
  │
  └── orgMemberships ─────────────── (user belongs to an org)
        │
        └── orgMembershipRoles ─────── (membership has many roles)
              │
              └── roles ──────────────── (role defined per org)
                    │
                    └── rolePermissions ─ (role grants many permissions)
                          │
                          └── permissions ─ (global catalog: resource + action + scope)
```

### Permission key format

Permissions are identified by a three-part string: `resource:action:scope`.

| Key              | Meaning                              |
| ---------------- | ------------------------------------ |
| `orgs:view:all`  | View the organization                |
| `orgs:edit:all`  | Edit the organization                |
| `users:view:all` | View all members                     |
| `users:edit:own` | Edit only your own profile           |
| `roles:edit:all` | Manage role definitions              |
| `*`              | All permissions (global admins only) |

### Global admins

Users with `role = 'admin'` on the `user` table bypass all permission checks. They can switch the active organization via the `active_org` cookie.

Global admins have access to the **System admin UI** at `/app/system/users`. The `AdminRoute` guard in [app.tsx](src/react-app/src/app.tsx) redirects non-admins away from `/system/*`.

### Adding permissions

Add entries to the `PERMISSIONS` array in [scripts/seed/index.ts](scripts/seed/index.ts), then re-run `make seed`.

## System Admin UI

`/app/system/users` — platform-wide user management for global admins:

- List all users with role badge, status (Active / Unverified / Banned), join date
- Client-side search
- Create user (inserts directly into D1 with a hashed credential)
- Edit name/role
- Ban / Unban with optional reason

Backend routes at `/api/system/*` are gated by `auth.isGlobalAdmin`. Non-admins get `403`.

## Forms

All forms use `react-hook-form` with `zod` validation and the shadcn `Form` component primitives from `@/components/ui/form`.

### Setup

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

const schema = z.object({
    email: z.string().email("Enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

function MyForm() {
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { email: "" },
    });

    function onSubmit(values: FormValues) {
        // ...
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input
                                    type="email"
                                    placeholder="you@example.com"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit">Submit</Button>
            </form>
        </Form>
    );
}
```

### Rules

- Always wrap the `<form>` element in `<Form {...form}>`. This provides the `FormProvider` context required by `FormLabel`, `FormControl`, and `FormMessage`.
- Always define a `zod` schema and pass it via `zodResolver`. Never manage form field state with `useState`.
- Each field follows the same structure: `FormField` → `FormItem` → `FormLabel` + `FormControl` + `FormMessage`.
- `FormControl` wraps the input. It automatically wires up `id`, `aria-invalid`, and `aria-describedby` — do not add these manually.
- `FormMessage` automatically renders the field's validation error. No manual `errors.field.message` checks needed.
- For `Select` fields, place `FormControl` around `SelectTrigger` only — not around the entire `Select`:

```tsx
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
```

- API-level errors (e.g. "Invalid credentials") are set with `form.setError("root", { message: "..." })` and rendered manually:

```tsx
{
    form.formState.errors.root && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {form.formState.errors.root.message}
        </p>
    );
}
```

## Mutations & Toasts

All mutations use `useMutation` from `@tanstack/react-query` and surface feedback via the `useToast` hook from `@/hooks/use-toast`. Never use raw `fetch().then()` for mutations — always wrap in `useMutation` so you get loading state, error handling, and cache invalidation.

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function MyComponent() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const updateThing = useMutation({
        mutationFn: async (values: UpdateValues) => {
            const response = await fetch(`/api/things/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
                credentials: "include",
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    (errorData as { error?: string }).error ?? "Failed to update",
                );
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/things"] });
            toast({ title: "Updated", description: "Thing was saved." });
        },
        onError: (error) => {
            toast({
                title: "Update failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    return (
        <Button
            onClick={() => updateThing.mutate(values)}
            disabled={updateThing.isPending}
        >
            {updateThing.isPending ? "Saving…" : "Save"}
        </Button>
    );
}
```

### Rules

- Always check `response.ok` inside `mutationFn` and throw on failure. Parse the error body for a user-facing message when available.
- Show a success toast in `onSuccess` after invalidating related queries.
- Show a destructive toast in `onError` with `variant: "destructive"`.
- Disable the submit button and show a loading label while `isPending` is true.
- The `<Toaster />` component is mounted once in [app.tsx](src/react-app/src/app.tsx) — do not add it elsewhere.

## UI Components

shadcn/ui components are in `src/react-app/src/components/ui/`. When adding new ones, **always pick the Radix-backed shadcn variant**, never an alternative primitive.

## Adding API Routes

1. Add table(s) to [src/worker/db/schema.ts](src/worker/db/schema.ts) with an `organizationId` FK.
2. `make generate-migrations` then `make migrate` to apply locally.
3. Add Zod schemas to `src/worker/schemas/<feature>.ts`.
4. Create a sub-router at `src/worker/routes/<feature>/index.ts` — export the `fromHono()` return value.
5. Create endpoint classes in `src/worker/routes/<feature>/<operation>.ts` — extend `BaseEndpoint`, declare `schema`, call `hasPermission`, scope queries to `auth.orgId`, and `logAudit` after mutations.
6. Add new permissions to [scripts/seed/index.ts](scripts/seed/index.ts) and re-run `make seed`.
7. Mount the sub-router in [src/worker/index.ts](src/worker/index.ts) via `openapi.route('/api/<feature>', featureRoutes)`.
8. Run `make generate-client` to regenerate the typed client at `src/react-app/src/lib/api-types.d.ts`.

## Make Targets

| Target                                             | What it does                                     |
| -------------------------------------------------- | ------------------------------------------------ |
| `make setup`                                       | Install deps + create CF D1 database + R2 bucket |
| `make install`                                     | Install dependencies                             |
| `make dev`                                         | Start local dev server                           |
| `make build`                                       | Production build (Vite + sitemap)                |
| `make preview`                                     | Build + preview locally with Wrangler            |
| `make generate-migrations`                         | Generate Drizzle migration from schema changes   |
| `make migrate`                                     | Apply pending migrations to local D1             |
| `make migrate-remote`                              | Apply pending migrations to production D1        |
| `make open-studio`                                 | Open Drizzle Studio                              |
| `make seed`                                        | Seed sample `wontfix` data to local D1           |
| `make seed-remote`                                 | Seed sample data to production D1                |
| `make create-admin EMAIL=… NAME=… PASSWORD=…`      | Create admin user in local D1                    |
| `make create-admin-remote EMAIL=… NAME=… PASSWORD=…` | Create admin user in production D1             |
| `make bootstrap EMAIL=… NAME=… PASSWORD=…`         | One-shot local setup (admin + org + seed data)   |
| `make bootstrap-remote EMAIL=… NAME=… PASSWORD=…`  | Bootstrap production D1 (use with care)          |
| `make generate-client`                             | Regenerate typed API client from OpenAPI spec    |
| `make generate-sitemap`                            | Regenerate sitemap.xml                           |
| `make typecheck`                                   | TypeScript type checking                         |
| `make format`                                      | Format code with Prettier                        |
| `make create-post SLUG=my-post`                    | Scaffold a new blog post                         |
| `make ship`                                        | Build and deploy to production                   |
| `make tail-logs`                                   | Tail production logs                             |

## Adding Blog Posts

```sh
make create-post SLUG=my-post-title
```

Edit `content/blog/my-post-title.md`. Posts use YAML frontmatter (`title`, `slug`, `date`, `excerpt`, `tags`, `author`) and are rendered at `/blog/<slug>`.

## Deployment

1. Update `SITE_URL` in [src/worker/dot-com/seo.ts](src/worker/dot-com/seo.ts) with your production domain.
2. Set `BASE_URL` in the `[env.production.vars]` section of [wrangler.toml](wrangler.toml).
3. Set production secrets:

    ```sh
    bunx wrangler secret put BETTER_AUTH_SECRET --remote
    bunx wrangler secret put RESEND_API_KEY --remote
    bunx wrangler secret put TURNSTILE_SECRET_KEY --remote
    ```

4. Apply migrations, seed permissions, and create the initial admin:

    ```sh
    make migrate-remote
    make seed-remote
    make create-admin-remote EMAIL=you@example.com NAME="Your Name" PASSWORD=changeme
    ```

5. Ship:

    ```sh
    make ship
    ```

## Path Aliases

| Alias       | Path                  |
| ----------- | --------------------- |
| `@/*`       | `src/react-app/src/*` |
| `@worker/*` | `src/worker/*`        |
| `@shared/*` | `src/shared/*`        |
