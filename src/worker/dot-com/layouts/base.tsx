/** @jsxImportSource hono/jsx */
import type { Child } from "hono/jsx";
import { html } from "hono/html";
import { Nav } from "@worker/dot-com/components/nav";
import { Footer } from "@worker/dot-com/components/footer";
import {
  SITE_NAME,
  DEFAULT_OG_IMAGE,
} from "@worker/dot-com/seo";

interface BaseLayoutProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogUrl?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown>;
  children: Child;
  cssUrl: string;
}

export function BaseLayout({
  title,
  description,
  canonicalUrl,
  ogUrl,
  ogImage,
  ogType,
  jsonLd,
  children,
  cssUrl,
}: BaseLayoutProps) {
  const resolvedCanonical = canonicalUrl ?? ogUrl;
  const resolvedImage = ogImage ?? DEFAULT_OG_IMAGE;
  return (
    <html lang="en" class="dark">
      <head>
        {/* Prevent flash of wrong theme */}
        {html`<script>
          (function () {
            var s = localStorage.getItem("app-theme");
            if (s === "light")
              document.documentElement.classList.remove("dark");
          })();
        </script>`}
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <meta name="description" content={description} />
        {resolvedCanonical && <link rel="canonical" href={resolvedCanonical} />}

        {/* Open Graph */}
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content={ogType ?? "website"} />
        {ogUrl && <meta property="og:url" content={ogUrl} />}
        <meta property="og:image" content={resolvedImage} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={resolvedImage} />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        {/* JSON-LD Structured Data */}
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(jsonLd),
            }}
          />
        )}

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossorigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cascadia+Code:wght@400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap"
          rel="stylesheet"
        />

        <link rel="stylesheet" href={cssUrl} />
      </head>
      <body class="min-h-screen bg-background text-foreground font-sans antialiased">
        <Nav />
        <main class="pt-14">{children}</main>
        <Footer />
        {/* Scroll-triggered animations */}
        {html`<script>
          (function () {
            var els = document.querySelectorAll("[data-animate]");
            if (!els.length || !("IntersectionObserver" in window)) {
              for (var f = 0; f < els.length; f++)
                els[f].classList.add("visible");
              return;
            }
            var ob = new IntersectionObserver(
              function (entries) {
                for (var idx = 0; idx < entries.length; idx++) {
                  if (entries[idx].isIntersecting) {
                    entries[idx].target.classList.add("visible");
                    ob.unobserve(entries[idx].target);
                  }
                }
              },
              {
                threshold: 0.15,
                rootMargin: "0px 0px -40px 0px",
              },
            );
            for (var idx = 0; idx < els.length; idx++) ob.observe(els[idx]);
          })();
        </script>`}
      </body>
    </html>
  );
}
