import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';
import {
  getPluginsPaths,
  parsePluginPathsIntoPlugins,
  processFile,
  getPluginOutputInfo,
  readPluginJson,
  getPluginScripts,
  categorizeGeneratedFiles,
  getFilePaths,
} from './utils/file.js';
import {
  generateManifest,
  preparePluginManifestData,
} from './utils/manifest.js';
import { buildWebview } from './utils/webview.js';
import { generatePluginHtmlFiles } from './utils/htmlGenerator.js';
import { moveBuiltResources } from './utils/moveBuiltResources.js';
import { fileURLToPath } from 'url';

// Get absolute paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginsDir = path.resolve(__dirname, '../plugins');
const rootDir = path.resolve(__dirname, '../../');
const distDir = path.resolve(rootDir, 'dist');

console.log(`Plugins directory: ${pluginsDir}`);
console.log(`Root directory: ${rootDir}`);
console.log(`Dist directory: ${distDir}`);

// Function to perform a full rebuild
async function fullRebuild() {
  console.log('Triggering full rebuild...');
  // This logic is adapted from src/scripts/build.ts
  const { pluginPaths } = getPluginsPaths(pluginsDir);
  const plugins = parsePluginPathsIntoPlugins(pluginPaths);

  await buildWebview(plugins, distDir);
  await generatePluginHtmlFiles(plugins, distDir);

  for (const plugin of plugins) {
    const result = await buildPlugin(plugin, distDir);
    if (!result) continue;
    const { updatedPluginJson, manifestPath } = result;
    if (plugin.hasHtml) {
      updatedPluginJson.ui_page = 'html/index.html';
      updatedPluginJson.files?.length
        ? updatedPluginJson.files.push('html/**/*')
        : (updatedPluginJson.files = ['html/**/*']);

      updatedPluginJson.dependencies?.length
        ? updatedPluginJson.dependencies.push('webview')
        : (updatedPluginJson.dependencies = ['webview']);
    }
    generateManifest(updatedPluginJson, manifestPath);
  }

  await moveBuiltResources(distDir);
  console.log('Full rebuild completed.');
}

// Function to perform a partial rebuild for a specific file
async function partialRebuild(filePath: string) {
  console.log(`Triggering partial rebuild for ${filePath}...`);

  // Find the plugin this file belongs to
  const pluginPaths = getPluginsPaths(pluginsDir).pluginPaths;
  const plugins = parsePluginPathsIntoPlugins(pluginPaths);

  // Normalize the file path to ensure consistent comparison
  const normalizedFilePath = path.normalize(filePath);

  // Debug: Log all plugin paths to help diagnose matching issues
  console.log('Available plugins:');
  plugins.forEach((plugin) => {
    if (plugin.fullPath) {
      console.log(`- ${plugin.name}: ${path.normalize(plugin.fullPath)}`);
    }
  });

  const affectedPlugin = plugins.find((plugin) => {
    if (!plugin.fullPath) return false;
    const normalizedPluginPath = path.normalize(plugin.fullPath);
    const isMatch = normalizedFilePath.startsWith(normalizedPluginPath);
    console.log(
      `Checking if ${normalizedFilePath} starts with ${normalizedPluginPath}: ${isMatch}`
    );
    return isMatch;
  });

  if (!affectedPlugin) {
    console.log(`Could not find plugin for file: ${normalizedFilePath}`);
    return;
  }

  console.log(`Building affected plugin: ${affectedPlugin.name}`);

  // Process the single file
  const processedFile = await processFile(
    {
      fullPath: normalizedFilePath,
      pathFromPluginDir: path.relative(
        affectedPlugin.fullPath!,
        normalizedFilePath
      ),
      name: path.basename(normalizedFilePath),
      isPluginJsonFile: path.basename(normalizedFilePath) === 'plugin.json',
    },
    getPluginOutputInfo(affectedPlugin, distDir).outputDir
  );

  if (!processedFile) {
    console.log(`Failed to process file: ${normalizedFilePath}`);
    return;
  }

  // Update the plugin's manifest (simplified for partial rebuild)
  const { outputDir, manifestPath } = getPluginOutputInfo(
    affectedPlugin,
    distDir
  );
  const pluginJsonPath = path.join(affectedPlugin.fullPath!, 'plugin.json');
  const pluginJsonData = readPluginJson(pluginJsonPath);

  // Get existing script files and add the processed file
  const scriptFiles = getPluginScripts(
    pluginJsonData,
    affectedPlugin.fullPath!
  );
  const generatedFiles = categorizeGeneratedFiles([processedFile]);

  const updatedPluginJson = preparePluginManifestData(
    pluginJsonData,
    generatedFiles,
    scriptFiles
  );

  // If the processed file is an HTML file, update ui_page and files in manifest
  if (normalizedFilePath.endsWith('.html')) {
    updatedPluginJson.ui_page = path.relative(
      outputDir,
      processedFile.outputPath
    );
    updatedPluginJson.files?.length
      ? updatedPluginJson.files.push(
          path.relative(outputDir, processedFile.outputPath)
        )
      : (updatedPluginJson.files = [
          path.relative(outputDir, processedFile.outputPath),
        ]);
  } else {
    // For other file types, just add the processed file to the files array if it's not already there
    const relativeOutputPath = path.relative(
      outputDir,
      processedFile.outputPath
    );
    if (!updatedPluginJson.files?.includes(relativeOutputPath)) {
      updatedPluginJson.files?.length
        ? updatedPluginJson.files.push(relativeOutputPath)
        : (updatedPluginJson.files = [relativeOutputPath]);
    }
  }

  generateManifest(updatedPluginJson, manifestPath);

  console.log(`Partial rebuild completed for ${normalizedFilePath}.`);
}

// Function to build a single plugin (adapted from build.ts)
async function buildPlugin(
  plugin: any,
  distDir: string
): Promise<
  | {
      updatedPluginJson: any;
      manifestPath: string;
    }
  | undefined
> {
  if (!plugin.fullPath) {
    console.log(`Skipping plugin with no path: ${plugin.name || 'unknown'}`);
    return;
  }

  const { outputDir, manifestPath } = getPluginOutputInfo(plugin, distDir);
  const jsonPath = path.join(plugin.fullPath, 'plugin.json');
  const pluginJsonData = readPluginJson(jsonPath);

  // Get all files for this plugin
  const pluginFiles = getFilePaths(plugin.fullPath).map((filePath: string) => ({
    fullPath: filePath,
    pathFromPluginDir: path.relative(plugin.fullPath, filePath),
    name: path.basename(filePath),
    isPluginJsonFile: path.basename(filePath) === 'plugin.json',
  }));

  const processPromises = pluginFiles.map((file: any) =>
    processFile(file, outputDir)
  );
  const processedFiles = await Promise.all(processPromises);

  const generatedFiles = categorizeGeneratedFiles(processedFiles);
  const scriptFiles = getPluginScripts(pluginJsonData, plugin.fullPath);

  const updatedPluginJson = preparePluginManifestData(
    pluginJsonData,
    generatedFiles,
    scriptFiles
  );

  return { updatedPluginJson, manifestPath };
}

// Function to check if a file is a Page.tsx file
function isPageTsxFile(filePath: string): boolean {
  const normalizedPath = path.normalize(filePath);
  const isPage =
    normalizedPath.includes(`${path.sep}html${path.sep}Page.tsx`) ||
    normalizedPath.endsWith(`${path.sep}Page.tsx`);

  console.log(`Checking if ${normalizedPath} is a Page.tsx file: ${isPage}`);
  return isPage;
}

// Perform an initial full rebuild when the script starts
await fullRebuild();

// Define specific patterns to watch
const pageTsxPattern = path.join(pluginsDir, '**', 'html', 'Page.tsx');
const tsPattern = path.join(pluginsDir, '**', '*.ts');
const jsPattern = path.join(pluginsDir, '**', '*.js');
const jsonPattern = path.join(pluginsDir, '**', '*.json');
const luaPattern = path.join(pluginsDir, '**', '*.lua');

console.log('Setting up file watchers with specific patterns:');
console.log(`- Page.tsx files: ${pageTsxPattern}`);
console.log(`- TS files: ${tsPattern}`);
console.log(`- JS files: ${jsPattern}`);
console.log(`- JSON files: ${jsonPattern}`);
console.log(`- LUA files: ${luaPattern}`);

// Create a watcher with specific patterns
const watcher = chokidar.watch(
  [pageTsxPattern, tsPattern, jsPattern, jsonPattern, luaPattern],
  {
    persistent: true,
    ignoreInitial: true,
    usePolling: true,
    interval: 100,
    binaryInterval: 300,
    awaitWriteFinish: true,
    followSymlinks: false,
  }
);

// Debug: Log when the watcher is ready
watcher.on('ready', () => {
  console.log('Watcher is ready and watching for changes...');

  // List all paths being watched
  const watchedPaths = watcher.getWatched();
  console.log('Watched paths:');
  Object.keys(watchedPaths).forEach((dir) => {
    console.log(`- ${dir}`);
    watchedPaths[dir].forEach((file) => {
      console.log(`  - ${file}`);
    });
  });
});

// Set up event handlers
watcher
  .on('add', (filePath) => {
    console.log(`File ${filePath} has been added`);
    if (isPageTsxFile(filePath)) {
      console.log(`Detected Page.tsx file: ${filePath}`);
      fullRebuild();
    } else if (/\.(ts|js|json|lua)$/.test(filePath)) {
      partialRebuild(filePath);
    }
  })
  .on('change', (filePath) => {
    console.log(`File ${filePath} has been changed`);
    if (isPageTsxFile(filePath)) {
      console.log(`Detected change in Page.tsx file: ${filePath}`);
      fullRebuild();
    } else if (/\.(ts|js|json|lua)$/.test(filePath)) {
      partialRebuild(filePath);
    }
  })
  .on('unlink', (filePath) => {
    console.log(`File ${filePath} has been removed`);
  })
  .on('error', (error) => console.error(`Watcher error: ${error}`));

// Add a manual file system watcher as a fallback
console.log('Setting up manual file system watcher as fallback...');

// Function to manually check for changes
async function checkForChanges() {
  try {
    // Get all Page.tsx files
    const pageTsxFiles = await fs.promises
      .readdir(pluginsDir, { recursive: true })
      .then((files) =>
        files.filter(
          (file) => typeof file === 'string' && file.includes('Page.tsx')
        )
      );

    console.log(`Found ${pageTsxFiles.length} Page.tsx files`);

    // Watch for changes to these files
    for (const file of pageTsxFiles) {
      const fullPath = path.join(pluginsDir, file);
      fs.watchFile(fullPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          console.log(`Manual watcher detected change in ${fullPath}`);
          if (isPageTsxFile(fullPath)) {
            fullRebuild();
          } else if (/\.(ts|js|json|lua)$/.test(fullPath)) {
            partialRebuild(fullPath);
          }
        }
      });
    }
  } catch (error) {
    console.error('Error in manual file watcher:', error);
  }
}

// Start the manual watcher
checkForChanges();

console.log(`Watching for changes in ${pluginsDir}...`);

// Keep the process running
process.on('SIGINT', () => {
  console.log('Closing watcher...');
  watcher.close().then(() => process.exit(0));
});
