import * as path from 'path';
import * as esbuild from 'esbuild';
import * as fsPromises from 'fs/promises';

/**
 * Bundle TypeScript file to ES2017 JS
 */
export async function bundleTypeScript(
  inputFile: string,
  outputFile: string,
  isReact = false
): Promise<void> {
  console.log(`Bundling TypeScript: ${path.basename(inputFile)}`);

  try {
    const loader: Record<string, esbuild.Loader> = isReact
      ? { '.tsx': 'tsx', '.ts': 'ts', '.js': 'js' }
      : { '.ts': 'ts', '.js': 'js' };

    const result = await esbuild.build({
      entryPoints: [inputFile],
      bundle: true,
      outfile: outputFile,
      platform: 'browser',
      format: 'esm',
      target: 'es2017',
      minify: false,
      sourcemap: 'external',
      loader: loader,
      // If this is a React component, you might need to add specific settings
      jsx: isReact ? 'transform' : undefined,
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
        console.log(`Successfully bundled to: ${outputFile}`);
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
 * Bundle JavaScript file
 */
export async function bundleJavaScript(
  inputFile: string,
  outputFile: string
): Promise<void> {
  console.log(`Bundling JavaScript: ${path.basename(inputFile)}`);

  try {
    const result = await esbuild.build({
      entryPoints: [inputFile],
      bundle: true,
      outfile: outputFile,
      platform: 'browser',
      format: 'esm',
      target: 'es2017',
      minify: false,
      sourcemap: 'external',
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
        console.log(`Successfully bundled to: ${outputFile}`);
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
  console.log(`Copying Lua file: ${path.basename(inputFile)}`);
  try {
    await fsPromises.copyFile(inputFile, outputFile);
    // Verify the file was created
    const exists = await fsPromises
      .access(outputFile)
      .then(() => true)
      .catch(() => false);

    if (exists) {
      console.log(`Successfully copied to: ${outputFile}`);
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

// Add this helper function at the bottom of your build.ts file

/**
 * Helper function to verify files in the output directory
 */
export async function verifyOutputDir(dir: string): Promise<void> {
  console.log(`\n--- Verifying output directory: ${dir} ---`);

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

    console.log(`Found ${files.length} entries in ${dir}:`);

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
