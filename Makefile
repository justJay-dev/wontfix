.PHONY: help setup install dev build preview db-generate db-migrate migrate migrate-prod db-studio seed seed-prod init-admin init-admin-prod generate generate-client ui-add test lint typecheck deploy clean logs blog-new sitemap

# --- Help ---
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# --- Setup ---
setup: ## First-time project setup (install deps, create CF resources)
	bun install
	bunx wrangler d1 create wontfix-db
	bunx wrangler r2 bucket create wontfix-files
	@echo "Add database_id to wrangler.toml"

install: ## Install dependencies
	bun install

# --- Development ---
dev: ## Start local dev server (Vite + Cloudflare Workers runtime)
	bun run dev

build: ## Production build
	bun run build
	bun run scripts/generate-sitemap.ts dist/client/sitemap.xml

preview: build ## Preview production build locally
	bunx wrangler dev

# --- Database ---
db-generate: ## Generate Drizzle migration files from schema changes
	bunx drizzle-kit generate

db-migrate: ## Apply pending migrations to local D1
	bunx wrangler d1 migrations apply wontfix-db 

migrate: db-generate db-migrate ## Generate and apply migrations to local DB (shorthand)

migrate-prod: ## Apply migrations to production D1
	bunx wrangler d1 migrations apply wontfix-db --remote

db-studio: ## Open Drizzle Studio (local DB browser)
	bunx drizzle-kit studio

seed: ## Seed sample data to local D1 (default: --wontfix)
	bun run scripts/seed/index.ts --wontfix --apply-local

seed-prod: ## Seed sample data to production D1 (default: --wontfix)
	bun run scripts/seed/index.ts --wontfix --apply-prod

init-admin: ## Create admin user in local D1 (defaults: admin@app.local / password123, override with EMAIL= NAME= PASSWORD=)
	bun run scripts/init-admin.ts $(if $(EMAIL),--email=$(EMAIL)) $(if $(NAME),--name=$(NAME)) $(if $(PASSWORD),--password=$(PASSWORD)) --apply-local

init-admin-prod: ## Create admin user in production D1 (override defaults with EMAIL= NAME= PASSWORD=)
	bun run scripts/init-admin.ts $(if $(EMAIL),--email=$(EMAIL)) $(if $(NAME),--name=$(NAME)) $(if $(PASSWORD),--password=$(PASSWORD)) --apply-prod

bootstrap: ## One-shot local setup: admin + org + membership + default labels + sample data (idempotent)
	bun run scripts/bootstrap.ts $(if $(EMAIL),--email=$(EMAIL)) $(if $(NAME),--name=$(NAME)) $(if $(PASSWORD),--password=$(PASSWORD)) $(if $(ORG_NAME),--org-name=$(ORG_NAME)) $(if $(ORG_SLUG),--org-slug=$(ORG_SLUG)) --apply-local

bootstrap-prod: ## bootstrap against production D1 (use with care)
	bun run scripts/bootstrap.ts $(if $(EMAIL),--email=$(EMAIL)) $(if $(NAME),--name=$(NAME)) $(if $(PASSWORD),--password=$(PASSWORD)) $(if $(ORG_NAME),--org-name=$(ORG_NAME)) $(if $(ORG_SLUG),--org-slug=$(ORG_SLUG)) --apply-prod

# --- Code Generation ---
generate: generate-client ## Run all code generation

generate-client: ## Generate typed API client from OpenAPI spec
	bun run scripts/generate-client.ts

# --- shadcn/ui ---
ui-add: ## Add a shadcn component (usage: make ui-add COMPONENT=button)
	bunx shadcn@latest add $(COMPONENT)

# --- Testing & Quality ---
test: ## Run tests
	bun test

lint: ## Lint & format check
	bun run lint

typecheck: ## TypeScript type checking
	bun run typecheck

# --- Blog ---
blog-new: ## Create a new blog post (usage: make blog-new SLUG=my-post-title)
	@echo '---\ntitle: ""\nslug: "$(SLUG)"\ndate: "'$$(date +%Y-%m-%d)'"\nexcerpt: ""\ntags: []\nauthor: ""\n---\n' > content/blog/$(SLUG).md
	@echo "Created content/blog/$(SLUG).md"

# --- SEO ---
sitemap: ## Generate sitemap.xml from page registry and blog posts
	bun run scripts/generate-sitemap.ts dist/client/sitemap.xml

# --- Deployment ---
deploy: build ## Build and deploy to production
	bunx wrangler deploy --env production

ship: deploy ## Alias for deploy

# --- Utilities ---
clean: ## Remove build artifacts and node_modules
	rm -rf dist node_modules .wrangler

logs: ## Tail production logs
	bunx wrangler tail --env production

format: ## Format code with prettier
	bunx prettier --write .
