/** @jsxImportSource hono/jsx */
import { BaseLayout } from "@worker/dot-com/layouts/base";
import { SITE_URL, SITE_NAME } from "@worker/dot-com/seo";

interface TermsPageProps {
  cssUrl: string;
}

export function TermsPage({ cssUrl }: TermsPageProps) {
  return (
    <BaseLayout
      title={`Terms of Service — ${SITE_NAME}`}
      description={`${SITE_NAME}'s terms of service.`}
      canonicalUrl={`${SITE_URL}/terms`}
      ogUrl={`${SITE_URL}/terms`}
      cssUrl={cssUrl}
    >
      <section class="py-16 md:py-24">
        <div class="mx-auto max-w-3xl px-4">
          <h1 class="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Terms of Service
          </h1>
          <p class="mt-2 text-sm text-muted-foreground">
            Last updated: March 2026
          </p>

          <div class="mt-10 space-y-8 text-muted-foreground leading-relaxed">
            <div>
              <h2 class="text-lg font-semibold text-foreground">The basics</h2>
              <p class="mt-2">
                By using this service, you agree to these terms. If you don't
                agree, don't use the service.
              </p>
            </div>

            <div>
              <h2 class="text-lg font-semibold text-foreground">
                Your account
              </h2>
              <p class="mt-2">
                You're responsible for your account and the data you enter. Keep
                your credentials secure. We're not liable for unauthorized
                access resulting from your failure to protect your login
                information.
              </p>
            </div>

            <div>
              <h2 class="text-lg font-semibold text-foreground">Your data</h2>
              <p class="mt-2">
                You own your data. The information you enter belongs to you. We
                store and process this data solely to provide the service. We do
                not sell, share, or monetize your data in any way beyond
                operating the service for you.
              </p>
            </div>

            <div>
              <h2 class="text-lg font-semibold text-foreground">
                Service availability
              </h2>
              <p class="mt-2">
                We aim for high availability but make no uptime guarantees. We
                may modify, suspend, or discontinue features as we develop the
                product.
              </p>
            </div>

            <div>
              <h2 class="text-lg font-semibold text-foreground">
                Acceptable use
              </h2>
              <p class="mt-2">
                Don't use this service for anything illegal. Don't attempt to
                access other users' data. Don't abuse the API or attempt to
                disrupt the service. We reserve the right to terminate accounts
                that violate these terms.
              </p>
            </div>

            <div>
              <h2 class="text-lg font-semibold text-foreground">
                Limitation of liability
              </h2>
              <p class="mt-2">
                The service is provided "as is" without warranties of any kind.
              </p>
            </div>

            <div>
              <h2 class="text-lg font-semibold text-foreground">
                Changes to these terms
              </h2>
              <p class="mt-2">
                We may update these terms as the product evolves. We'll notify
                registered users of material changes via email. Continued use
                after changes constitutes acceptance.
              </p>
            </div>

            <div>
              <h2 class="text-lg font-semibold text-foreground">Contact</h2>
              <p class="mt-2">
                Questions? Email us at{" "}
                <a
                  href="mailto:hello@wontfix.com"
                  class="text-primary hover:underline"
                >
                  hello@wontfix.com
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
