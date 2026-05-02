# Run Next Task — Single-Step Runner

You are an autonomous remediation worker for the **U-Core FiveM plugin framework**. This prompt is **re-runnable**: call it once per task. It picks the next eligible task from `audit/tasks.json`, implements it, verifies, commits, updates the JSON, stops.

## Pre-flight (mandatory, in this order — abort on any failure)

1. `audit/tasks.json` exists. If not: tell the user to run `01-bootstrap-tasks.md` first.
2. Working tree is clean: `git status --porcelain` returns empty. If dirty: stop and print the dirty paths. Do not stash, do not auto-commit.
3. Current branch matches `tasks.json.base_branch`. If not: tell the user to switch back. Do not auto-checkout.
4. `git fetch` succeeds (best effort — warn but don't abort if no remote).

## Task selection

Load `audit/tasks.json`. Find the **first** task in array order satisfying all of:

- `status == "pending"`
- `requires_human == false`
- Every ID in `blocked_by` references a task with `status == "completed"`

If no eligible task exists, print the queue summary and stop:

```
No eligible task.

  Completed: <count>
  Pending (blocked): <list of IDs and what they're blocked by>
  Pending (requires human): <list of IDs and human_reason>
  Failed: <list of IDs with notes>

  Done? Frontier? Review failures?
```

If a task is eligible, **show it to the user before starting**:

```
Next task: PR-NN — <title>

  Phase: <A|B|C>   Effort: <S|M|L>
  Risks: R-NN, R-NN, ...
  Files: <paths>
  Branch: <branch_name>

  Pre-flight warnings:
    - <warning 1>
    - <warning 2>

  Acceptance criteria:
    1. <criterion>
    2. <criterion>
    ...
```

## Execution

Once shown, proceed without further confirmation. Steps:

### 1. Update status

Edit `audit/tasks.json`:
- Set the task's `status = "in_progress"`.
- Set `started_at = <ISO-8601 UTC now>`.
- Save.

### 2. Branch

```
git checkout -b <branch_name>
```

If the branch already exists locally, append `-retry-<N>` and use that. Record the actual branch name back into the task as a note.

### 3. Read full context

For this task, read:
- `audit/SYNTHESIS.md` at the `synthesis_anchors` sections
- The relevant per-area audit report from `audit/0[0-6]-*.md` for any risk in `risk_ids`
- Every file listed in `affected_files` (current state)

Do **not** start editing until you have all the context. Brief recap to yourself: what the bug is, what the fix is, what acceptance criteria mean concretely.

### 4. Implement

Make the minimal changes that satisfy every acceptance criterion. Stay strictly within `affected_files` unless absolutely necessary; if you must touch a file outside the list, add it to the task's `notes` and explain why. **Never** modify other tasks' source files preemptively.

Constraints during implementation:
- No `git push`, no `git push --force`, no `git filter-repo`, no history rewrites of any kind.
- No `npm publish`, `pnpm publish`, or any registry interaction.
- No `rm -rf node_modules` unless a verification step explicitly fails because of it.
- No edits to `audit/SYNTHESIS.md` or other audit reports — those are immutable input.
- No edits to `audit/tasks.json` except the specific fields this prompt updates.
- If a code change requires a new dependency, add it via `pnpm add` and call out in `notes`.

### 5. Verify

Run, in order:

1. The commands in `tasks.json.verification.default` (or the override in `verification.after_task_id` if applicable for this task).
2. The commands in this task's `verification_extra`.

Capture stdout/stderr per command. If **any** command exits non-zero:
- Mark task `status = "failed"`.
- Append a `notes` entry: `{ "ts": "<ISO>", "phase": "verify", "command": "<cmd>", "exit": <code>, "tail": "<last 40 lines>" }`.
- Do **not** commit. Do **not** auto-revert; leave the branch as-is so the user can inspect.
- Print: "Task failed at verify: <command>. Branch <branch_name> left intact for review. Stopping."
- Stop.

### 6. Commit

```
git add -A
git commit -m "<commit_message>

Refs: <risk_ids comma-separated>
Task: <id>"
```

Capture the resulting commit SHA.

### 7. Finalize JSON

Edit `audit/tasks.json`:
- `status = "completed"`
- `completed_at = <ISO-8601 UTC now>`
- `commit_shas = ["<sha>"]` (array, in case follow-ups append later)
- Save.

Commit the JSON update separately:

```
git add audit/tasks.json
git commit -m "chore(audit): mark <id> completed"
```

### 8. Report

```
✓ <id> completed on branch <branch_name>
  Commits: <code-sha>, <json-sha>
  Verification: <N> commands passed

  Next eligible task: <id> — <title>     (or: queue empty)

  Reminder: nothing has been merged or pushed. Review with:
    git log --oneline <base_branch>..<branch_name>
    git diff <base_branch>..<branch_name>
```

Stop. Do not start the next task — that is the user's choice (or `run-autonomous.md`'s job).

## Failure-mode addendum

- **Verification flake** (e.g. `pnpm install` network blip): the prompt does **not** auto-retry. Mark failed, surface the error, let the user decide.
- **Acceptance-criterion drift**: if you finish implementing and the criteria look inadequate (e.g. you noticed an additional file that needed editing), update the task's `notes` with what you observed, but do **not** edit `acceptance_criteria` — those are the contract.
- **Conflict with prior task**: if your changes conflict semantically with a task already marked `completed`, stop, mark this task `failed`, note the conflicting task ID, and exit. Do not try to merge or rebase.
- **Out-of-scope discovery**: if you discover a bug not covered by any task, add it to the task's `notes` array as `{ "ts": "...", "phase": "discovery", "issue": "...", "suggested_task": "..." }`. Do not fix it now.
