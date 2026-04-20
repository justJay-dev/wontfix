/** @jsxImportSource hono/jsx */
import type { BlogPost } from "@worker/dot-com/blog/loader";

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <a
      href={`/blog/${post.slug}`}
      class="flex h-full flex-col rounded-lg border border-border bg-card p-5 hover:border-primary/40 transition-colors"
    >
      <time class="text-xs text-muted-foreground font-mono">{post.date}</time>
      <h3 class="mt-2 text-lg font-semibold text-foreground leading-snug">
        {post.title}
      </h3>
      <p class="mt-2 grow text-sm text-muted-foreground leading-relaxed line-clamp-2">
        {post.excerpt}
      </p>
      <span class="mt-3 inline-block text-sm font-medium text-primary">
        Read more
      </span>
    </a>
  );
}
