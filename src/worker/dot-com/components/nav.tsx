/** @jsxImportSource hono/jsx */
import { html } from "hono/html";

export function Nav() {
  return (
    <nav class="fixed top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <a
          href="/"
          class="flex items-center gap-2 text-foreground font-semibold tracking-tight"
        >
          <span class="font-mono font-bold">wont<span class="line-through decoration-primary">fix</span></span>
        </a>

        <div class="hidden items-center gap-6 md:flex">
          <a
            href="/#features"
            class="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </a>
          <a
            href="/blog"
            class="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Blog
          </a>

          <a
            href="/app/login"
            class="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in
          </a>
          <a
            href="/app/signup"
            class="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get Started
          </a>
          <button
            id="theme-toggle"
            type="button"
            aria-label="Toggle dark mode"
            class="rounded-md p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {/* Sun icon (shown in dark mode) */}
            <svg
              id="theme-icon-sun"
              class="hidden h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
              />
            </svg>
            {/* Moon icon (shown in light mode) */}
            <svg
              id="theme-icon-moon"
              class="hidden h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
              />
            </svg>
          </button>
        </div>

        <div class="flex items-center gap-2 md:hidden">
          <button
            id="theme-toggle-mobile"
            type="button"
            aria-label="Toggle dark mode"
            class="rounded-md p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              id="theme-icon-sun-mobile"
              class="hidden h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
              />
            </svg>
            <svg
              id="theme-icon-moon-mobile"
              class="hidden h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
              />
            </svg>
          </button>
          <label for="mobile-menu" class="cursor-pointer">
            <svg
              class="h-6 w-6 text-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </label>
        </div>
      </div>

      <input type="checkbox" id="mobile-menu" class="peer hidden" />
      <div class="hidden peer-checked:flex flex-col gap-4 border-t border-border bg-background px-4 py-4 md:hidden">
        <a
          href="/#features"
          class="text-sm text-muted-foreground hover:text-foreground"
        >
          Features
        </a>
        <a
          href="/blog"
          class="text-sm text-muted-foreground hover:text-foreground"
        >
          Blog
        </a>
        <a
          href="/app/login"
          class="text-sm text-muted-foreground hover:text-foreground"
        >
          Log in
        </a>
        <a
          href="/app/signup"
          class="rounded-md bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground"
        >
          Get Started
        </a>
      </div>

      {html`
        <script>
          (function () {
            var root = document.documentElement;
            var stored = localStorage.getItem("app-theme");
            var isDark = stored ? stored === "dark" : true;

            function apply(dark) {
              if (dark) {
                root.classList.add("dark");
              } else {
                root.classList.remove("dark");
              }
              var suns = document.querySelectorAll(
                "#theme-icon-sun, #theme-icon-sun-mobile",
              );
              var moons = document.querySelectorAll(
                "#theme-icon-moon, #theme-icon-moon-mobile",
              );
              for (var idx = 0; idx < suns.length; idx++) {
                suns[idx].classList.toggle("hidden", !dark);
              }
              for (var idx = 0; idx < moons.length; idx++) {
                moons[idx].classList.toggle("hidden", dark);
              }
            }

            apply(isDark);

            function toggle() {
              isDark = !isDark;
              localStorage.setItem("app-theme", isDark ? "dark" : "light");
              apply(isDark);
            }

            var btn = document.getElementById("theme-toggle");
            var btnMobile = document.getElementById("theme-toggle-mobile");
            if (btn) btn.addEventListener("click", toggle);
            if (btnMobile) btnMobile.addEventListener("click", toggle);
          })();
        </script>
      `}
    </nav>
  );
}
