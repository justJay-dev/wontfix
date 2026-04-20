/** @jsxImportSource hono/jsx */
import { BaseLayout } from "@worker/dot-com/layouts/base";
import { BlogCard } from "@worker/dot-com/components/blog-card";
import type { BlogPost } from "@worker/dot-com/blog/loader";
import { SITE_URL, SITE_NAME } from "@worker/dot-com/seo";

interface BlogIndexProps {
  cssUrl: string;
  posts: BlogPost[];
}

export function BlogIndexPage({ cssUrl, posts }: BlogIndexProps) {
  return (
    <BaseLayout
      title={`Blog — ${SITE_NAME}`}
      description={`Articles and updates from ${SITE_NAME}.`}
      canonicalUrl={`${SITE_URL}/blog`}
      ogUrl={`${SITE_URL}/blog`}
      cssUrl={cssUrl}
    >
      <section class="py-20 md:py-28">
        <div class="mx-auto max-w-4xl px-4">
          <h1 class="text-4xl font-bold tracking-tight text-foreground">
            Blog
          </h1>
          <p class="mt-4 text-muted-foreground">
            Articles and updates from the team.
          </p>

          {posts.length === 0 ? (
            <p class="mt-12 text-sm text-muted-foreground italic">
              No posts yet. Check back soon.
            </p>
          ) : (
            <div class="mt-12 grid gap-6 md:grid-cols-2">
              {posts.map((post) => (
                <BlogCard post={post} />
              ))}
            </div>
          )}
        </div>
      </section>
    </BaseLayout>
  );
}
