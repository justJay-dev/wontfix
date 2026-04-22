/** @jsxImportSource hono/jsx */
import { raw } from "hono/html";
import { BaseLayout } from "@worker/dot-com/layouts/base";
import { BlogCard } from "@worker/dot-com/components/blog-card";
import type { BlogPost } from "@worker/dot-com/blog/loader";
import { SITE_URL, SITE_NAME, SITE_TAGLINE } from "@worker/dot-com/seo";

interface LandingPageProps {
  cssUrl: string;
  recentPosts: BlogPost[];
}

const PRIORITIES = [
  {
    name: "lol",
    desc: "It’s in the backlog. Somewhere.",
    bg: "#3f3f46",
    fg: "#a1a1aa",
  },
  {
    name: "meh",
    desc: "Someone should look at this. Eventually.",
    bg: "#422006",
    fg: "#fbbf24",
  },
  {
    name: "spicy",
    desc: "Getting interesting. People are noticing.",
    bg: "#431407",
    fg: "#fb923c",
  },
  {
    name: "on_fire",
    desc: "The kind of bug that wakes you up at 3 am.",
    bg: "#450a0a",
    fg: "#f87171",
  },
  {
    name: "prod_is_down",
    desc: "Self-explanatory. All hands.",
    bg: "#4c0519",
    fg: "#fb7185",
  },
  {
    name: "an_executive_is_pissed",
    desc: "The real P0.",
    bg: "#3b0764",
    fg: "#c084fc",
  },
];

const MOCK_ISSUES = [
  {
    num: 7,
    title: 'Button color is "close enough"',
    priority: "lol",
    status: "wont_fix",
    pBg: "#3f3f46",
    pFg: "#a1a1aa",
    sBg: "#27272a",
    sFg: "#71717a",
  },
  {
    num: 23,
    title: "Dropdown haunted by CSS ghosts",
    priority: "meh",
    status: "todo",
    pBg: "#422006",
    pFg: "#fbbf24",
    sBg: "#1e293b",
    sFg: "#94a3b8",
  },
  {
    num: 41,
    title: "Search explodes if you paste emoji",
    priority: "spicy",
    status: "doing",
    pBg: "#431407",
    pFg: "#fb923c",
    sBg: "#422006",
    sFg: "#fbbf24",
  },
  {
    num: 89,
    title: "Homepage 500s after every deploy",
    priority: "on_fire",
    status: "doing",
    pBg: "#450a0a",
    pFg: "#f87171",
    sBg: "#422006",
    sFg: "#fbbf24",
  },
  {
    num: 90,
    title: "CEO locked out before board meeting",
    priority: "an_executive_is_pissed",
    status: "new",
    pBg: "#3b0764",
    pFg: "#c084fc",
    sBg: "#172554",
    sFg: "#60a5fa",
  },
];

const FEATURES = [
  {
    title: "Kanban & List Views",
    desc: "Board views are a premium upgrade somewhere else. Here you just pick the one you want.",
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="5" height="18" rx="1"/><rect x="9.5" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="7" rx="1"/></svg>',
  },
  {
    title: "Initiatives & Roadmaps",
    desc: "Group issues, publish a public roadmap. No 'Business tier' required.",
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
  },
  {
    title: "Team & Permissions",
    desc: "Unlimited seats. Unlimited orgs. The per-seat tax is someone else's business model.",
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  },
  {
    title: "File Attachments",
    desc: "Drop files on issues and comments. No storage tiers. No attachment limits behind a paywall.",
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
  },
  {
    title: "Comments & Threads",
    desc: "Discuss inline with markdown and file attachments. No 'collaboration add-on' required.",
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  },
  {
    title: "The wont_fix Status",
    desc: "Sometimes the answer is no. Close it, mark it, move on. No guilt.",
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
  },
];

export function LandingPage({ cssUrl, recentPosts }: LandingPageProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        description: `${SITE_NAME} — ${SITE_TAGLINE}`,
      },
      {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/og-default.png`,
      },
    ],
  };

  return (
    <BaseLayout
      title={`${SITE_NAME} — ${SITE_TAGLINE}`}
      description="A free, open-source issue tracker for teams who are tired of paying per seat to manage a backlog. Honest priorities, kanban boards, and public roadmaps."
      canonicalUrl={SITE_URL}
      ogUrl={SITE_URL}
      jsonLd={jsonLd}
      cssUrl={cssUrl}
    >
      {/* ── Hero ── */}
      <section class="relative overflow-hidden py-24 md:py-36">
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(224,155,61,0.1),transparent)]" />
        <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:64px_64px] opacity-30" />
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,transparent_40%,var(--background)_100%)]" />

        <div class="relative mx-auto max-w-6xl px-4">
          <div class="mx-auto max-w-3xl text-center">
            <h1
              data-animate="fade-up"
              class="font-display text-5xl tracking-tight text-foreground md:text-7xl leading-[1.08]"
            >
              Stop paying $14/seat to manage a backlog.
            </h1>
            <p
              data-animate="fade-up"
              data-delay="1"
              class="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl leading-relaxed"
            >
              wont fix is a free, open-source issue tracker with honest
              priorities, kanban boards, and public roadmaps. Self-host it or
              let us run it. No per-seat pricing. No feature gates. No
              enterprise sales calls.
            </p>
            <div
              data-animate="fade-up"
              data-delay="2"
              class="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <a
                href="/app/signup"
                class="inline-flex rounded-md bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Start for free
              </a>
              <a
                href="/app/login"
                class="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Already have an account? Log in
              </a>
            </div>
          </div>

          {/* Product mockup */}
          <div
            data-animate="scale-up"
            data-delay="3"
            class="mx-auto mt-16 max-w-4xl"
          >
            <div class="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
              <div class="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
                <div class="flex gap-1.5">
                  <div class="h-3 w-3 rounded-full bg-[#ff5f57]" />
                  <div class="h-3 w-3 rounded-full bg-[#febc2e]" />
                  <div class="h-3 w-3 rounded-full bg-[#28c840]" />
                </div>
                <span class="text-xs font-mono text-muted-foreground">
                  wontfix / acme-corp / issues
                </span>
              </div>
              <div class="divide-y divide-border">
                {MOCK_ISSUES.map((issue) => (
                  <div class="flex items-center gap-3 px-4 py-3 md:gap-4">
                    <span class="w-8 shrink-0 text-xs font-mono text-muted-foreground">
                      #{issue.num}
                    </span>
                    <span class="min-w-0 flex-1 truncate text-sm text-foreground">
                      {issue.title}
                    </span>
                    <span
                      class="hidden shrink-0 rounded-full px-2.5 py-0.5 text-xs font-mono font-medium sm:inline-block"
                      style={`background:${issue.pBg};color:${issue.pFg}`}
                    >
                      {issue.priority}
                    </span>
                    <span
                      class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-mono"
                      style={`background:${issue.sBg};color:${issue.sFg}${issue.status === "wont_fix" ? ";text-decoration:line-through" : ""}`}
                    >
                      {issue.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Priorities ── */}
      <section class="border-t border-border bg-card py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-4">
          <h2
            data-animate="fade-up"
            class="font-display text-center text-3xl tracking-tight text-foreground md:text-4xl"
          >
            Priorities that actually mean something.
          </h2>
          <p
            data-animate="fade-up"
            data-delay="1"
            class="mx-auto mt-4 max-w-lg text-center text-muted-foreground"
          >
            No more P0 through P4. Say what you mean.
          </p>
          <div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRIORITIES.map((p, i) => (
              <div
                data-animate="fade-up"
                data-delay={String(Math.min(i + 1, 6))}
                class="rounded-lg border border-border bg-background p-5"
                style={`border-left:3px solid ${p.fg}`}
              >
                <span
                  class="inline-block rounded-full px-3 py-1 text-xs font-mono font-semibold"
                  style={`background:${p.bg};color:${p.fg}`}
                >
                  {p.name}
                </span>
                <p class="mt-3 text-sm text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" class="py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-4">
          <h2
            data-animate="fade-up"
            class="font-display text-center text-3xl tracking-tight text-foreground md:text-4xl"
          >
            Everything they charge extra for.
          </h2>
          <p
            data-animate="fade-up"
            data-delay="1"
            class="mx-auto mt-4 max-w-lg text-center text-muted-foreground"
          >
            Open source. Self-hostable. Free forever.
          </p>
          <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                data-animate="fade-up"
                data-delay={String(Math.min(i + 1, 6))}
                class="rounded-lg border border-border bg-card p-6"
              >
                <div class="text-primary">{raw(f.icon)}</div>
                <h3 class="mt-4 text-lg font-semibold text-foreground">
                  {f.title}
                </h3>
                <p class="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Blog ── */}
      {recentPosts.length > 0 && (
        <section class="border-t border-border bg-card py-20 md:py-28">
          <div class="mx-auto max-w-6xl px-4">
            <h2
              data-animate="fade-up"
              class="font-display text-center text-3xl tracking-tight text-foreground md:text-4xl"
            >
              Dispatches
            </h2>
            <div class="mt-12 grid gap-6 md:grid-cols-3">
              {recentPosts.map((post, idx) => (
                <div data-animate="fade-up" data-delay={String(idx + 1)}>
                  <BlogCard post={post} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section class="relative overflow-hidden border-t border-border bg-[#1c1917] py-24 md:py-32">
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(224,155,61,0.12),transparent)]" />
        <div class="relative mx-auto max-w-2xl px-4 text-center">
          <h2
            data-animate="fade-up"
            class="font-display text-3xl tracking-tight text-primary md:text-5xl"
          >
            Free. Open source. No catch.
          </h2>
          <p
            data-animate="fade-up"
            data-delay="1"
            class="mt-4 text-lg text-[#a09890]"
          >
            Self-host it, fork it, or just sign up and start tracking.
          </p>
          <div
            data-animate="fade-up"
            data-delay="2"
            class="mt-8 flex flex-col items-center gap-4"
          >
            <a
              href="/app/signup"
              class="inline-flex rounded-md bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get started &mdash; free forever
            </a>
          </div>
        </div>
      </section>
    </BaseLayout>
  );
}
