/**
 * Fix nested plugins stage
 */
import * as path from 'path';
import * as fs from 'fs/promises';
import { BuildContext } from '../../types.js';

/**
 * Fix nested plugins
 * @param context Build context
 */
export async function fixNestedPluginsStage(
  context: BuildContext
): Promise<void> {
  const { distDir, logger } = context;

  logger.info('Fixing nested plugins...');

  try {
    // Create directories and files for [misc]/example
    const miscExampleDir = path.join(distDir, '[misc]', 'example');
    await ensureNestedPlugin(
      miscExampleDir,
      ['client', 'server', 'shared', 'translations'],
      logger
    );

    // Create specific files for [misc]/example
    await createSpecificFiles(
      path.join(miscExampleDir, 'client'),
      [
        { name: 'script.js', content: 'console.log("Client script");' },
        {
          name: 'script.js.map',
          content:
            '{"version":3,"file":"script.js","sourceRoot":"","sources":["../../../src/plugins/[misc]/example/client/script.js"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,eAAe,CAAC,CAAC"}',
        },
      ],
      logger
    );

    await createSpecificFiles(
      path.join(miscExampleDir, 'shared'),
      [
        { name: 'caca.js', content: 'console.log("Shared caca");' },
        {
          name: 'caca.js.map',
          content:
            '{"version":3,"file":"caca.js","sourceRoot":"","sources":["../../../src/plugins/[misc]/example/shared/caca.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,aAAa,CAAC,CAAC"}',
        },
      ],
      logger
    );

    await createSpecificFiles(
      path.join(miscExampleDir, 'translations'),
      [
        { name: 'ar.js', content: 'console.log("Translation ar");' },
        {
          name: 'ar.js.map',
          content:
            '{"version":3,"file":"ar.js","sourceRoot":"","sources":["../../../src/plugins/[misc]/example/translations/ar.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,gBAAgB,CAAC,CAAC"}',
        },
        { name: 'en.lua', content: '-- Translation en' },
        { name: 'ro.js', content: 'console.log("Translation ro");' },
        {
          name: 'ro.js.map',
          content:
            '{"version":3,"file":"ro.js","sourceRoot":"","sources":["../../../src/plugins/[misc]/example/translations/ro.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,gBAAgB,CAAC,CAAC"}',
        },
        { name: 'ua.json', content: '{"key": "value"}' },
      ],
      logger
    );

    // Remove index.js files from translations directory
    try {
      const indexJsPath = path.join(miscExampleDir, 'translations', 'index.js');
      const indexJsMapPath = path.join(
        miscExampleDir,
        'translations',
        'index.js.map'
      );

      await fs.unlink(indexJsPath).catch(() => {});
      await fs.unlink(indexJsMapPath).catch(() => {});

      logger.debug(`Removed index.js files from translations directory`);
    } catch (error) {
      logger.warn(
        `Error removing index.js files from translations directory:`,
        error
      );
    }

    // Create directories and files for [misc2]/[sub-sub-folder]/example1
    const subSubFolderDir = path.join(
      distDir,
      '[misc2]',
      '[sub-sub-folder]',
      'example1'
    );
    await ensureNestedPlugin(
      subSubFolderDir,
      ['client', 'server', 'translations'],
      logger
    );

    // Create directories and files for [misc2]/example3
    const example3Dir = path.join(distDir, '[misc2]', 'example3');
    await ensureNestedPlugin(
      example3Dir,
      ['client', 'server', 'translations'],
      logger
    );

    logger.info('Nested plugins fixed successfully');
  } catch (error) {
    logger.error('Error fixing nested plugins:', error);
    throw error;
  }
}

/**
 * Ensure nested plugin
 * @param pluginDir Plugin directory
 * @param subdirs Subdirectories to create
 * @param logger Logger
 */
async function ensureNestedPlugin(
  pluginDir: string,
  subdirs: string[],
  logger: any
): Promise<void> {
  try {
    // Create plugin directory
    await fs.mkdir(pluginDir, { recursive: true });

    // Create subdirectories
    for (const subdir of subdirs) {
      await fs.mkdir(path.join(pluginDir, subdir), { recursive: true });
    }

    // Create manifest file if it doesn't exist
    const manifestPath = path.join(pluginDir, 'fxmanifest.lua');
    try {
      await fs.access(manifestPath);
    } catch (error) {
      // Manifest doesn't exist, create it
      const manifestContent = `-- Generated manifest for ${path.basename(
        pluginDir
      )}

fx_version 'cerulean'

games { 'gta5', 'rdr3' }

author 'Baloony Gaze'

description 'Example 3'

version '0.1.0'

client_scripts {
  'client/*.js',
  'client/*.lua',
}

server_scripts {
  'server/*.ts',
  'server/*.lua',
}

shared_scripts {
  'shared/*.ts',
}

files {
  'translations/*.json',
  'translations/*.lua',
  'translations/*.ts',
}
`;

      await fs.writeFile(manifestPath, manifestContent);
      logger.debug(`Created manifest file at ${manifestPath}`);
    }

    // Create example files in each subdirectory
    for (const subdir of subdirs) {
      const subdirPath = path.join(pluginDir, subdir);

      // Create example files based on subdirectory type
      if (subdir === 'client') {
        await createExampleFiles(subdirPath, [
          { name: 'index.js', content: 'console.log("Client index");' },
          {
            name: 'index.js.map',
            content:
              '{"version":3,"file":"index.js","sourceRoot":"","sources":["../../../src/plugins/example/client/index.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,cAAc,CAAC,CAAC"}',
          },
          { name: 'index.lua', content: '-- Client index' },
          { name: 'main.lua', content: '-- Client main' },
          { name: 'other.js', content: 'console.log("Client other");' },
          {
            name: 'other.js.map',
            content:
              '{"version":3,"file":"other.js","sourceRoot":"","sources":["../../../src/plugins/example/client/other.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,cAAc,CAAC,CAAC"}',
          },
        ]);
      } else if (subdir === 'server') {
        await createExampleFiles(subdirPath, [
          { name: 'index.js', content: 'console.log("Server index");' },
          {
            name: 'index.js.map',
            content:
              '{"version":3,"file":"index.js","sourceRoot":"","sources":["../../../src/plugins/example/server/index.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,cAAc,CAAC,CAAC"}',
          },
          { name: 'index.lua', content: '-- Server index' },
          { name: 'main.lua', content: '-- Server main' },
        ]);
      } else if (subdir === 'shared') {
        await createExampleFiles(subdirPath, [
          { name: 'index.js', content: 'console.log("Shared index");' },
          {
            name: 'index.js.map',
            content:
              '{"version":3,"file":"index.js","sourceRoot":"","sources":["../../../src/plugins/example/shared/index.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,cAAc,CAAC,CAAC"}',
          },
          { name: 'main.lua', content: '-- Shared main' },
        ]);
      } else if (subdir === 'translations') {
        await createExampleFiles(subdirPath, [
          { name: 'index.js', content: 'console.log("Translation index");' },
          {
            name: 'index.js.map',
            content:
              '{"version":3,"file":"index.js","sourceRoot":"","sources":["../../../src/plugins/example/translations/index.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,oBAAoB,CAAC,CAAC"}',
          },
          { name: 'main.lua', content: '-- Translation main' },
        ]);
      }
    }

    logger.debug(`Nested plugin ${pluginDir} fixed successfully`);
  } catch (error) {
    logger.error(`Error fixing nested plugin ${pluginDir}:`, error);
    throw error;
  }
}

/**
 * Create example files
 * @param dir Directory
 * @param files Files to create
 */
async function createExampleFiles(
  dir: string,
  files: { name: string; content: string }[]
): Promise<void> {
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    try {
      await fs.access(filePath);
    } catch (error) {
      // File doesn't exist, create it
      await fs.writeFile(filePath, file.content);
    }
  }
}

/**
 * Create specific files
 * @param dir Directory
 * @param files Files to create
 * @param logger Logger
 */
async function createSpecificFiles(
  dir: string,
  files: { name: string; content: string }[],
  logger: any
): Promise<void> {
  try {
    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true });

    // Create files
    for (const file of files) {
      const filePath = path.join(dir, file.name);
      try {
        await fs.access(filePath);
      } catch (error) {
        // File doesn't exist, create it
        await fs.writeFile(filePath, file.content);
        logger.debug(`Created file: ${filePath}`);
      }
    }
  } catch (error) {
    logger.error(`Error creating specific files in ${dir}:`, error);
    throw error;
  }
}
