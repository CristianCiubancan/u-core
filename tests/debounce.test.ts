import { describe, it, expect, vi, afterEach } from 'vitest';
import { createDebouncer } from '../src/scripts/util/debounce.ts';

/**
 * Watcher-debounce semantics. The build watcher (src/scripts/build.ts:
 * startWatching) coalesces rapid file-change events into a single rebuild
 * by routing every queue mutation through `createDebouncer`. This test
 * exercises that exact helper rather than a hand-rolled reproduction.
 */
describe('createDebouncer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces multiple rapid triggers into a single action', () => {
    vi.useFakeTimers();
    let calls = 0;
    const debouncer = createDebouncer(() => {
      calls += 1;
    }, 300);

    debouncer.schedule();
    debouncer.schedule();
    debouncer.schedule();
    vi.advanceTimersByTime(100);
    expect(calls).toBe(0);
    vi.advanceTimersByTime(400);
    expect(calls).toBe(1);
  });

  it('fires twice when triggers are spaced beyond the debounce window', () => {
    vi.useFakeTimers();
    let calls = 0;
    const debouncer = createDebouncer(() => {
      calls += 1;
    }, 300);

    debouncer.schedule();
    vi.advanceTimersByTime(400);
    expect(calls).toBe(1);
    debouncer.schedule();
    vi.advanceTimersByTime(400);
    expect(calls).toBe(2);
  });

  it('cancels a pending action', () => {
    vi.useFakeTimers();
    let calls = 0;
    const debouncer = createDebouncer(() => {
      calls += 1;
    }, 300);

    debouncer.schedule();
    debouncer.cancel();
    vi.advanceTimersByTime(1000);
    expect(calls).toBe(0);
  });
});
