export const SITE_URL = "https://wontfix.com";
export const SITE_NAME = "wont fix";
export const SITE_TAGLINE = "The issue tracker that tells it like it is";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;
export const TWITTER_HANDLE = "@wontfix";

export interface SitemapPage {
  path: string;
  priority: string;
  changefreq: "daily" | "weekly" | "monthly" | "yearly";
  lastmod?: string;
}

export const STATIC_PAGES: SitemapPage[] = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/blog", priority: "0.8", changefreq: "daily" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
];
