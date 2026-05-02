/**
 * Trailing-edge debouncer. Each `schedule()` call resets the timer; the
 * `action` runs once `delayMs` has elapsed without another `schedule()`.
 * Used by the watch loop in build.ts to coalesce bursts of file-change
 * events into a single rebuild.
 */
export interface Debouncer {
  schedule(): void;
  cancel(): void;
}

export function createDebouncer(
  action: () => void,
  delayMs: number
): Debouncer {
  let timer: NodeJS.Timeout | null = null;
  return {
    schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        action();
      }, delayMs);
    },
    cancel() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
