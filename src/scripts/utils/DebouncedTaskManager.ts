/**
 * Utility class to manage debounced tasks
 */
import lodashDebounce from 'lodash.debounce';

/**
 * Utility class to manage debounced tasks
 */
export class DebouncedTaskManager {
  private tasks = new Map<string, { fn: Function; cancel: () => void }>();

  /**
   * Execute a debounced task with the specified key and wait time
   */
  execute(key: string, fn: () => Promise<void> | void, wait = 300): void {
    console.log(`Debouncing function for key: ${key} with wait: ${wait}ms`);

    // Cancel previous task if it exists
    this.cancel(key);

    // Create a new debounced function
    const debouncedFn = lodashDebounce(async () => {
      console.log(`Executing debounced function for key: ${key}`);
      try {
        const result = fn();
        // Handle both Promise and non-Promise returns
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        console.error(`Error in debounced function ${key}:`, error);
      } finally {
        // Clean up after execution
        this.tasks.delete(key);
      }
    }, wait);

    // Store the task
    this.tasks.set(key, { fn: debouncedFn, cancel: debouncedFn.cancel });

    // Execute the debounced function
    debouncedFn();
  }

  /**
   * Cancel a debounced task with the specified key
   */
  cancel(key: string): void {
    if (this.tasks.has(key)) {
      console.log(`Cancelling previous debounced function for key: ${key}`);
      const task = this.tasks.get(key)!;
      task.cancel();
      this.tasks.delete(key);
    }
  }
}
