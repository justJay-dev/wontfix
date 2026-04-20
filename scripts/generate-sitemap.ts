/**
 * Build-time sitemap generator.
 *
 * Usage:
 *   bun run scripts/generate-sitemap.ts               # prints to stdout
 *   bun run scripts/generate-sitemap.ts public/sitemap.xml  # writes to file
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SITE_URL = "https://your-app.example.com";
const CONTENT_DIR = join(import.meta.dir, "..", "content", "blog");

interface SitemapEntry {
  loc: string;
  priority: string;
  changefreq: string;
  lastmod?: string;
}

const STATIC_PAGES: SitemapEntry[] = [
  { loc: "/", priority: "1.0", changefreq: "weekly" },
  { loc: "/blog", priority: "0.8", changefreq: "daily" },
  { loc: "/privacy", priority: "0.3", changefreq: "yearly" },
  { loc: "/terms", priority: "0.3", changefreq: "yearly" },
];

function extractFrontmatterField(
  raw: string,
  field: string,
): string | undefined {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return undefined;
  const line = match[1]
    .split("\n")
    .find((line) => line.startsWith(`${field}:`));
  if (!line) return undefined;
  return line
    .slice(field.length + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

async function discoverBlogPosts(): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];
  let files: string[];
  try {
    files = await readdir(CONTENT_DIR);
  } catch {
    console.error(
      `Warning: blog content directory not found at ${CONTENT_DIR}`,
    );
    return entries;
  }

  for (const file of files.filter((fileName) => fileName.endsWith(".md"))) {
    const raw = await readFile(join(CONTENT_DIR, file), "utf-8");
    const slug =
      extractFrontmatterField(raw, "slug") ?? file.replace(/\.md$/, "");
    const date = extractFrontmatterField(raw, "date");

    entries.push({
      loc: `/blog/${slug}`,
      priority: "0.7",
      changefreq: "monthly",
      lastmod: date,
    });
  }

  return entries.sort((entryA, entryB) =>
    (entryB.lastmod ?? "").localeCompare(entryA.lastmod ?? ""),
  );
}

function buildXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const parts = [
        `    <loc>${SITE_URL}${entry.loc}</loc>`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
      ];
      if (entry.lastmod) {
        parts.push(`    <lastmod>${entry.lastmod}</lastmod>`);
      }
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

async function main() {
  const blogPosts = await discoverBlogPosts();
  const allEntries = [...STATIC_PAGES, ...blogPosts];
  const xml = buildXml(allEntries);

  const outputPath = process.argv[2];
  if (outputPath) {
    await writeFile(outputPath, xml, "utf-8");
    console.log(`Sitemap written to ${outputPath} (${allEntries.length} URLs)`);
  } else {
    process.stdout.write(xml);
  }
}

main();
