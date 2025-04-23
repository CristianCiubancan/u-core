import 'dotenv/config';
import fs from 'fs-extra';
import path from 'path';

const serverName = process.env.SERVER_NAME;

export async function moveBuiltResources(distDir: string) {
  if (!serverName) {
    console.error('SERVER_NAME environment variable is not set.');
    return;
  }

  const generatedDirName = `[GENERATED]`;
  const destinationBase = path.join('txData', serverName, 'resources');
  const destinationDir = path.join(destinationBase, generatedDirName);

  try {
    console.log(`Ensuring destination directory exists: ${destinationDir}`);
    await fs.ensureDir(destinationDir);

    console.log(`Copying built resources from ${distDir} to ${destinationDir}`);
    await fs.copy(distDir, destinationDir);

    console.log('Built resources moved successfully.');
  } catch (error) {
    console.error('Error moving built resources:', error);
  }
}
