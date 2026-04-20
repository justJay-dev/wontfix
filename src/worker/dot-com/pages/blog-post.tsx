/** @jsxImportSource hono/jsx */
import { raw } from "hono/html";
import { BaseLayout } from "@worker/dot-com/layouts/base";
import type { BlogPost } from "@worker/dot-com/blog/loader";
import { SITE_URL, SITE_NAME } from "@worker/dot-com/seo";

interface BlogPostProps {
  cssUrl: string;
  post: BlogPost;
}

export function BlogPostPage({ cssUrl, post }: BlogPostProps) {
  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    url: postUrl,
    author: {
      "@type": "Organization",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return (
    <BaseLayout
      title={`${post.title} — ${SITE_NAME}`}
      description={post.excerpt}
      canonicalUrl={postUrl}
      ogUrl={postUrl}
      ogType="article"
      jsonLd={jsonLd}
      cssUrl={cssUrl}
    >
      <article class="py-10 md:py-14">
        <div class="mx-auto max-w-3xl px-4">
          <div class="rounded-lg border border-border bg-card shadow-md">
            <header class="px-8 pt-10 pb-8 md:px-12 md:pt-12 border-b border-border">
              <time class="text-sm text-muted-foreground font-mono">
                {post.date}
              </time>
              <h1 class="mt-3 text-4xl font-bold tracking-tight text-foreground leading-tight">
                {post.title}
              </h1>
              <p class="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>
              {post.tags.length > 0 && (
                <div class="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span class="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            <div class="px-8 py-10 md:px-12 md:py-12 prose max-w-none text-foreground prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1 [&_li]:text-muted-foreground [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground">
              {raw(post.html)}
            </div>
          </div>

          <div class="mt-8 px-2">
            <a
              href="/blog"
              class="text-sm font-medium text-primary hover:underline"
            >
              &larr; Back to all posts
            </a>
          </div>
        </div>
      </article>
    </BaseLayout>
  );
}
