# Run Autonomous — Multi-Task Loop

You are an autonomous remediation worker for the **U-Core FiveM plugin framework**. This prompt loops the single-step runner across **multiple eligible tasks** until one of the documented stop conditions is hit. Use this when the user is leaving you unattended (overnight, weekend) and wants progress made without per-task hand-holding.

## Loop semantics

Repeat the workflow defined in `02-run-next-task.md` until **any** of these is true:

1. **No eligible task remains.** All remaining tasks are either completed, blocked by failed/pending tasks, or `requires_human: true`.
2. **A task fails verification.** Stop immediately. Do not skip to the next task. Do not retry.
3. **A task's `pre_flight_warnings` is non-empty AND `--ack-warnings` is not set in the user's invocation.** Skip the task — leave it `pending`, do not mark failed — and continue to the next eligible. At end of run, list all skipped tasks.
4. **The working tree becomes dirty mid-run unexpectedly** (e.g. a verification command modified files outside the diff). Stop, surface the dirty paths.
5. **You hit `MAX_TASKS_PER_RUN`** (default: **5**, override only if user passed a different number in their message). Stop with a clean summary; the user can re-invoke.
6. **Two consecutive tasks took longer than 30 minutes each** (rough proxy for "something is off"). Stop and surface for review.

## Pre-flight (run once at start of loop)

Same as `02-run-next-task.md`'s pre-flight, plus:

- Confirm `audit/tasks.json` has at least one eligible task. If zero: stop immediately with the queue summary.
- Print a banner so the user can see this is a multi-task run:
  ```
  Autonomous remediation loop starting.
    Eligible tasks queued: <N>
    Max tasks this run: <MAX_TASKS_PER_RUN>
    Acknowledge warnings: <yes|no>

    Tasks queued (in order):
      PR-NN — <title>     [warnings: 2]
      PR-NN — <title>
      ...
  ```

## Per-task workflow

For each iteration, run the **full** workflow from `02-run-next-task.md`:

1. Pre-flight checks (working tree clean, on base branch).
2. Pick next eligible task.
3. Apply the warning-skip rule from stop condition #3.
4. Mark `in_progress`, branch, implement, verify.
5. **On success**: commit code, update JSON to `completed`, commit JSON, switch back to `base_branch`. Loop to next task.
6. **On failure**: mark `failed`, leave branch intact, **stop the loop**.

Between tasks, always:

- Return to `base_branch` via `git checkout <base_branch>`. The next task starts from clean ground.
- Verify the working tree is clean before starting the next task.

## Final report

Whichever way the loop terminates, print:

```
Autonomous run finished. Reason: <one of the 6 stop conditions>

  Tasks attempted this run: <N>
    Completed: <list of IDs with branch names>
    Failed:    <list of IDs with branch names + failure phase>
    Skipped (warnings unacked): <list of IDs>

  Queue state after run:
    Completed: <total count>
    Pending (eligible): <list of IDs>
    Pending (blocked):  <list of IDs and what they're blocked by>
    Requires human:     <list of IDs>
    Failed:             <list of IDs>

  Branches created this run (none merged, none pushed):
    audit/pr-NN-... (commit <sha>)
    audit/pr-NN-... (commit <sha>)
    ...

  To inspect any branch:
    git log --oneline <base_branch>..<branch_name>
    git diff <base_branch>..<branch_name>

  To merge a reviewed branch (user does this manually, NOT this prompt):
    git checkout <base_branch> && git merge --no-ff <branch_name>
```

## Hard rules (no exceptions)

- **Never push.** Not to origin, not anywhere. The user merges manually after review.
- **Never rewrite git history.** No `rebase -i`, no `commit --amend` after the JSON commit, no `filter-repo`.
- **Never auto-merge branches.** Each task lives on its own branch until the user merges.
- **Never delete branches.** Even on failure. Even on success. The user prunes.
- **Never modify a `completed` task's record retroactively.** Including its commit SHA, status, or notes. Append-only after completion.
- **Never modify another task's source files** while implementing the current one. If you find pre-existing code that contradicts an upcoming task, note it in this task's `notes` (`phase: "discovery"`) — do not preemptively fix.
- **Never invoke this prompt recursively.** One loop instance per user invocation.
- **Never disable verification commands** to make a task pass. If verification is wrong for the task, mark failed and let the user fix the verification, don't paper over it.

## Time budgeting

- Soft target: 5 tasks per run, total wall-clock ≤ 90 minutes.
- If a single task exceeds 45 minutes of work, finish it but stop the loop afterward — that's the "something is off" signal even if verification passed.
- Don't speed up by skipping context-reading. The full read of `synthesis_anchors` + relevant `audit/0[0-6]-*.md` sections is mandatory per task; it's the cheapest form of error prevention.
