import { File, FileManager, Plugin } from "./managers/FileManager.js";
import { PluginManager } from "./managers/PluginManager.js";

// Helper functions for file display
function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()! : '';
}

function getFileTypeIcon(extension: string): string {
  const iconMap: Record<string, string> = {
    'js': '📜',
    'ts': '📘',
    'json': '📋',
    'html': '🌐',
    'css': '🎨',
    'md': '📝',
    'txt': '📄',
    'png': '🖼️',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'svg': '🖼️',
    'gif': '🖼️',
    'no-extension': '📄'
  };
  
  return iconMap[extension] || '📄';
}

async function runDemo() {
  console.log('🚀 Starting Plugin System demonstration...');
  
  // Initialize the plugin manager
  console.log('🔌 Creating PluginManager instance...');
  const pluginManager = new PluginManager();
  
  console.log('🔍 Initializing PluginManager (loading plugins)...');
  await pluginManager.initialize();
  
  // Display plugins
  const plugins = pluginManager.getAllPlugins();
  console.log('📋 Found', plugins.length, 'plugins:');
  plugins.forEach((plugin, index) => {
    // Use displayPath for output
    const parentInfo = plugin.parents.length > 0 
      ? `(parents: ${plugin.parents.join(' > ')})` 
      : '(no parents)';
    console.log(`  ${index + 1}. ${plugin.pluginName} - ${plugin.displayPath} ${parentInfo}`);
  });
  
  // Group plugins by parent
  console.log('\n📂 Plugins grouped by parent:');
  
  // Get all parent folders
  const parentFolders = pluginManager.getParentFolders();
  
  // Add root level plugins (no parents)
  console.log('\n  📁 Root level plugins:');
  const rootPlugins = plugins.filter(p => p.parents.length === 0);
  rootPlugins.forEach((plugin, idx) => {
    console.log(`    ${idx + 1}. ${plugin.pluginName}`);
  });
  
  // Display plugins by parent folder
  parentFolders.forEach(parentFolder => {
    const pluginsInFolder = pluginManager.getPluginsInFolder(parentFolder);
    console.log(`\n  📁 ${parentFolder} (${pluginsInFolder.length} plugins):`);
    pluginsInFolder.forEach((plugin, idx) => {
      console.log(`    ${idx + 1}. ${plugin.pluginName}`);
    });
  });
  
  // Show nested structure (parent-child relationships)
  console.log('\n🌳 Plugin hierarchy:');
  
  // Function to build a tree structure
  function buildPluginTree() {
    // Start with root level plugins
    const rootPlugins = plugins.filter(p => p.parents.length === 0);
    
    // Create a map of direct parent path -> child plugins
    const childrenByParent = new Map();
    plugins.forEach(plugin => {
      if (plugin.parents.length > 0) {
        const directParent = plugin.parents[plugin.parents.length - 1];
        if (!childrenByParent.has(directParent)) {
          childrenByParent.set(directParent, []);
        }
        childrenByParent.get(directParent).push(plugin);
      }
    });
    
    // Function to print the tree
    function printTree(pluginList: Plugin[], indent = '') {
      pluginList.forEach(plugin => {
        console.log(`${indent}${plugin.pluginName}`);
        
        // Get direct children
        const children = childrenByParent.get(plugin.parents.length > 0 ? 
          plugin.parents[plugin.parents.length - 1] + '/' + plugin.pluginName : 
          plugin.pluginName) || [];
        
        if (children.length > 0) {
          printTree(children, indent + '  ');
        }
      });
    }
    
    printTree(rootPlugins);
  }
  
  buildPluginTree();
  
  // Display files in each plugin
  console.log('\n📄 Files in each plugin:');
  plugins.forEach((plugin, index) => {
    console.log(`\n  📁 Plugin ${index + 1}: ${plugin.pluginName} (${plugin.files.length} files)`);
    
    // Group files by extension
    const filesByExt = new Map();
    plugin.files.forEach(file => {
      const ext = getFileExtension(file.fileName) || 'no-extension';
      if (!filesByExt.has(ext)) {
        filesByExt.set(ext, []);
      }
      filesByExt.get(ext).push(file);
    });
    
    // Display files grouped by extension
    filesByExt.forEach((files, ext) => {
      const extIcon = getFileTypeIcon(ext);
      console.log(`    ${extIcon} .${ext} (${files.length} files):`);
      
      files.forEach((file: File, idx: number) => {
        // Get relative path from plugin root
        const relativePath = file.displayPath.replace(plugin.displayPath + '/', '');
        console.log(`      ${idx + 1}. ${relativePath}`);
      });
    });
    
    // If no files, show a message
    if (plugin.files.length === 0) {
      console.log('    📭 No files found in this plugin');
    }
  });
  
  // Demo retrieving specific plugins
  console.log('\n🔍 Retrieving specific plugins:');
  
  // Get a plugin by name (first match)
  const firstPlugin = plugins[0];
  if (firstPlugin) {
    const pluginByName = pluginManager.getPlugin(firstPlugin.pluginName);
    console.log(`  Plugin by name '${firstPlugin.pluginName}': ${pluginByName?.displayPath || 'Not found'}`);
    
    // Get all plugins with the same name
    const pluginsByName = pluginManager.getPluginsByName(firstPlugin.pluginName);
    console.log(`  Found ${pluginsByName.length} plugins named '${firstPlugin.pluginName}'`);
    
    // Get a plugin by path
    const pluginByPath = pluginManager.getPluginByPath(firstPlugin.fullPath);
    console.log(`  Plugin by path: ${pluginByPath?.displayPath || 'Not found'}`);
    
    // Show files of a specific type for the first plugin
    if (firstPlugin.files.length > 0) {
      const exts = Array.from(new Set(firstPlugin.files.map(file => getFileExtension(file.fileName))));
      if (exts.length > 0) {
        const firstExt = exts[0];
        console.log(`\n  Files with extension .${firstExt} in ${firstPlugin.pluginName}:`);
        // Use the PluginManager to get files by extension
        const filesByExt = pluginManager.getPluginFilesByExtension(firstPlugin.fullPath, firstExt);
        filesByExt.forEach((file: File, idx: number) => {
          console.log(`    ${idx + 1}. ${file.fileName}`);
        });
      }
    }
  }
  
  console.log('\n✅ Plugin System demonstration completed successfully!');
}

runDemo().catch((error) => {
  console.error('❌ Error in demonstration:', error);
  process.exit(1);
});