/** @jsxImportSource hono/jsx */

export function Footer() {
  return (
    <footer class="border-t border-border bg-card">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row">
        <div class="flex items-center gap-2 text-muted-foreground">
          <span class="text-lg text-primary">&#9670;</span>
          <span class="text-sm font-semibold">YOUR APP</span>
        </div>

        <div class="flex items-center gap-6">
          <a
            href="/blog"
            class="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Blog
          </a>
          <a
            href="/privacy"
            class="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy Policy
          </a>
          <a
            href="/terms"
            class="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
}
