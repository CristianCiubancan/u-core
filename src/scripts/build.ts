import 'dotenv/config';

// Import refactored utility modules
import { DebouncedTaskManager } from './utils/DebouncedTaskManager.js';
import { ResourceManager } from './utils/ResourceManager.js';
import { WatcherManager } from './utils/WatcherManager.js';
import { getProjectPaths } from './utils/paths.js';
import { parseArgs } from './utils/args.js';
import { configureEnvironment } from './utils/env.js';
import { build, rebuildComponent } from './utils/builder.js';

/**
 * This file serves as the entry point for the build system.
 * All major functionality has been refactored into separate utility modules.
 */

/**
 * Main execution function
 */
async function main() {
  const { watch, reload } = parseArgs();

  // Configure environment variables for resource reloading
  configureEnvironment(reload);

  console.log(
    'Starting initial build with reload:',
    reload ? 'enabled' : 'disabled'
  );

  try {
    // Perform the full build first
    await build();

    // Set up watchers if in watch mode
    if (watch) {
      const debouncedTaskManager = new DebouncedTaskManager();
      const resourceManager = new ResourceManager();
      const watcherManager = new WatcherManager(
        debouncedTaskManager,
        resourceManager
      );

      const { pluginsDir, coreDir, distDir } = getProjectPaths();
      watcherManager.setupAllWatchers(
        pluginsDir,
        coreDir,
        distDir,
        rebuildComponent
      );

      console.log('Watchers started. Press Ctrl+C to stop.');
    }
  } catch (error) {
    console.error('Build process failed:', error);
    process.exit(1);
  }
}

// Execute main function
main().catch((error) => {
  console.error('Unhandled error in main process:', error);
  process.exit(1);
});
