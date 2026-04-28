.PHONY: help setup install dev build preview generate-migrations migrate migrate-remote open-studio seed seed-remote create-admin create-admin-remote bootstrap bootstrap-remote generate-client generate-sitemap typecheck format create-post ship tail-logs

help:
	@grep -E '^[a-zA-Z_-]+:' $(MAKEFILE_LIST) | awk -F: '{print $$1}' | sort

setup:
	bun install
	bunx wrangler d1 create wontfix-db
	bunx wrangler r2 bucket create wontfix-files
	@echo "Add database_id to wrangler.toml"

install:
	bun install

dev:
	bun run dev

build:
	bun run build
	bun run scripts/generate-sitemap.ts dist/client/sitemap.xml

preview: build
	bunx wrangler dev

generate-migrations:
	bunx drizzle-kit generate

migrate:
	bunx wrangler d1 migrations apply wontfix-db

migrate-remote:
	bunx wrangler d1 migrations apply wontfix-db --remote

open-studio:
	bunx drizzle-kit studio

seed:
	bun run scripts/seed/index.ts --wontfix --apply-local

seed-remote:
	bun run scripts/seed/index.ts --wontfix --apply-prod

create-admin:
	bun run scripts/init-admin.ts $(if $(EMAIL),--email=$(EMAIL)) $(if $(NAME),--name=$(NAME)) $(if $(PASSWORD),--password=$(PASSWORD)) --apply-local

create-admin-remote:
	bun run scripts/init-admin.ts $(if $(EMAIL),--email=$(EMAIL)) $(if $(NAME),--name=$(NAME)) $(if $(PASSWORD),--password=$(PASSWORD)) --apply-prod

bootstrap:
	bun run scripts/bootstrap.ts $(if $(EMAIL),--email=$(EMAIL)) $(if $(NAME),--name=$(NAME)) $(if $(PASSWORD),--password=$(PASSWORD)) $(if $(ORG_NAME),--org-name=$(ORG_NAME)) $(if $(ORG_SLUG),--org-slug=$(ORG_SLUG)) --apply-local

bootstrap-remote:
	bun run scripts/bootstrap.ts $(if $(EMAIL),--email=$(EMAIL)) $(if $(NAME),--name=$(NAME)) $(if $(PASSWORD),--password=$(PASSWORD)) $(if $(ORG_NAME),--org-name=$(ORG_NAME)) $(if $(ORG_SLUG),--org-slug=$(ORG_SLUG)) --apply-remote

generate-client:
	bun run scripts/generate-client.ts

generate-sitemap:
	bun run scripts/generate-sitemap.ts dist/client/sitemap.xml

typecheck:
	bun run typecheck

format:
	bunx prettier --write .

create-post:
	@echo '---\ntitle: ""\nslug: "$(SLUG)"\ndate: "'$$(date +%Y-%m-%d)'"\nexcerpt: ""\ntags: []\nauthor: ""\n---\n' > content/blog/$(SLUG).md
	@echo "Created content/blog/$(SLUG).md"

ship: build
	bunx wrangler deploy

tail-logs:
	bunx wrangler tail
