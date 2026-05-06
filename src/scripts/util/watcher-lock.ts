import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

/**
 * Single-instance lockfile + auto-takeover for the dev watcher.
 *
 * Why this exists: on Windows the `pnpm → npx → tsx` wrapper chain
 * doesn't reliably forward CTRL_CLOSE_EVENT down to the leaf node
 * worker, so closing a terminal can orphan the actual watcher
 * process. Two concurrent watchers each rebuild on every save and
 * race each other on `rm destDir → rename tmpDir` — FXServer's
 * manifest scan during one watcher's `/start` can land while the
 * OTHER watcher's rm has temporarily wiped html/, surfacing as
 * `could not find file 'html/index.html'` warnings on resources that
 * built fine.
 *
 * Behavior: every `pnpm dev` startup scans for other live watcher
 * processes (matched by command line: `build.ts ... --watch`),
 * excluding our own ancestor chain so we never SIGTERM our pnpm/npx
 * parents out from under ourselves. Anything found outside our chain
 * gets terminated. Then we atomically claim the lockfile via `wx`.
 * Stale lockfiles from a hard-killed predecessor are reclaimed
 * silently — that's the common case.
 */
interface LockPayload {
  pid: number;
  startedAt: string;
  cwd: string;
}

interface ProcessRow {
  pid: number;
  ppid: number;
  commandLine: string;
}

export interface WatcherLock {
  /** Absolute path to the lockfile (for diagnostics). */
  readonly path: string;
  /** Number of rogue watchers terminated during acquisition. */
  readonly killedCount: number;
  /** Release the lock. Idempotent and safe from cleanup hooks. */
  release(): void;
}

/**
 * Acquire the watcher lock, killing any other running watcher
 * processes first. Returns the lock handle and a count of how many
 * rogues were terminated (useful for the startup log).
 */
export function acquireWatcherLock(lockPath: string): WatcherLock {
  const absolute = path.resolve(lockPath);

  // Step 1: scan for and kill rogue watchers outside our ancestor
  // chain. Best-effort — if process listing fails on this platform,
  // log and fall through; the lockfile alone still prevents future
  // duplicates.
  const killedCount = killRogueWatchers();

  // Step 2: claim the lockfile. Loop at most twice in case a stale
  // file lingers from a process we just SIGTERMed (its `exit`
  // handler may not have run yet).
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const payload: LockPayload = {
        pid: process.pid,
        startedAt: new Date().toISOString(),
        cwd: process.cwd(),
      };
      const fd = fs.openSync(absolute, 'wx');
      try {
        fs.writeSync(fd, JSON.stringify(payload, null, 2));
      } finally {
        fs.closeSync(fd);
      }

      const release = createReleaser(absolute, process.pid);
      registerCleanupHandlers(release);

      return {
        path: absolute,
        killedCount,
        release,
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') throw error;

      const existing = readLockSafely(absolute);

      // Whoever owned the lock either died (stale) or survived our
      // scan (different command line, e.g. someone running build.ts
      // outside the watch flag — unlikely but possible). If they're
      // still alive, kill them too. Same-user only; EPERM means we
      // can't touch it and should bail.
      if (existing && isProcessAlive(existing.pid)) {
        try {
          process.kill(existing.pid);
        } catch (killError) {
          const killCode = (killError as NodeJS.ErrnoException).code;
          if (killCode === 'EPERM') {
            throw new Error(
              `Lockfile at ${absolute} is held by PID ${existing.pid} ` +
                `(started ${existing.startedAt}) and we lack permission ` +
                `to terminate it. Kill it manually or remove the lockfile.`
            );
          }
          // Other kill errors are non-fatal — fall through to unlink.
        }
        // Brief settle so the OS releases any handles. 100ms is enough
        // on Windows; we don't need to poll, the unlink retry loop
        // catches lingering EBUSY anyway.
        sleepSync(100);
      }

      try {
        fs.unlinkSync(absolute);
      } catch (unlinkError) {
        const unlinkCode = (unlinkError as NodeJS.ErrnoException).code;
        if (unlinkCode !== 'ENOENT') throw unlinkError;
      }
    }
  }

  throw new Error(
    `Failed to acquire watcher lock at ${absolute} after takeover. ` +
      `Re-run pnpm dev.`
  );
}

function createReleaser(absolute: string, ownerPid: number): () => void {
  let released = false;
  return () => {
    if (released) return;
    released = true;

    // Only unlink if WE still own the file. A successor watcher may
    // have already taken over and rewritten the file — deleting their
    // claim would defeat the lock for the next watcher in line.
    const existing = readLockSafely(absolute);
    if (!existing || existing.pid !== ownerPid) return;

    try {
      fs.unlinkSync(absolute);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        // Best-effort cleanup. Surface but don't throw — release runs
        // from `process.on('exit')` where throwing crashes the runtime.
        console.error(
          `[watcher-lock] failed to remove ${absolute}: ${
            (error as Error).message
          }`
        );
      }
    }
  };
}

function readLockSafely(absolute: string): LockPayload | null {
  try {
    const raw = fs.readFileSync(absolute, 'utf8');
    const parsed = JSON.parse(raw) as Partial<LockPayload>;
    if (
      typeof parsed.pid === 'number' &&
      typeof parsed.startedAt === 'string' &&
      typeof parsed.cwd === 'string'
    ) {
      return parsed as LockPayload;
    }
    return null;
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    // Signal 0 is "test for existence" on POSIX; on Windows Node maps
    // it to a process-handle open and returns true iff the process
    // exists. EPERM means the process exists but we can't signal it
    // (different user) — still "alive" for our purposes.
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EPERM') return true;
    return false;
  }
}

/**
 * Find every process whose command line contains `build.ts ... --watch`,
 * walk up each one's parent chain to also catch the orphan
 * `pnpm dev` / `npx tsx` wrappers waiting on it, then terminate the
 * lot. Excludes our own ancestor chain so we never SIGTERM the
 * pnpm/npx wrappers that launched THIS watcher. Returns the count
 * killed; 0 if none were found or process listing isn't supported
 * on this platform.
 *
 * Why also kill the wrappers: when we kill a leaf watcher (the
 * `node ... preflight ... build.ts --watch` worker), its parent
 * `pnpm dev` notices the non-zero exit and prints `ELIFECYCLE
 * Command failed with exit code 1` to whatever console it inherited
 * — visible noise during the takeover. Killing the chain in one
 * pass avoids that.
 */
function killRogueWatchers(): number {
  const processes = listProcesses();
  if (processes === null) return 0;

  const byPid = new Map(processes.map((p) => [p.pid, p]));

  const protectedPids = new Set<number>();
  protectedPids.add(process.pid);
  // Walk up our parent chain. Stop on missing parent, PID 0, or a
  // cycle (defensive — Windows reuses PIDs, so a stale PPID could
  // in theory loop).
  let cursor: number | undefined = process.pid;
  while (cursor && cursor > 0) {
    const proc = byPid.get(cursor);
    if (!proc) break;
    protectedPids.add(proc.pid);
    if (!proc.ppid || protectedPids.has(proc.ppid)) break;
    cursor = proc.ppid;
  }

  const watcherPattern = /\bbuild\.ts\b[^\n]*--watch\b/;
  // Wrapper pattern matches the `pnpm dev` / `npm run dev` / bare
  // `npx tsx` shells that sit between the user's terminal and the
  // leaf watcher. Restricted to processes we've already identified
  // as ancestors of a rogue — never kill an unrelated pnpm run.
  const wrapperPattern = /\b(pnpm|npm|npx)\b[^\n]*\b(dev|tsx)\b/;

  const initialRogues = processes.filter(
    (p) => !protectedPids.has(p.pid) && watcherPattern.test(p.commandLine)
  );

  const killSet = new Set<number>();
  for (const rogue of initialRogues) {
    killSet.add(rogue.pid);

    // Walk up from the rogue, adding wrapper-shaped ancestors to
    // the kill set. Stop on: protected ancestor (our own chain),
    // already-queued ancestor (cycle / converging chains), missing
    // parent (orphan reparented to PID 0/1), or a process that
    // doesn't look like part of a dev-watcher chain.
    let ancestorPid: number | undefined = rogue.ppid;
    while (
      ancestorPid &&
      ancestorPid > 0 &&
      !protectedPids.has(ancestorPid) &&
      !killSet.has(ancestorPid)
    ) {
      const ancestor = byPid.get(ancestorPid);
      if (!ancestor) break;
      if (
        !watcherPattern.test(ancestor.commandLine) &&
        !wrapperPattern.test(ancestor.commandLine)
      ) {
        break;
      }
      killSet.add(ancestor.pid);
      ancestorPid = ancestor.ppid;
    }
  }

  // Kill children before parents so a parent's wait()/ELIFECYCLE
  // path sees the child already gone — fewer transient log lines
  // racing into our terminal. Achieved by sorting kill targets so
  // any process whose PPID is also in the kill set goes first.
  const ordered = Array.from(killSet).sort((a, b) => {
    const aParentInSet = killSet.has(byPid.get(a)?.ppid ?? -1) ? 1 : 0;
    const bParentInSet = killSet.has(byPid.get(b)?.ppid ?? -1) ? 1 : 0;
    return bParentInSet - aParentInSet;
  });

  let killed = 0;
  for (const pid of ordered) {
    try {
      process.kill(pid);
      killed++;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      // ESRCH = already dead (likely because we just killed its
      // child and the wrapper exited on its own). EPERM = different
      // user (rare on dev boxes). Neither is fatal — surface other
      // errors so the user knows manual cleanup may be needed.
      if (code !== 'ESRCH') {
        console.error(
          `[watcher-lock] couldn't terminate rogue watcher ${pid}: ` +
            `${(error as Error).message}`
        );
      }
    }
  }
  return killed;
}

/**
 * Cross-platform process list (pid, ppid, commandLine). Returns null
 * if listing isn't supported / fails — caller treats that as "no
 * rogues found" and continues. Best-effort; the lockfile is the
 * source of truth.
 */
function listProcesses(): ProcessRow[] | null {
  if (process.platform === 'win32') {
    return listProcessesWindows();
  }
  return listProcessesPosix();
}

function listProcessesWindows(): ProcessRow[] | null {
  // PowerShell over CIM. We pipe through ConvertTo-Json with `-Depth
  // 2` because Win32_Process objects nest a few layers; default depth
  // truncates CommandLine in some shells. `-NonInteractive
  // -NoProfile` keeps startup fast and predictable.
  const result = spawnSync(
    'powershell.exe',
    [
      '-NonInteractive',
      '-NoProfile',
      '-Command',
      "Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, CommandLine | ConvertTo-Json -Depth 2 -Compress",
    ],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  );
  if (result.status !== 0) return null;

  try {
    const raw = JSON.parse(result.stdout) as
      | Array<{
          ProcessId: number;
          ParentProcessId: number;
          CommandLine: string | null;
        }>
      | { ProcessId: number; ParentProcessId: number; CommandLine: string | null };
    const arr = Array.isArray(raw) ? raw : [raw];
    return arr.map((row) => ({
      pid: row.ProcessId,
      ppid: row.ParentProcessId,
      commandLine: row.CommandLine ?? '',
    }));
  } catch {
    return null;
  }
}

function listProcessesPosix(): ProcessRow[] | null {
  // `ps -e -o pid=,ppid=,args=` — the trailing `=` suppresses headers.
  // Linux/macOS both support this form. `args` is the full command
  // line (not just argv[0]).
  const result = spawnSync('ps', ['-e', '-o', 'pid=,ppid=,args='], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0) return null;

  const lines = result.stdout.split('\n');
  const rows: ProcessRow[] = [];
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (!trimmed) continue;
    const match = trimmed.match(/^(\d+)\s+(\d+)\s+(.*)$/);
    if (!match) continue;
    rows.push({
      pid: Number(match[1]),
      ppid: Number(match[2]),
      commandLine: match[3],
    });
  }
  return rows;
}

function sleepSync(ms: number): void {
  // `Atomics.wait` blocks the event loop without spinning. Used here
  // because `acquireWatcherLock` is a synchronous startup step — we
  // want to delay before the unlink retry, not yield to other tasks
  // that might race us.
  const buf = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(buf, 0, 0, ms);
}

function registerCleanupHandlers(release: () => void): void {
  // `exit` runs on every clean termination path including process.exit().
  process.once('exit', release);

  // SIGINT / SIGTERM: release before letting the default handler run.
  // build.ts already installs its own SIGINT handler that calls
  // process.exit(); the 'exit' handler above will still fire and
  // release. This signal listener is a safety net for the case where
  // SIGINT arrives BEFORE build.ts has installed its handler.
  const signalHandler = () => {
    release();
  };
  process.once('SIGINT', signalHandler);
  process.once('SIGTERM', signalHandler);

  // Last-ditch: if a fatal error escapes, still release. Re-throw so
  // the runtime's default crash reporting stays intact.
  process.once('uncaughtException', (error) => {
    release();
    throw error;
  });
}
