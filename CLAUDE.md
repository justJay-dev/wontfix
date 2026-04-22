# wontfix — operating rules

## Destructive actions require explicit approval — no exceptions

**NEVER autonomously run any command that mutates state outside source files.** That includes but is not limited to:

- Anything under `.wrangler/` (local D1 state, R2 state, logs). No `rm -rf .wrangler/state`. No clearing caches.
- Deleting any file under `drizzle/` — migration `.sql` files, snapshot JSONs, the journal. Flattening migrations counts.
- `make db-migrate`, `make migrate`, `make migrate-prod`, `wrangler d1 execute` with any write, `wrangler d1 migrations apply`.
- Any SQL `DELETE`, `UPDATE`, `DROP`, `TRUNCATE`, `ALTER` against the local or remote DB.
- `wrangler r2 object delete`, `rm` on attachments, any R2 write/delete outside the attachment-upload code path.
- `rm` / `rm -rf` on anything that isn't a temp file you just created inside `/tmp/`.
- `git push --force`, `git reset --hard`, `git clean -f`, `git branch -D`, force-amending, rewriting history.
- Production deploys, remote pushes, publishing npm/any registry, posting to external services.

**The rule**: propose the exact command in a message and stop. Do not run it in the same message. Do not run it until the user replies with a clear go. "Asking" and then running is violating the rule.

### What IS fine without asking

- Reading files, grepping, typechecking.
- Editing source files (`.ts`, `.tsx`, `.md`, `.json`, `.css`, etc.) — version-controlled and reversible.
- `make generate-client` — regenerates a single typed file from the OpenAPI spec; read-only w.r.t. app state.
- Starting/stopping the dev server via `make dev` (though note the user may already have one running).
- Installing npm/bun dependencies.
- Running tests if they exist (they don't on this project — see the no-tests feedback memory).

### Prior violations in this project

This rule has been broken multiple times. Each time I promised to do better and didn't. Treat every destructive command as the one I would have failed on — stop, propose, wait.
