/**
 * Debounced task manager
 * Manages debounced execution of tasks to prevent rapid repeated executions
 */
import lodashDebounce from 'lodash.debounce';
import 'dotenv/config'; // Load environment variables

// Default debounce times
const DEFAULT_DEBOUNCE_TIME = 1000; // 1 second
const DEFAULT_RESOURCE_DEBOUNCE_TIME = 3000; // 3 seconds
const DEFAULT_WEBVIEW_DEBOUNCE_TIME = 1500; // 1.5 seconds

/**
 * Debounced task manager
 * Manages debounced execution of tasks to prevent rapid repeated executions
 */
export class DebouncedTaskManager {
  private tasks: Map<string, () => Promise<void>>;
  private debounceTime: number;
  private resourceDebounceTime: number;
  private webviewDebounceTime: number;

  /**
   * Create a new debounced task manager
   * @param debounceTime Default debounce time in milliseconds
   * @param resourceDebounceTime Debounce time for resource operations
   * @param webviewDebounceTime Debounce time for webview operations
   */
  constructor(
    debounceTime = parseInt(
      process.env.DEBOUNCE_TIME || DEFAULT_DEBOUNCE_TIME.toString(),
      10
    ),
    resourceDebounceTime = parseInt(
      process.env.RESOURCE_DEBOUNCE_TIME ||
        DEFAULT_RESOURCE_DEBOUNCE_TIME.toString(),
      10
    ),
    webviewDebounceTime = parseInt(
      process.env.WEBVIEW_DEBOUNCE_TIME ||
        DEFAULT_WEBVIEW_DEBOUNCE_TIME.toString(),
      10
    )
  ) {
    this.tasks = new Map();
    this.debounceTime = debounceTime;
    this.resourceDebounceTime = resourceDebounceTime;
    this.webviewDebounceTime = webviewDebounceTime;
  }

  /**
   * Get the appropriate debounce time based on the task key
   * @param key Task key
   * @param customDebounceTime Optional custom debounce time
   * @returns Debounce time in milliseconds
   */
  private getDebounceTime(key: string, customDebounceTime?: number): number {
    if (customDebounceTime !== undefined) {
      return customDebounceTime;
    }

    if (key.startsWith('generated-resource-')) {
      return this.resourceDebounceTime;
    }

    if (key.startsWith('webview-')) {
      return this.webviewDebounceTime;
    }

    return this.debounceTime;
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
    // Get the appropriate debounce time for this task
    const debounceTime = this.getDebounceTime(key, customDebounceTime);

    // Create a debounced version of the task if it doesn't exist or if the debounce time has changed
    const taskKey = `${key}-${debounceTime}`; // Include debounce time in the key to handle changes

    if (!this.tasks.has(taskKey)) {
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

      this.tasks.set(taskKey, wrappedFunction);
    }

    // Execute the debounced task
    const debouncedTask = this.tasks.get(taskKey);
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
