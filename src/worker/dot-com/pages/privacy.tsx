/** @jsxImportSource hono/jsx */
import { BaseLayout } from "@worker/dot-com/layouts/base";
import { SITE_URL, SITE_NAME } from "@worker/dot-com/seo";

interface PrivacyPageProps {
  cssUrl: string;
}

export function PrivacyPage({ cssUrl }: PrivacyPageProps) {
  return (
    <BaseLayout
      title={`Privacy Policy — ${SITE_NAME}`}
      description={`${SITE_NAME}'s privacy policy. We respect your data and your privacy.`}
      canonicalUrl={`${SITE_URL}/privacy`}
      ogUrl={`${SITE_URL}/privacy`}
      cssUrl={cssUrl}
    >
      <section class="py-16 md:py-24">
        <div class="mx-auto max-w-3xl px-4">
          <h1 class="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Privacy Policy
          </h1>
          <p class="mt-2 text-sm text-muted-foreground">
            Last updated: March 2026
          </p>

          <div class="mt-10 space-y-8 text-muted-foreground leading-relaxed">
            <div>
              <h2 class="text-lg font-semibold text-foreground">
                What we collect
              </h2>
              <p class="mt-2">
                When you create an account, we collect the information needed to
                run the service: your email, display name, and the data you
                choose to enter.
              </p>
            </div>

            <div>
              <h2 class="text-lg font-semibold text-foreground">
                How we use your data
              </h2>
              <p class="mt-2">
                Your data is used to provide the service to you. We don't sell
                your data to third parties. We don't show you ads.
              </p>
            </div>

            <div>
              <h2 class="text-lg font-semibold text-foreground">Analytics</h2>
              <p class="mt-2">
                We use Cloudflare Web Analytics to understand how visitors use
                the marketing site. It does not use cookies, does not track
                individual users, and does not collect personal information.
              </p>
            </div>

            <div>
              <h2 class="text-lg font-semibold text-foreground">
                Where your data lives
              </h2>
              <p class="mt-2">
                This application runs on Cloudflare Workers. Your data is stored
                in Cloudflare D1 (a distributed SQLite database). Data is
                encrypted at rest and in transit.
              </p>
            </div>

            <div>
              <h2 class="text-lg font-semibold text-foreground">
                Data deletion
              </h2>
              <p class="mt-2">
                You can request deletion of your account and all associated data
                at any time by contacting us. We will process deletion requests
                within 30 days.
              </p>
            </div>

            <div>
              <h2 class="text-lg font-semibold text-foreground">Contact</h2>
              <p class="mt-2">
                Questions about this policy? Email us at{" "}
                <a
                  href="mailto:hello@your-app.example.com"
                  class="text-primary hover:underline"
                >
                  hello@your-app.example.com
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </BaseLayout>
  );
}
