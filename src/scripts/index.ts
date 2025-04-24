import { FileManager } from './managers/FileManager.js';
import { ManifestManager } from './managers/ManifestManager.js';
import { PluginManager } from './managers/PluginManager.js';
import { Plugin } from './types/Plugin.js';
import { File } from './types/File.js';
import { PluginManifest } from './types/Manifest.js';

/**
 * Plugin Explorer Demo
 *
 * Demonstrates how to:
 * 1. Get all plugins
 * 2. Get all files from all plugins
 * 3. Load and display plugin manifests with formatted output
 */
async function main() {
  try {
    // Create a horizontal divider with title
    const createDivider = (title: string) => {
      const divider = '='.repeat(80);
      const paddedTitle = ` ${title} `;
      // Center the title in the divider
      const startPos = Math.floor((divider.length - paddedTitle.length) / 2);
      const titleDivider =
        divider.substring(0, startPos) +
        paddedTitle +
        divider.substring(startPos + paddedTitle.length);
      console.log('\n' + titleDivider + '\n');
    };

    createDivider('PLUGIN EXPLORER DEMO');

    // Initialize the managers
    console.log('Initializing managers...');

    const pluginsPath = 'src/plugins';
    const fileManager = new FileManager(pluginsPath);
    await fileManager.initialize();

    const manifestManager = new ManifestManager(fileManager);
    await manifestManager.initialize();

    const pluginManager = new PluginManager(fileManager);
    await pluginManager.initialize();

    console.log('✓ All managers initialized successfully\n');

    // 1. Get all plugins with formatted output
    createDivider('ALL PLUGINS');

    const allPlugins = pluginManager.getAllPlugins();

    if (allPlugins.length === 0) {
      console.log('No plugins found in the system.');
    } else {
      console.log(`Found ${allPlugins.length} plugins in the system:\n`);

      // Convert to table-friendly format
      const pluginTableData = allPlugins.map((plugin, index) => {
        return {
          '#': index + 1,
          'Name': plugin.pluginName,
          'Path': plugin.displayPath,
          'Parent Folders': plugin.parents.join(', ') || 'None',
          'Files Count': plugin.files.length,
        };
      });

      console.table(pluginTableData);
    }

    // 2. Get all files of all plugins with formatted output
    createDivider('ALL FILES FROM ALL PLUGINS');

    let totalFiles = 0;
    let filesByType = new Map<string, number>();

    // Display files for each plugin
    for (const plugin of allPlugins) {
      console.log(`\n📁 Plugin: ${plugin.pluginName} (${plugin.displayPath})`);

      if (plugin.files.length === 0) {
        console.log('  No files found in this plugin.');
        continue;
      }

      // Group files by directory (relative to plugin root)
      const filesByDirectory = new Map<string, File[]>();

      plugin.files.forEach((file) => {
        // Get the relative path within the plugin
        const relativePath = file.displayPath.replace(
          `${plugin.displayPath}/`,
          ''
        );
        // Get directory name
        const dirName = relativePath.includes('/')
          ? relativePath.substring(0, relativePath.lastIndexOf('/'))
          : '(root)';

        if (!filesByDirectory.has(dirName)) {
          filesByDirectory.set(dirName, []);
        }
        filesByDirectory.get(dirName)?.push(file);

        // Count files by extension
        const extension = file.fileName.includes('.')
          ? file.fileName.substring(file.fileName.lastIndexOf('.') + 1)
          : 'unknown';
        filesByType.set(extension, (filesByType.get(extension) || 0) + 1);
      });

      // Print files grouped by directory
      for (const [dirName, files] of filesByDirectory.entries()) {
        console.log(`  📂 ${dirName} (${files.length} files):`);
        files.forEach((file) => {
          console.log(`    📄 ${file.fileName}`);
        });
      }

      totalFiles += plugin.files.length;
    }

    // Print summary
    console.log(`\nTotal files across all plugins: ${totalFiles}`);
    console.log('Files by type:');
    for (const [extension, count] of filesByType.entries()) {
      console.log(`  .${extension}: ${count} files`);
    }

    // 3. Display manifests for all plugins
    createDivider('PLUGIN MANIFESTS');

    for (const plugin of allPlugins) {
      console.log(`\n📦 Plugin: ${plugin.pluginName} (${plugin.displayPath})`);

      // Get the manifest
      const manifest = await manifestManager.getManifest(plugin.fullPath);

      if (!manifest) {
        console.log('  ⚠️ No manifest found for this plugin.');
        continue;
      }

      console.log('  📋 Manifest Contents:');
      console.log('  --------------------------------------------------');

      // Display core metadata with proper formatting
      const displayManifestField = (label: string, value: any) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            console.log(`  📌 ${label}: `);
            value.forEach((item: any) => console.log(`    - ${item}`));
          } else if (typeof value === 'object') {
            console.log(`  📌 ${label}: `);
            Object.entries(value).forEach(([k, v]) =>
              console.log(`    - ${k}: ${v}`)
            );
          } else {
            console.log(`  📌 ${label}: ${value}`);
          }
        }
      };

      // Core metadata
      displayManifestField('Name', manifest.name);
      displayManifestField('Version', manifest.version);
      displayManifestField('Description', manifest.description);
      displayManifestField('Author', manifest.author);
      displayManifestField('FX Version', manifest.fx_version);

      // Scripts
      displayManifestField('Client Scripts', manifest.client_scripts);
      displayManifestField('Server Scripts', manifest.server_scripts);
      displayManifestField('Shared Scripts', manifest.shared_scripts);

      // Dependencies and games
      displayManifestField('Games', manifest.games);
      displayManifestField('Dependencies', manifest.dependencies);

      // Additional metadata (excluding already displayed fields)
      const displayedFields = [
        'name',
        'version',
        'description',
        'author',
        'fx_version',
        'client_scripts',
        'server_scripts',
        'shared_scripts',
        'games',
        'dependencies',
      ];

      const otherFields = Object.entries(manifest).filter(
        ([key]) => !displayedFields.includes(key)
      );

      if (otherFields.length > 0) {
        console.log('\n  📌 Additional Properties:');
        otherFields.forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            console.log(`    - ${key}: ${JSON.stringify(value)}`);
          } else {
            console.log(`    - ${key}: ${value}`);
          }
        });
      }

      console.log('  --------------------------------------------------');
    }

    createDivider('DEMO COMPLETE');
    console.log('Plugin Explorer demo finished successfully. Summary:');
    console.log(`✓ Scanned ${allPlugins.length} plugins`);
    console.log(`✓ Found ${totalFiles} total files`);
    console.log(`✓ Displayed ${allPlugins.length} manifests`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ ERROR: ' + errorMessage);

    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
}

// Execute the main function
main().catch((error) => {
  console.error('❌ FATAL ERROR:', error);
  process.exit(1);
});
