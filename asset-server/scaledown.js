const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const qualityArg = args.find((arg) => arg.startsWith('--quality='));
const widthArg = args.find((arg) => arg.startsWith('--width='));
const forceArg = args.find((arg) => arg === '--force');

// Extract quality levels from command line argument
let qualityLevels = ['high', 'medium', 'low'];
if (qualityArg) {
  const qualityValue = qualityArg.split('=')[1];
  if (qualityValue) {
    qualityLevels = qualityValue.split(',');
  }
}

// Extract thumbnail width from command line argument
let thumbnailWidth = 150;
if (widthArg) {
  const widthValue = parseInt(widthArg.split('=')[1], 10);
  if (!isNaN(widthValue) && widthValue > 0) {
    thumbnailWidth = widthValue;
  }
}

// Configuration
const config = {
  // Source directories to process (will process each directory separately)
  sourceDirs: qualityLevels.map((quality) =>
    path.join(__dirname, 'public', quality)
  ),

  // Thumbnail configuration
  thumbnail: {
    width: thumbnailWidth, // Thumbnail width in pixels (can be overridden by command line)
    quality: 70, // Thumbnail quality (0-100)
    suffix: '-thumbnail', // Suffix to add to the thumbnail folder
  },

  // File types to process
  fileTypes: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],

  // Skip existing files (can be overridden by --force flag)
  skipExisting: !forceArg,
};

// Statistics
const stats = {
  processed: 0,
  skipped: 0,
  errors: 0,
  totalOriginalSize: 0,
  totalThumbnailSize: 0,
};

// Get all image files recursively
function getImageFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    console.warn(`Directory does not exist: ${dir}`);
    return fileList;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getImageFiles(filePath, fileList);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (config.fileTypes.includes(ext)) {
        fileList.push(filePath);
      }
    }
  }

  return fileList;
}

// Get relative path from source directory
function getRelativePath(filePath, sourceDir) {
  return path.relative(sourceDir, filePath);
}

// Process a single image
async function processImage(filePath, sourceDir) {
  const relativePath = getRelativePath(filePath, sourceDir);
  const originalSize = fs.statSync(filePath).size;
  stats.totalOriginalSize += originalSize;

  // Determine the thumbnail directory (same level as source directory with suffix)
  const parentDir = path.dirname(sourceDir);
  const sourceDirName = path.basename(sourceDir);
  const thumbnailDirName = `${sourceDirName}${config.thumbnail.suffix}`;
  const thumbnailDir = path.join(parentDir, thumbnailDirName);

  // Create thumbnail directory if it doesn't exist
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true });
  }

  // Determine the thumbnail file path
  const thumbnailFilePath = path.join(thumbnailDir, relativePath);
  const thumbnailFileDir = path.dirname(thumbnailFilePath);

  // Create thumbnail file directory if it doesn't exist
  if (!fs.existsSync(thumbnailFileDir)) {
    fs.mkdirSync(thumbnailFileDir, { recursive: true });
  }

  // Skip if file exists and skipExisting is true
  if (config.skipExisting && fs.existsSync(thumbnailFilePath)) {
    stats.skipped++;
    return;
  }

  console.log(`Processing: ${relativePath}`);

  try {
    // Load the image
    const image = sharp(filePath);

    // Get the output format based on the input format
    const ext = path.extname(filePath).toLowerCase();
    let outputOptions = { quality: config.thumbnail.quality };

    // Resize the image while preserving aspect ratio
    const resizedImage = image.resize({
      width: config.thumbnail.width,
      height: null, // Auto height to preserve aspect ratio
      fit: 'inside',
      withoutEnlargement: true,
    });

    // Save the thumbnail with the appropriate format
    if (ext === '.jpg' || ext === '.jpeg') {
      await resizedImage.jpeg(outputOptions).toFile(thumbnailFilePath);
    } else if (ext === '.png') {
      await resizedImage.png(outputOptions).toFile(thumbnailFilePath);
    } else if (ext === '.webp') {
      await resizedImage.webp(outputOptions).toFile(thumbnailFilePath);
    } else if (ext === '.gif') {
      // GIFs are just copied as Sharp doesn't handle them well
      fs.copyFileSync(filePath, thumbnailFilePath);
    }

    // Update statistics
    const thumbnailSize = fs.statSync(thumbnailFilePath).size;
    stats.totalThumbnailSize += thumbnailSize;

    console.log(
      `  - Thumbnail: ${formatBytes(originalSize)} → ${formatBytes(
        thumbnailSize
      )} (${calculateReduction(originalSize, thumbnailSize)})`
    );

    stats.processed++;
  } catch (error) {
    console.error(`Error processing ${relativePath}:`, error.message);
    stats.errors++;
  }
}

// Format bytes to human-readable format
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Calculate size reduction percentage
function calculateReduction(originalSize, newSize) {
  const reduction = ((originalSize - newSize) / originalSize) * 100;
  return `${reduction.toFixed(2)}% reduction`;
}

// Print statistics
function printStatistics() {
  console.log('\n--- Thumbnail Generation Statistics ---');
  console.log(`Total images processed: ${stats.processed}`);
  console.log(`Total images skipped: ${stats.skipped}`);
  console.log(`Total errors: ${stats.errors}`);
  console.log(`Total original size: ${formatBytes(stats.totalOriginalSize)}`);
  console.log(`Total thumbnail size: ${formatBytes(stats.totalThumbnailSize)}`);
  console.log(
    `Overall reduction: ${calculateReduction(
      stats.totalOriginalSize,
      stats.totalThumbnailSize
    )}`
  );
  console.log('-------------------------------------');
}

// Process all images in a source directory
async function processDirectory(sourceDir) {
  console.log(`\nProcessing directory: ${sourceDir}`);

  // Get all image files in the source directory
  const imageFiles = getImageFiles(sourceDir);
  console.log(`Found ${imageFiles.length} images to process.`);

  // Process each image
  for (const filePath of imageFiles) {
    await processImage(filePath, sourceDir);
  }
}

// Print usage information
function printUsage() {
  console.log(`
Thumbnail Generator for Asset Server

Usage:
  node scaledown.js [options]

Options:
  --quality=high,medium,low,tiny  Specify which quality levels to process (comma-separated)
  --width=150                     Specify the thumbnail width in pixels
  --force                         Force regeneration of existing thumbnails
  --help                          Show this help message

Examples:
  node scaledown.js                                  # Process high, medium, low with default settings
  node scaledown.js --quality=tiny                   # Process only tiny quality
  node scaledown.js --quality=high,tiny --width=100  # Process high and tiny with 100px width
  node scaledown.js --force                          # Regenerate all thumbnails
  `);
}

// Main function
async function main() {
  // Check if help is requested
  if (args.includes('--help')) {
    printUsage();
    return;
  }

  console.log('Starting thumbnail generation...');
  console.log(`Processing quality levels: ${qualityLevels.join(', ')}`);
  console.log(`Thumbnail width: ${config.thumbnail.width}px`);
  console.log(`Force regeneration: ${!config.skipExisting ? 'Yes' : 'No'}`);
  console.log('');

  // Process each source directory
  for (const sourceDir of config.sourceDirs) {
    await processDirectory(sourceDir);
  }

  // Print statistics
  printStatistics();
}

// Run the main function
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
