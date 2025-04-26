const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const config = {
  // Source directory containing original images
  sourceDir: path.join(__dirname, 'original'),
  
  // Destination directory for optimized images
  destDir: path.join(__dirname, 'public'),
  
  // Optimization levels
  optimizationLevels: [
    {
      name: 'high', // High quality, minimal compression
      quality: 80,
      subDir: 'high'
    },
    {
      name: 'medium', // Medium quality, good compression
      quality: 50,
      subDir: 'medium'
    },
    {
      name: 'low', // Low quality, maximum compression
      quality: 20,
      subDir: 'low'
    },
    {
      name: 'tiny', // Extremely low quality, for 100x reduction
      quality: 10,
      width: 400, // Resize to 400px width
      subDir: 'tiny'
    }
  ],
  
  // File types to process
  fileTypes: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  
  // Skip existing files
  skipExisting: true
};

// Statistics
const stats = {
  processed: 0,
  skipped: 0,
  errors: 0,
  totalOriginalSize: 0,
  totalOptimizedSize: {
    high: 0,
    medium: 0,
    low: 0,
    tiny: 0
  }
};

// Create destination directories if they don't exist
function createDestDirs() {
  if (!fs.existsSync(config.destDir)) {
    fs.mkdirSync(config.destDir, { recursive: true });
  }
  
  // Create subdirectories for each optimization level
  for (const level of config.optimizationLevels) {
    const levelDir = path.join(config.destDir, level.subDir);
    if (!fs.existsSync(levelDir)) {
      fs.mkdirSync(levelDir, { recursive: true });
    }
  }
}

// Get all image files recursively
function getImageFiles(dir, fileList = []) {
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
function getRelativePath(filePath) {
  return path.relative(config.sourceDir, filePath);
}

// Process a single image
async function processImage(filePath) {
  const relativePath = getRelativePath(filePath);
  const originalSize = fs.statSync(filePath).size;
  stats.totalOriginalSize += originalSize;
  
  console.log(`Processing: ${relativePath}`);
  
  try {
    // Load the image
    let image = sharp(filePath);
    
    // Process for each optimization level
    for (const level of config.optimizationLevels) {
      const destSubDir = path.join(config.destDir, level.subDir);
      const destFilePath = path.join(destSubDir, relativePath);
      const destDir = path.dirname(destFilePath);
      
      // Create destination directory if it doesn't exist
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      // Skip if file exists and skipExisting is true
      if (config.skipExisting && fs.existsSync(destFilePath)) {
        stats.skipped++;
        continue;
      }
      
      // Clone the image for this optimization level
      let levelImage = image.clone();
      
      // Resize if width is specified
      if (level.width) {
        levelImage = levelImage.resize({ width: level.width, withoutEnlargement: true });
      }
      
      // Get the output format based on the input format
      const ext = path.extname(filePath).toLowerCase();
      let outputOptions = {};
      
      if (ext === '.jpg' || ext === '.jpeg') {
        outputOptions = { quality: level.quality };
        await levelImage.jpeg(outputOptions).toFile(destFilePath);
      } else if (ext === '.png') {
        outputOptions = { quality: level.quality };
        await levelImage.png(outputOptions).toFile(destFilePath);
      } else if (ext === '.webp') {
        outputOptions = { quality: level.quality };
        await levelImage.webp(outputOptions).toFile(destFilePath);
      } else if (ext === '.gif') {
        // GIFs are just copied as Sharp doesn't handle them well
        fs.copyFileSync(filePath, destFilePath);
      }
      
      // Update statistics
      const optimizedSize = fs.statSync(destFilePath).size;
      stats.totalOptimizedSize[level.name] += optimizedSize;
      
      console.log(`  - ${level.name}: ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (${calculateReduction(originalSize, optimizedSize)})`);
    }
    
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

// Calculate reduction percentage
function calculateReduction(original, optimized) {
  const reduction = ((original - optimized) / original) * 100;
  return `${reduction.toFixed(2)}% reduction`;
}

// Calculate reduction factor
function calculateReductionFactor(original, optimized) {
  return (original / optimized).toFixed(2) + 'x';
}

// Print statistics
function printStatistics() {
  console.log('\n=== Optimization Statistics ===');
  console.log(`Total files processed: ${stats.processed}`);
  console.log(`Files skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`\nTotal original size: ${formatBytes(stats.totalOriginalSize)}`);
  
  for (const level of config.optimizationLevels) {
    const optimizedSize = stats.totalOptimizedSize[level.name];
    console.log(`Total ${level.name} size: ${formatBytes(optimizedSize)} (${calculateReduction(stats.totalOriginalSize, optimizedSize)})`);
    console.log(`Reduction factor for ${level.name}: ${calculateReductionFactor(stats.totalOriginalSize, optimizedSize)}`);
  }
}

// Main function
async function main() {
  console.log('Starting image optimization...');
  
  // Create destination directories
  createDestDirs();
  
  // Get all image files
  const imageFiles = getImageFiles(config.sourceDir);
  console.log(`Found ${imageFiles.length} images to process.`);
  
  // Process each image
  for (const filePath of imageFiles) {
    await processImage(filePath);
  }
  
  // Print statistics
  printStatistics();
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
