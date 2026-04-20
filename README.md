# Worker SaaS Template

A full-stack SaaS starter built on **Cloudflare Workers**. One project gives you a marketing site (SSR), a React dashboard (SPA), authentication, multi-tenant RBAC, a database, file storage, and a blog -- all deployed to the edge as a single Worker.

## Tech Stack

| Layer           | Technology                                         |
| --------------- | -------------------------------------------------- |
| Runtime         | Cloudflare Workers                                 |
| API             | Hono + Chanfana (OpenAPI)                          |
| Frontend (app)  | React 18, React Router, Tailwind CSS v4, shadcn/ui |
| Marketing site  | Hono JSX (SSR)                                     |
| Auth            | Better Auth (email/password, admin roles)          |
| Database        | Cloudflare D1 (SQLite) via Drizzle ORM             |
| File storage    | Cloudflare R2                                      |
| Email           | Resend (transactional)                             |
| Build           | Vite + @cloudflare/vite-plugin                     |
| Package manager | Bun                                                |

## Project Structure

```
src/
  worker/                  # Cloudflare Worker (server)
    index.ts               # Hono app entry — routes, CORS, SPA fallback
    types.ts               # AppEnv, AppContext, AuthContext, Env bindings
    db/
      schema.ts            # Drizzle schema (auth, orgs, RBAC, audit)
      client.ts            # Drizzle client factory
    lib/
      better-auth.ts       # Auth configuration (Better Auth + Drizzle adapter)
      base-endpoint.ts     # BaseEndpoint — extends OpenAPIRoute, adds getAuth/getDb/hasPermission
      audit.ts             # logAudit — writes to audit_log on every mutation
      email.ts             # Resend email sending helper
      password.ts          # Password hashing utilities
    middleware/
      db.ts                # dbMiddleware — injects Drizzle client into context
      permissions.ts       # resolveAuth — session resolution, org lookup, permission loading
      rate-limit.ts        # IP-based rate limiting (auth routes)
    routes/
      auth.ts              # /api/auth/* — Turnstile interception + Better Auth handler
      orgs/                # /api/orgs — organization CRUD
      users/               # /api/users — user management within org
      system/              # /api/system/* — global admin endpoints (user list, create, update)
    schemas/               # Zod request/response schemas per feature
    emails/                # Handlebars email templates
    dot-com/               # SSR marketing site
      seo.ts               # Site metadata, sitemap config
      layouts/base.tsx     # Base HTML layout
      components/          # Shared marketing components (nav, footer, blog card)
      pages/               # Landing, blog index, blog post, privacy, terms
      blog/loader.ts       # Markdown blog post loader

  react-app/               # React SPA (served under /app/*)
    public/                # Static assets (images, fonts)
    src/
      main.tsx             # React entry point
      app.tsx              # Router — login, signup, dashboard, system (admin-only)
      globals.css          # Tailwind CSS entry
      lib/
        auth-client.ts     # Better Auth React client
        api-client.ts      # Typed fetch client (openapi-fetch)
        api-types.d.ts     # Generated OpenAPI types
        utils.ts           # cn() and shared utilities
      hooks/               # useAuth, useToast, useTheme, useMobile
      components/
        ui/                # shadcn/ui primitives (button, input, select, table, dialog, date-picker, …)
        layout/            # Shell, header, sidebar
      pages/
        system/            # Admin-only pages (users)

  shared/                  # Code shared between worker and react-app
    types/index.ts         # Shared type definitions

content/
  blog/                    # Markdown blog posts (frontmatter + body)

scripts/
  generate-client.ts       # Generate typed API client from OpenAPI spec
  generate-sitemap.ts      # Generate sitemap.xml from pages + blog posts
  init-admin.ts            # Create initial admin user in D1
  seed/
    index.ts               # Seed the permissions catalog into D1

drizzle/                   # Generated migration files
```

## How It Works

The Worker handles three concerns via a single Hono app:

1. **Marketing site** (`/`, `/blog`, `/privacy`, `/terms`) -- server-rendered with Hono JSX. Includes SEO (structured data, sitemap, robots.txt).
2. **API** (`/api/*`) -- OpenAPI-documented endpoints via Chanfana, with Swagger UI at `/api/docs`. Auth is handled by Better Auth at `/api/auth/*`.
3. **Dashboard SPA** (`/app/*`) -- Vite-built React app. The Worker serves `index.html` for all `/app/*` paths, and React Router takes over client-side.

Static assets (JS, CSS, images) are served from a Cloudflare Workers Assets binding.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- Wrangler CLI (included as a dev dependency)

### 1. Clone and install

```sh
git clone <your-repo-url>
cd worker-saas-template
make install
```

### 2. Create Cloudflare resources

```sh
make setup
```

This creates a D1 database (`app-db`) and an R2 bucket (`app-files`). Copy the `database_id` from the output and update it in [wrangler.toml](wrangler.toml) (both the top-level and `env.production` entries).

### 3. Configure environment variables

```sh
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and set:

- `BETTER_AUTH_SECRET` -- a random string (minimum 32 characters). Generate one with `openssl rand -hex 32`.
- `RESEND_API_KEY` -- (optional) your [Resend](https://resend.com) API key for transactional emails.
- `TURNSTILE_SECRET_KEY` -- your [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) secret key. Required for sign-up.

### 4. Run database migrations

```sh
make migrate
```

This generates Drizzle migration files and applies them to your local D1 database.

### 5. Seed the permissions catalog

```sh
make seed
```

This inserts the global permission catalog (resources × actions × scopes) into D1. Re-running is safe — rows are skipped on conflict.

### 6. Create the initial admin user

```sh
make init-admin EMAIL=you@example.com NAME="Your Name" PASSWORD=changeme
```

This creates a user with `role = 'admin'` who can sign in immediately and access the system admin UI at `/app/system/users`. Change your password after first sign-in.

### 7. Start the dev server

```sh
make dev
```

- Marketing site: `http://localhost:8787`
- Dashboard: `http://localhost:8787/app`
- System admin: `http://localhost:8787/app/system/users` (admin role required)
- API docs: `http://localhost:8787/api/docs`
- OpenAPI spec: `http://localhost:8787/api/openapi.json`

## RBAC

The template ships with role-based access control scoped to organizations (multi-tenancy).

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

Users with `role = 'admin'` on the `user` table bypass all permission checks. They can switch the active organization via the `active_org` cookie, allowing them to act on behalf of any tenant.

Global admins have access to the **System admin UI** at `/app/system/users`, and the `AdminRoute` guard in [app.tsx](src/react-app/src/app.tsx) redirects non-admins away from all `/system/*` routes. A **System** section appears in the sidebar only for admin users.

### Adding permissions

Add new entries to the `PERMISSIONS` array in [scripts/seed/index.ts](scripts/seed/index.ts), then re-run `make seed`.

## System Admin UI

The `/app/system/users` page provides a platform-wide user management interface accessible only to global admins. Features:

- **DataTable** — lists all users with avatar, name/email, role badge, status (Active / Unverified / Banned), and join date
- **Search** — client-side filter by name or email
- **Create user** — name, email, password, and role; inserts directly into D1 with a hashed credential
- **Edit user** — update name and role
- **Ban / Unban** — toggle access with an optional ban reason

The backend routes live at `/api/system/*` and are gated by `auth.isGlobalAdmin`. Non-admins receive a `403`.

## Organization Onboarding

> **TODO:** This template does not include an organization creation flow triggered at sign-up. When a new user registers, they will have no org membership and will receive a `403` on any protected API route.
>
> You should implement one of the following patterns depending on your business model:
>
> - **Self-serve:** Auto-create an org + membership in a Better Auth `onSignUp` hook, or as a post-signup step in the dashboard.
> - **Invite-only:** Have an admin create the org and send an invite link that creates the membership on acceptance.
> - **Admin-provisioned:** Expose an admin-only endpoint to create orgs and assign users manually.

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

- API-level errors (e.g. "Invalid credentials") are set with `form.setError("root", { message: "..." })` and rendered manually since they are not field-level errors:

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

All mutations use `useMutation` from `@tanstack/react-query` and surface feedback via the `useToast` hook from `@/hooks/use-toast`. Never use raw `fetch().then()` for mutations — always wrap them in `useMutation` so you get loading state, error handling, and cache invalidation for free.

### Pattern

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

shadcn/ui components are in `src/react-app/src/components/ui/`. Add new ones with:

```sh
make ui-add COMPONENT=<name>
```

The following components ship with the template:

| Component       | Notes                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `button`        | Forwards refs via `React.forwardRef`                                                             |
| `input`         | Uses `bg-input` background                                                                       |
| `select`        | Uses `bg-input` background on the trigger                                                        |
| `date-picker`   | Composed from `calendar` + `popover`; uses `bg-input` on the trigger                             |
| `calendar`      | react-day-picker wrapper                                                                         |
| `popover`       | Radix UI popover                                                                                 |
| `table`         | thead / tbody / tr / td primitives                                                               |
| `dialog`        | Modal dialog                                                                                     |
| `alert-dialog`  | Confirmation dialog                                                                              |
| `dropdown-menu` | Contextual action menu                                                                           |
| `badge`         | Inline status pill                                                                               |
| `avatar`        | Avatar with initials fallback                                                                    |
| `card`          | Content card with header/content slots                                                           |
| `form`          | `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` — see [Forms](#forms) |
| `label`         | Form label                                                                                       |
| `separator`     | Visual divider                                                                                   |
| `sheet`         | Mobile drawer                                                                                    |
| `sidebar`       | App sidebar (collapsible)                                                                        |
| `skeleton`      | Loading placeholder                                                                              |
| `toast`         | Radix-based toast primitives                                                                     |
| `toaster`       | Renders active toasts — mounted once in `app.tsx`                                                |
| `tooltip`       | Hover tooltip                                                                                    |

## Adding API Routes

1. Add table(s) to [src/worker/db/schema.ts](src/worker/db/schema.ts) with an `orgId` FK.
2. Run `make db-generate` to generate the migration, then `make db-migrate` to apply it.
3. Add Zod schemas to `src/worker/schemas/<feature>.ts`.
4. Create a sub-router at `src/worker/routes/<feature>/index.ts` — export the `fromHono()` return value, not the raw Hono app.
5. Create endpoint classes in `src/worker/routes/<feature>/<operation>.ts` — extend `BaseEndpoint`, declare `schema`, call `hasPermission`, scope queries to `auth.orgId`, and call `logAudit` after mutations.
6. Add new permissions to [scripts/seed/index.ts](scripts/seed/index.ts) and re-run `make seed`.
7. Mount the sub-router in [src/worker/index.ts](src/worker/index.ts) via `openapi.route('/api/<feature>', featureRoutes)`.
8. Run `make generate-client` to regenerate the typed client at `src/react-app/src/lib/api-types.d.ts`.

## Common Tasks

| Command                                          | Description                                          |
| ------------------------------------------------ | ---------------------------------------------------- |
| `make dev`                                       | Start local dev server                               |
| `make build`                                     | Production build (Vite + sitemap)                    |
| `make preview`                                   | Build and preview locally with Wrangler              |
| `make db-generate`                               | Generate Drizzle migration files from schema changes |
| `make db-migrate`                                | Apply pending migrations to local D1                 |
| `make migrate`                                   | Generate and apply migrations locally (shorthand)    |
| `make migrate-prod`                              | Apply migrations to production D1                    |
| `make db-studio`                                 | Open Drizzle Studio (local DB browser)               |
| `make seed`                                      | Seed permissions catalog to local D1                 |
| `make seed-prod`                                 | Seed permissions catalog to production D1            |
| `make init-admin EMAIL=… NAME=… PASSWORD=…`      | Create initial admin user in local D1                |
| `make init-admin-prod EMAIL=… NAME=… PASSWORD=…` | Create initial admin user in production D1           |
| `make generate-client`                           | Regenerate typed API client from OpenAPI spec        |
| `make ui-add COMPONENT=button`                   | Add a shadcn/ui component                            |
| `make blog-new SLUG=my-post`                     | Scaffold a new blog post                             |
| `make deploy`                                    | Build and deploy to production                       |
| `make logs`                                      | Tail production logs                                 |
| `make typecheck`                                 | Run TypeScript type checking                         |
| `make help`                                      | Show all available commands                          |

## Adding Blog Posts

```sh
make blog-new SLUG=my-post-title
```

Edit the generated file at `content/blog/my-post-title.md`. Posts use YAML frontmatter (`title`, `slug`, `date`, `excerpt`, `tags`, `author`) and are rendered as HTML at `/blog/<slug>`.

## Deployment

1. Update `SITE_URL` in [src/worker/dot-com/seo.ts](src/worker/dot-com/seo.ts) with your production domain.
2. Set `BASE_URL` in the `[env.production.vars]` section of [wrangler.toml](wrangler.toml).
3. Set production secrets:
    ```sh
    bunx wrangler secret put BETTER_AUTH_SECRET --env production
    bunx wrangler secret put RESEND_API_KEY --env production
    bunx wrangler secret put TURNSTILE_SECRET_KEY --env production
    ```
4. Apply migrations, seed, and create the initial admin:
    ```sh
    make migrate-prod
    make seed-prod
    make init-admin-prod EMAIL=you@example.com NAME="Your Name" PASSWORD=changeme
    ```
5. Deploy:
    ```sh
    make deploy
    ```

## Path Aliases

Three path aliases are configured in both [tsconfig.json](tsconfig.json) and [vite.config.ts](vite.config.ts):

| Alias       | Path                  |
| ----------- | --------------------- |
| `@/*`       | `src/react-app/src/*` |
| `@worker/*` | `src/worker/*`        |
| `@shared/*` | `src/shared/*`        |
