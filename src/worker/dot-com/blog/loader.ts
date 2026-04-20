import { marked } from "marked";

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  author: string;
  html: string;
}

interface Frontmatter {
  title?: string;
  slug?: string;
  date?: string;
  excerpt?: string;
  tags?: string[];
  author?: string;
}

function parseFrontmatter(raw: string): { data: Frontmatter; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const yamlBlock = match[1];
  const content = match[2];
  const data: Record<string, unknown> = {};

  for (const line of yamlBlock.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    let value: unknown = line.slice(colonIndex + 1).trim();

    // Handle quoted strings
    if (
      typeof value === "string" &&
      value.startsWith('"') &&
      value.endsWith('"')
    ) {
      value = value.slice(1, -1);
    }

    // Handle arrays like ["tag1", "tag2"]
    if (
      typeof value === "string" &&
      value.startsWith("[") &&
      value.endsWith("]")
    ) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }

    data[key] = value;
  }

  return { data: data as Frontmatter, content };
}

const rawPosts = (
  typeof import.meta.glob === "function"
    ? import.meta.glob("/content/blog/*.md", {
        eager: true,
        query: "?raw",
        import: "default",
      })
    : {}
) as Record<string, string>;

let cachedPosts: BlogPost[] | null = null;

function loadPosts(): BlogPost[] {
  if (cachedPosts) return cachedPosts;

  const posts: BlogPost[] = [];

  for (const [filepath, raw] of Object.entries(rawPosts)) {
    const { data, content } = parseFrontmatter(raw);
    const slug =
      data.slug ?? filepath.replace(/^.*\//, "").replace(/\.md$/, "");

    posts.push({
      slug,
      title: data.title ?? "Untitled",
      date: data.date ?? "",
      excerpt: data.excerpt ?? "",
      tags: data.tags ?? [],
      author: data.author ?? "",
      html: marked.parse(content) as string,
    });
  }

  posts.sort((postA, postB) => (postB.date > postA.date ? 1 : -1));
  cachedPosts = posts;
  return posts;
}

export function getAllPosts(): BlogPost[] {
  return loadPosts();
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return loadPosts().find((post) => post.slug === slug);
}
