import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Watcher-debounce semantics. The build watcher (src/scripts/build.ts:
 * startWatching) coalesces rapid file-change events into a single rebuild
 * via a 300ms timeout. The debounce timer is currently inline so this test
 * exercises an isolated reproduction of the same algorithm — when that
 * inline code is extracted into a helper (PR-13's planned refactor) this
 * test should switch to importing it directly.
 */
describe('watcher debounce', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces multiple rapid triggers into a single action', () => {
    vi.useFakeTimers();
    let calls = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        calls += 1;
      }, 300);
    };

    trigger();
    trigger();
    trigger();
    vi.advanceTimersByTime(100);
    expect(calls).toBe(0);
    vi.advanceTimersByTime(400);
    expect(calls).toBe(1);
  });

  it('fires twice when triggers are spaced beyond the debounce window', () => {
    vi.useFakeTimers();
    let calls = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        calls += 1;
      }, 300);
    };

    trigger();
    vi.advanceTimersByTime(400);
    expect(calls).toBe(1);
    trigger();
    vi.advanceTimersByTime(400);
    expect(calls).toBe(2);
  });
});
