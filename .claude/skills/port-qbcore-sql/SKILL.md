---
name: port-qbcore-sql
description: Port a qbcore-framework resource's `*.sql` file into a dbmate migration in `db/migrations/`. Invoke as `/port-qbcore-sql <resource-name>` (e.g. `/port-qbcore-sql qb-banking`). The skill carries the procedure, the codebase-wide constraints, and the gotchas; per-resource scope decisions (which tables, which seed data, whether to split) must be agreed with the user in conversation before any migration is written.
---

# Port a qbcore-framework resource's SQL into a dbmate migration

The argument is a resource name (e.g. `qb-banking`, `qb-inventory`, `qb-phone`). Confirm it from the user's invocation before assuming.

Goal: take the upstream resource's `*.sql` file (a one-shot schema dump shipped for manual import) and convert it into a versioned dbmate migration the `migrator` compose service applies deterministically. Schema is owned by `db/migrations/` — see `project_db_migrations`.

## Step 1 — Align with the user (do not skip)

Before generating any migration, do all of:

1. **Locate every candidate SQL file** for this resource. The resource's upstream SQL ships in one of two places:
    - `txData/${SERVER_NAME}/resources/[<group>]/<resource>/*.sql` (already-deployed copy from the recipe download).
    - A fresh upstream clone under `tmp/<resource>-upstream/*.sql` (use `git clone --depth 1 https://github.com/qbcore-framework/<resource> tmp/<resource>-upstream` if not present).
    Some resources ship multiple SQLs (e.g. `qb-inventory` has both `qb-inventory.sql` *and* `migrate.sql` — the latter is upstream's own schema-evolution file). Surface every file you find to the user; do not silently merge or skip.

2. **Read each SQL file end-to-end** and inventory:
    - Every `CREATE TABLE` (table name, columns, indexes, FK targets).
    - Every `ALTER TABLE` (especially in upstream's `migrate.sql` — these imply ordering against an earlier baseline that may or may not exist in our `schema_migrations` ledger).
    - Every `INSERT` (seed/reference data — jobs, gangs, item lists, default banks). These are not always replayable: an `INSERT IGNORE` is fine, a bare `INSERT` will collide on rerun.
    - Every `DROP`, `RENAME`, or other destructive op. These require explicit user sign-off — a migration that drops a table is irreversible without backups.
    - Stored procedures, triggers, views, `DELIMITER` blocks. dbmate handles them but parser correctness depends on the file being well-formed; flag any to the user.
    - Cross-resource FK references (e.g. `qb-banking` FKs to `players(citizenid)` from the qb-core baseline). Confirm the prerequisite tables exist in an earlier migration.

3. **Cross-check against the live DB.** Run `pnpm db:status` and `docker-compose exec db mariadb -u${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} -e "SHOW TABLES"` to see which of the resource's tables already exist (an admin may have manually imported the SQL on a prior deploy). If any do, the migration **must** use `IF NOT EXISTS` for the schema and `INSERT IGNORE` (or equivalent) for seed data — otherwise `pnpm db:migrate` fails on first run for that operator.

4. **State your understanding back to the user** in 5–8 bullets:
    - Resource + every SQL file you'll consume, with line counts.
    - Every table being created, with FK dependencies on other migrations called out (e.g. "depends on `players` from `20260505120000_qbcore_baseline`").
    - Any seed data, classified as: "safe to replay" (idempotent / `INSERT IGNORE` / `ON DUPLICATE KEY`) or "one-shot" (would collide on rerun).
    - Any destructive ops (`DROP`, `RENAME`, `ALTER ... DROP COLUMN`) and your proposed reversal in `migrate:down`.
    - Whether you propose **one migration** for the resource or **a split** (e.g. schema in one, seed data in a second so `db:rollback` can drop seed without dropping tables). Default: one migration per resource — argue for a split only if there's a concrete reason.
    - Tables already present in the live DB (from step 3) — confirm `IF NOT EXISTS` covers them.
    - Anything in the upstream SQL you intend to **diverge from** (charset normalization, FK additions, dropped legacy tables) and the `-- u-core:` justification for each.

5. **Wait for a nod or correction.** Default policy is **byte-faithful to upstream within the `migrate:up` block** — feedback `feedback_conservative_port_strategy` applies here too. Schema changes for cleanup, normalization, or "while we're at it" go in a *separate* later migration with a `-- u-core:` comment, not silently folded into the port.

## Step 2 — Execute (after alignment)

1. **Generate the migration file:**
    ```bash
    pnpm db:new <resource_name>
    ```
    Run from the repo root. This requires the compose stack to be up (`pnpm start:docker`) — `pnpm db:new` is a wrapper around `docker-compose run --rm migrator new`, so the `migrator` container must be reachable. The file lands at `db/migrations/<UTC-timestamp>_<resource_name>.sql` with empty `migrate:up` and `migrate:down` sections.

2. **Write the `-- migrate:up` block:**
    - Paste the upstream SQL contents *as-is* in the order they appear in the source file. Do not reorder, reformat, or "tidy up" — the diff against upstream should be reviewable. Preserve charset/collation exactly (or absence thereof — qbcore.sql doesn't specify, neither should ports of files that don't).
    - **Add `IF NOT EXISTS`** to every `CREATE TABLE` and `CREATE INDEX` that doesn't already have it. This makes the migration idempotent on operators who manually imported the SQL before adopting dbmate.
    - **Convert `INSERT` → `INSERT IGNORE`** (or `INSERT ... ON DUPLICATE KEY UPDATE` if the user wants upsert semantics) for seed rows. Bare `INSERT` collides on rerun.
    - **Resolve `DELIMITER` blocks** for stored procs/triggers/functions. dbmate parses them when the file uses standard `DELIMITER //` ... `END //` ... `DELIMITER ;` syntax — keep it intact.

3. **Write the `-- migrate:down` block:**
    - Reverse the `up` ops in dependency order. Tables with FKs first, then their referents.
    - `DROP TABLE IF EXISTS` for every table created.
    - `DROP PROCEDURE / TRIGGER / VIEW IF EXISTS` for every one created.
    - For seed inserts: `DELETE FROM <table> WHERE <stable-key> IN (...)` — only remove the rows this migration inserted. If the rows have no stable key (autoincrement-only), leave a comment explaining why down is incomplete and surface this to the user.
    - **If the `up` block has destructive ops** (e.g. `DROP COLUMN`) that can't be cleanly reversed, write a comment `-- IRREVERSIBLE: <reason>` in the `down` section. dbmate will still let `db:rollback` run — operators need a heads-up that data is gone.

4. **Apply and verify:**
    - `pnpm db:migrate` — should report exactly one migration applied (this one). On systems where the SQL was manually imported earlier, the `IF NOT EXISTS` guards make the apply a no-op against the actual schema, but dbmate still records it in `schema_migrations`.
    - `pnpm db:status` — confirm the new migration is listed as applied.
    - `docker-compose exec db mariadb -u${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} -e "SHOW TABLES LIKE '<expected>'"` — sanity-check the expected tables exist.
    - **Round-trip the down block** on a throwaway DB if possible: `pnpm db:rollback && pnpm db:migrate`. The rollback path is the one nobody tests until production needs it.

5. **Tell the user to test the resource in-game** (load the resource, exercise the feature that hits the new tables) before celebrating. A migration that runs cleanly but produces a schema oxmysql can't query (wrong column name, missing index the resource expects) is still broken.

## Codebase-wide constraints (project memories — read these names; bodies are auto-loaded into context)

- `project_db_migrations` — dbmate is the canonical schema owner; `query_database` step in `recipe.yaml` is gone; `migrator` compose service applies migrations before FXServer boots.
- `project_buildmanager_import_aware_assets` — unrelated to SQL but pattern-relevant: there's a single source of truth per artifact in this repo. Don't reintroduce a second one (e.g. don't restore `query_database` to "double up").
- `feedback_conservative_port_strategy` — Lua-in / Lua-out; SQL-in / SQL-out. Don't normalize / clean up upstream SQL beyond idempotency guards (`IF NOT EXISTS`, `INSERT IGNORE`).
- `feedback_upstream_audit_depth` — when porting heavy SQL/JSON/transaction logic, walk it yourself. Don't trust an agent's `✅ identical` verdict on un-flagged stored procs or trigger bodies.

If a constraint above conflicts with what you're trying to build, **argue back to the user** before silently violating it.

## Anti-patterns

- **Do not bundle multiple resources' SQL into one migration.** One resource per migration. Rollbacks should be surgical — `db:rollback` undoing `qb-banking` should not also drop `qb-phone` tables.
- **Do not run `pnpm db:migrate` from outside the compose stack.** The wrapper invokes `docker-compose run --rm migrator`; the stack must be up. For Windows-mode (`pnpm start:windows`) operators still need the stack up to migrate, then can shut it down before launching FXServer if they want.
- **Do not fix or "improve" upstream SQL** beyond `IF NOT EXISTS` / `INSERT IGNORE` idempotency guards. Charset normalization, column renames, FK additions, legacy-table drops are all separate migrations with `-- u-core:` justification, not silent edits to the port.
- **Do not skip `pnpm db:status` before writing the migration.** A migration that re-creates a table the live DB already has via a prior manual import will succeed only because of `IF NOT EXISTS`; if you forget those guards, first `db:migrate` fails for every operator who ever imported manually.
- **Do not invent `migrate:down` reversals you can't actually run.** If the upstream file mass-INSERTs hundreds of items with no stable key, an honest `-- IRREVERSIBLE` comment beats a `DELETE FROM items` that nukes operator-added rows too.
- **Do not concatenate `qb-inventory.sql` and `migrate.sql`** (or any resource's analogous "schema + later evolution" pair) into one big `migrate:up`. They're separate migrations in upstream's own history; preserve that — schema first, evolution second, two `db/migrations/` files.
- **Do not skip the alignment step.** Schema is forever-ish. "I'll just port the SQL and we'll iterate" produces ledger entries that can't be cleanly reverted once anyone has run them.
