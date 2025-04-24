/**
 * Debounced task manager
 * Manages debounced execution of tasks to prevent rapid repeated executions
 */
import lodashDebounce from 'lodash.debounce';

/**
 * Debounced task manager
 * Manages debounced execution of tasks to prevent rapid repeated executions
 */
export class DebouncedTaskManager {
  private tasks: Map<string, () => Promise<void>>;
  private debounceTime: number;

  /**
   * Create a new debounced task manager
   * @param debounceTime Debounce time in milliseconds
   */
  constructor(debounceTime = 1000) {
    this.tasks = new Map();
    this.debounceTime = debounceTime;
  }

  /**
   * Execute a task with debouncing
   * @param key Task key
   * @param task Task to execute
   * @param customDebounceTime Optional custom debounce time for this specific task
   */
  execute(
    key: string,
    task: () => Promise<void> | void,
    customDebounceTime?: number
  ): void {
    // Use custom debounce time if provided, otherwise use the default
    const debounceTime = customDebounceTime !== undefined ? customDebounceTime : this.debounceTime;

    // Create a debounced version of the task if it doesn't exist or if the debounce time has changed
    if (!this.tasks.has(key) || customDebounceTime !== undefined) {
      const debouncedFunction = lodashDebounce(async () => {
        try {
          await task();
        } catch (error) {
          console.error(`Error executing task ${key}:`, error);
        }
      }, debounceTime);

      // Create a wrapper function that returns a Promise
      const wrappedFunction = async () => {
        return new Promise<void>((resolve) => {
          debouncedFunction();
          resolve();
        });
      };

      this.tasks.set(key, wrappedFunction);
    }

    // Execute the debounced task
    const debouncedTask = this.tasks.get(key);
    if (debouncedTask) {
      debouncedTask();
    }
  }

  /**
   * Clear all tasks
   */
  clear(): void {
    this.tasks.clear();
  }
}
