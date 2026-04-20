/** @jsxImportSource hono/jsx */
import { BaseLayout } from "@worker/dot-com/layouts/base";
import { BlogCard } from "@worker/dot-com/components/blog-card";
import type { BlogPost } from "@worker/dot-com/blog/loader";
import { SITE_URL, SITE_NAME, SITE_TAGLINE } from "@worker/dot-com/seo";

interface LandingPageProps {
  cssUrl: string;
  recentPosts: BlogPost[];
}

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
      description={`${SITE_NAME} — ${SITE_TAGLINE}`}
      canonicalUrl={SITE_URL}
      ogUrl={SITE_URL}
      jsonLd={jsonLd}
      cssUrl={cssUrl}
    >
      {/* Hero */}
      <section class="relative overflow-hidden py-24 md:py-32">
        <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:48px_48px] opacity-50" />
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,transparent_40%,var(--background)_100%)]" />
        <div class="relative mx-auto max-w-6xl px-4">
          <div class="mx-auto max-w-3xl text-center">
            <h1
              data-animate="fade-up"
              class="text-4xl font-bold tracking-tight text-foreground md:text-6xl"
            >
              Your headline here.
            </h1>
            <p
              data-animate="fade-up"
              data-delay="1"
              class="mt-6 text-lg text-muted-foreground md:text-xl"
            >
              A brief description of what your app does and why it matters.
            </p>
            <div
              data-animate="fade-up"
              data-delay="2"
              class="mt-10 flex flex-col items-center gap-4"
            >
              <a
                href="/app/signup"
                class="inline-flex rounded-md bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Get Started
              </a>
              <a
                href="/app/login"
                class="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Already have an account? Log in
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        class="border-t border-border bg-card py-20 md:py-28"
      >
        <div class="mx-auto max-w-6xl px-4">
          <h2
            data-animate="fade-up"
            class="text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl"
          >
            Everything you need.
          </h2>
          <div class="mt-12 grid gap-6 md:grid-cols-3">
            <div
              data-animate="fade-up"
              data-delay="1"
              class="rounded-lg border border-border bg-background p-6"
            >
              <h3 class="text-lg font-semibold text-foreground">Feature One</h3>
              <p class="mt-2 text-sm text-muted-foreground">
                Describe the first key feature of your application.
              </p>
            </div>
            <div
              data-animate="fade-up"
              data-delay="2"
              class="rounded-lg border border-border bg-background p-6"
            >
              <h3 class="text-lg font-semibold text-foreground">Feature Two</h3>
              <p class="mt-2 text-sm text-muted-foreground">
                Describe the second key feature of your application.
              </p>
            </div>
            <div
              data-animate="fade-up"
              data-delay="3"
              class="rounded-lg border border-border bg-background p-6"
            >
              <h3 class="text-lg font-semibold text-foreground">Feature Three</h3>
              <p class="mt-2 text-sm text-muted-foreground">
                Describe the third key feature of your application.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Preview */}
      {recentPosts.length > 0 && (
        <section class="py-20 md:py-28">
          <div class="mx-auto max-w-6xl px-4">
            <h2
              data-animate="fade-up"
              class="text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl"
            >
              From the blog
            </h2>
            <div class="mt-12 grid gap-6 md:grid-cols-3">
              {recentPosts.map((post, postIndex) => (
                <div data-animate="fade-up" data-delay={String(postIndex + 1)}>
                  <BlogCard post={post} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section class="relative overflow-hidden border-t border-border bg-primary py-24 md:py-32">
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(255,255,255,0.12),transparent)]" />
        <div class="relative mx-auto max-w-2xl px-4 text-center">
          <h2
            data-animate="fade-up"
            class="text-3xl font-bold tracking-tight text-white md:text-5xl"
          >
            Ready to get started?
          </h2>
          <p
            data-animate="fade-up"
            data-delay="1"
            class="mt-4 text-lg text-white/70"
          >
            Sign up today and see the difference.
          </p>
          <div
            data-animate="fade-up"
            data-delay="2"
            class="mt-8 flex flex-col items-center gap-4"
          >
            <a
              href="/app/signup"
              class="inline-flex rounded-md bg-white px-8 py-3 text-base font-semibold text-primary hover:bg-white/90 transition-colors"
            >
              Get Started
            </a>
          </div>
        </div>
      </section>
    </BaseLayout>
  );
}
