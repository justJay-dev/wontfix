---
title: "Hello World"
slug: "hello-world"
date: "2026-03-25"
excerpt: "Welcome to our blog. This is a sample post to get you started."
tags: ["announcement"]
author: ""
---

## Welcome

This is a sample blog post. You can create new posts by adding markdown files to the `content/blog/` directory.

Each post uses YAML frontmatter for metadata:

- **title** — The post title
- **slug** — URL-friendly identifier
- **date** — Publication date (YYYY-MM-DD)
- **excerpt** — Short description for previews
- **tags** — Array of tag strings
- **author** — Author name

## Creating new posts

Use the Makefile command to scaffold a new post:

```sh
make blog-new SLUG=my-new-post
```

This creates a new markdown file with the frontmatter template pre-filled.
