import * as path from 'path';
import * as esbuild from 'esbuild';
import * as fsPromises from 'fs/promises';

/**
 * Bundle TypeScript file to ES2017 JS with all imports inlined
 */
export async function bundleTypeScript(
  inputFile: string,
  outputFile: string,
  isReact = false
): Promise<void> {
  try {
    const loader: Record<string, esbuild.Loader> = isReact
      ? { '.tsx': 'tsx', '.ts': 'ts', '.js': 'js' }
      : { '.ts': 'ts', '.js': 'js' };

    // Determine if this is a server-side script by checking the path
    const isServerScript =
      inputFile.includes('/server/') || inputFile.includes('\\server\\');

    // List of packages to not inline - for server scripts, make Node.js modules external
    const externalPackages: string[] = isServerScript
      ? [
          'http',
          'https',
          'url',
          'fs',
          'path',
          'os',
          'crypto',
          'buffer',
          'stream',
          'util',
          'events',
          'zlib',
          'net',
          'tls',
          'dns',
          'child_process',
        ]
      : [];

    const result = await esbuild.build({
      entryPoints: [inputFile],
      bundle: true,
      outfile: outputFile,
      format: 'iife', // Use IIFE format for FiveM compatibility
      target: 'es2017',
      minify: false,
      sourcemap: 'external',
      loader: loader,
      jsx: isReact ? 'transform' : undefined,
      logLevel: 'info',
      external: externalPackages,
      // Use node platform for server scripts, browser platform for client scripts
      platform: isServerScript ? 'node' : 'browser',
    });

    if (result.errors.length > 0) {
      console.error(`Errors bundling ${inputFile}:`, result.errors);
    } else {
      // Verify the file was created
      const exists = await fsPromises
        .access(outputFile)
        .then(() => true)
        .catch(() => false);

      if (exists) {
      } else {
        console.error(
          `Failed to verify file exists after bundling: ${outputFile}`
        );
      }
    }
  } catch (err) {
    console.error(`Failed to bundle TypeScript file ${inputFile}:`, err);
    throw err;
  }
}

/**
 * Bundle JavaScript file with all imports inlined
 */
export async function bundleJavaScript(
  inputFile: string,
  outputFile: string
): Promise<void> {
  try {
    // Determine if this is a server-side script by checking the path
    const isServerScript =
      inputFile.includes('/server/') || inputFile.includes('\\server\\');

    // List of packages to not inline - for server scripts, make Node.js modules external
    const externalPackages: string[] = isServerScript
      ? [
          'http',
          'https',
          'url',
          'fs',
          'path',
          'os',
          'crypto',
          'buffer',
          'stream',
          'util',
          'events',
          'zlib',
          'net',
          'tls',
          'dns',
          'child_process',
        ]
      : [];

    const result = await esbuild.build({
      entryPoints: [inputFile],
      bundle: true,
      outfile: outputFile,
      format: 'iife', // Use IIFE format for FiveM compatibility
      target: 'es2017',
      minify: false,
      sourcemap: 'external',
      external: externalPackages,
      // Use node platform for server scripts, browser platform for client scripts
      platform: isServerScript ? 'node' : 'browser',
    });

    if (result.errors.length > 0) {
      console.error(`Errors bundling ${inputFile}:`, result.errors);
    } else {
      // Verify the file was created
      const exists = await fsPromises
        .access(outputFile)
        .then(() => true)
        .catch(() => false);

      if (exists) {
      } else {
        console.error(
          `Failed to verify file exists after bundling: ${outputFile}`
        );
      }
    }
  } catch (err) {
    console.error(`Failed to bundle JavaScript file ${inputFile}:`, err);
    throw err;
  }
}

/**
 * Copy Lua file to output directory
 */
export async function copyLuaFile(
  inputFile: string,
  outputFile: string
): Promise<void> {
  try {
    await fsPromises.copyFile(inputFile, outputFile);
    // Verify the file was created
    const exists = await fsPromises
      .access(outputFile)
      .then(() => true)
      .catch(() => false);

    if (exists) {
    } else {
      console.error(`Failed to verify file exists after copy: ${outputFile}`);
    }
  } catch (err) {
    console.error(
      `Error copying Lua file from ${inputFile} to ${outputFile}:`,
      err
    );
    throw err;
  }
}

/**
 * Helper function to verify files in the output directory
 */
export async function verifyOutputDir(dir: string): Promise<void> {
  try {
    // Check if directory exists
    const stats = await fsPromises.stat(dir);
    if (!stats.isDirectory()) {
      console.error(`Path exists but is not a directory: ${dir}`);
      return;
    }

    // List all files in the directory
    const files = await fsPromises.readdir(dir, { withFileTypes: true });

    if (files.length === 0) {
      console.log(`Directory is empty: ${dir}`);
      return;
    }

    // Process each entry
    for (const file of files) {
      const fullPath = path.join(dir, file.name);

      if (file.isDirectory()) {
        console.log(`  [DIR] ${file.name}`);
        // Optionally recurse into subdirectories
        // await verifyOutputDir(fullPath);
      } else {
        // Get file size
        const fileStats = await fsPromises.stat(fullPath);
        console.log(`  [FILE] ${file.name} (${fileStats.size} bytes)`);
      }
    }
  } catch (err) {
    console.error(`Error verifying directory ${dir}:`, err);
  }

  console.log(`--- End verification of ${dir} ---\n`);
}
