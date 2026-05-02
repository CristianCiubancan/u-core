# Bootstrap — Generate `audit/tasks.json` from SYNTHESIS

You are setting up an autonomous remediation runner for the **U-Core FiveM plugin framework**. This is a one-shot setup task. Output: a single JSON file at `audit/tasks.json` plus a short report of what was extracted.

## Inputs you must read

1. `audit/SYNTHESIS.md` — the master plan (sections 3 "Remediation plan" and 4 "Proposed PR sequence").
2. `audit/00-inventory.md` through `audit/06-prod.md` — referenced for `risk_ids` cross-checks.
3. `package.json` and `tsconfig.json` — to confirm the verification commands actually exist.

## Output schema

Write `audit/tasks.json` with **exactly** this shape. Do not invent extra top-level keys. Per-task fields are all required (use `null`/`[]` when no value applies).

```json
{
  "version": 1,
  "project": "u-core",
  "source": "audit/SYNTHESIS.md",
  "generated_at": "<ISO-8601 UTC>",
  "branch_prefix": "audit/",
  "base_branch": "<current branch as detected by `git rev-parse --abbrev-ref HEAD`>",
  "verification": {
    "default": [
      "pnpm install --frozen-lockfile",
      "pnpm exec tsc -b",
      "SERVER_NAME=ci-stub pnpm build"
    ],
    "after_task_id": {
      "PR-17": [
        "pnpm install --frozen-lockfile",
        "pnpm exec tsc -b",
        "SERVER_NAME=ci-stub pnpm build",
        "pnpm test"
      ]
    }
  },
  "tasks": [
    {
      "id": "PR-01",
      "title": "Lock down secrets & endpoints (ports, API key, CORS, compose)",
      "phase": "A",
      "effort": "S",
      "status": "pending",
      "requires_human": false,
      "pre_flight_warnings": [
        "Credentials are present in git history and are NOT rotated by this PR. Run `git filter-repo` separately and force-push, then have all clones re-clone."
      ],
      "blocked_by": [],
      "unblocks": ["PR-02", "PR-04"],
      "risk_ids": ["R-01", "R-02", "R-23", "R-26", "R-41", "R-42", "R-45"],
      "affected_files": [
        ".env.example",
        "docker-compose.yml",
        "src/plugins/[default]/core/server/index.ts",
        "src/scripts/build.ts",
        "LICENSE"
      ],
      "synthesis_anchors": [
        "Section 3 / Phase A / A-1",
        "Section 4 / PR 01"
      ],
      "implementation_sketch": "<verbatim sketch from synthesis PR section, plus any extra detail from the matching Phase A item>",
      "acceptance_criteria": [
        "core HTTP server binds 127.0.0.1 only",
        "API key compare uses crypto.timingSafeEqual after equal-length check",
        "Server refuses to start when RELOADER_API_KEY equals the placeholder",
        "docker-compose publishes 127.0.0.1:3414:3414 and removes the 3306 publish",
        "BINARIES_ARCHIVE_URL is reconciled between Dockerfile default and .env.example",
        "build.ts exits non-zero when SERVER_NAME is unset or empty",
        "LICENSE file exists at repo root with ISC text matching package.json declaration"
      ],
      "verification_extra": [
        "! grep -RE '***SCRUBBED***|<the placeholder API key string>' .env.example",
        "test -f LICENSE"
      ],
      "branch_name": "audit/pr-01-lockdown-secrets",
      "commit_message": "chore(security): bind reload+db ports to localhost, refuse placeholder API key",
      "started_at": null,
      "completed_at": null,
      "commit_shas": [],
      "notes": []
    }
  ]
}
```

## How to extract each task

For each PR (PR 01 through PR 18) in **Section 4 of SYNTHESIS.md**:

1. **`id`**: `PR-NN` (zero-padded).
2. **`title`**: the title line from the synthesis PR block, trimmed.
3. **`phase`**: `A`, `B`, or `C` from the PR block.
4. **`effort`**: `S`, `M`, or `L` from the PR block.
5. **`status`**: always `"pending"` in the initial JSON.
6. **`requires_human`**: `true` only if the synthesis explicitly says human judgment / out-of-band action is required (e.g. PR-01's git-history rewrite is **separate** — that's a `pre_flight_warning`, not `requires_human`. Mark `requires_human: true` only if the PR cannot proceed at all without a human, like rotating secrets in production environments). Default `false`.
7. **`pre_flight_warnings`**: array of strings. Anything the synthesis or out-of-scope notes flagged as a parallel manual step (history rewrite for PR-01, refreshing checksums when binary URL bumps for PR-08, etc.).
8. **`blocked_by`**: derive from the synthesis "Unblocks: ..." pointers — invert them. If PR-04 says it unblocks PR-05, then PR-05 has `"blocked_by": ["PR-04"]`. Walk every PR.
9. **`unblocks`**: copy the synthesis "Unblocks:" list verbatim. Empty array if `—`.
10. **`risk_ids`**: copy the "Risk-IDs covered:" list verbatim.
11. **`affected_files`**: extract from the matching Phase A/B/C item in **Section 3** (the "Files:" line). Use repo-relative paths. Glob patterns are fine.
12. **`synthesis_anchors`**: two strings — the Section 3 phase anchor and the Section 4 PR anchor.
13. **`implementation_sketch`**: concatenate the synthesis "Sketch:" text from Section 4 with any additional detail from Section 3's matching item. Plain string, newlines OK.
14. **`acceptance_criteria`**: derive concrete pass/fail bullets from the sketch. **You are writing these.** They must be testable from the command line or by reading a diff. Aim for 3–8 per task.
15. **`verification_extra`**: per-task shell checks beyond the global `verification.default`. Examples:
    - PR-01: grep for the leaked password string must return empty.
    - PR-02: `curl http://0.0.0.0:asset_port/../../etc/passwd` must 404.
    - PR-08: `docker compose config` must show healthchecks defined.
    - PR-17: a fresh `pnpm test` invocation must list ≥5 tests.
    Use commands that exit non-zero on failure (prefix with `!` to invert when needed).
16. **`branch_name`**: `audit/pr-NN-kebab-slug`.
17. **`commit_message`**: copy from the "If I could only fix three things" section if listed there; otherwise synthesize a Conventional Commit message from the PR title.
18. **`started_at`, `completed_at`, `commit_shas`, `notes`**: always null/empty initially.

## Validation before writing

Before you write the file, verify in-memory:

- Every PR ID referenced in any `blocked_by` or `unblocks` field exists as a task.
- No cycles in the dependency graph (topological sort succeeds).
- Every `risk_ids` entry is referenced in the SYNTHESIS risk register (Section 2).
- `base_branch` is a real branch (`git rev-parse --verify <branch>` succeeds).

If any check fails, **do not write the file**. Print the failure and stop.

## After writing

Print a one-screen summary:

```
audit/tasks.json written.

  Tasks: <N>
    Phase A: <count>
    Phase B: <count>
    Phase C: <count>

  Requires human: <list of IDs or "none">
  Pre-flight warnings: <count of tasks with at least one>

  Initial dependency frontier (status=pending, blocked_by=[]):
    - PR-NN: <title>
    - PR-NN: <title>
    ...

  Run `run-next-task.md` (single-step) or `run-autonomous.md` (loop) to proceed.
```

## Constraints

- **Read-only on source code.** Only file written is `audit/tasks.json`.
- Do not run `pnpm install`, `git checkout`, or any state-changing command. This is purely a parse-and-emit task.
- If `audit/tasks.json` already exists, refuse to overwrite — print a message telling the user to delete it first or use a different runner.
