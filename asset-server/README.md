# Asset Server

This project provides a solution for optimizing images and serving them through a web server. It includes:

1. An image optimization script that processes images with different quality levels
2. A web server that serves the optimized images with proper caching and compression

## Features

- **Multiple optimization levels**: High, medium, low, and tiny quality
- **Aggressive optimization**: Up to 100x reduction in file size for the tiny quality level
- **Directory structure preservation**: Maintains the same directory structure in the optimized output
- **Caching**: Proper HTTP cache headers for improved performance
- **Compression**: On-the-fly compression for faster delivery
- **CORS support**: Cross-origin resource sharing enabled
- **Security headers**: Basic security headers included

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

## Usage

### 1. Optimize Images

Run the optimization script to process images from the `original` directory:

```bash
npm run optimize
```

This will:

- Scan all images in the `original` directory recursively
- Create optimized versions in the `public` directory with different quality levels
- Print statistics about the optimization process

### 2. Generate Thumbnails

Run the thumbnail generation script to create thumbnails for the optimized images:

```bash
npm run thumbnails
```

This will:

- Scan all images in the `public/high`, `public/medium`, and `public/low` directories
- Create thumbnail versions in corresponding `-thumbnail` directories (e.g., `public/high-thumbnail`)
- Preserve the aspect ratio while scaling down to thumbnail size
- Print statistics about the thumbnail generation process

#### Additional Thumbnail Options

The thumbnail generator supports several options:

```bash
# Generate thumbnails for tiny quality images (with smaller width)
npm run thumbnails:tiny

# Generate thumbnails for all quality levels (high, medium, low, tiny)
npm run thumbnails:all

# Force regeneration of all thumbnails (overwrite existing)
npm run thumbnails:force
```

You can also run the script directly with custom options:

```bash
# Custom quality levels and width
node scaledown.js --quality=high,tiny --width=120

# Show help information
node scaledown.js --help
```

### 3. Start the Server

Start the web server to serve the optimized images:

```bash
npm start
```

The server will be available at http://localhost:3000 (or the port specified in your .env file).

## Accessing Assets

Assets can be accessed using the following URL patterns:

### Specific Quality

```
/assets/{quality}/{path}
```

Where `{quality}` is one of: high, medium, low, tiny

### Default Quality

```
/assets/{path}
```

Uses the default quality level (configured in .env)

### Thumbnails with Specific Quality

```
/thumbnails/{quality}/{path}
```

Where `{quality}` is one of: high, medium, low, tiny

### Thumbnails with Default Quality

```
/thumbnails/{path}
```

Uses the default quality level (configured in .env)

### Examples

- High quality: `/assets/high/images/clothing/female_11_0.png`
- Medium quality: `/assets/medium/images/clothing/female_11_0.png`
- Low quality: `/assets/low/images/clothing/female_11_0.png`
- Tiny quality: `/assets/tiny/images/clothing/female_11_0.png`
- Default quality: `/assets/images/clothing/female_11_0.png`
- High quality thumbnail: `/thumbnails/high/images/clothing/female_11_0.png`
- Default quality thumbnail: `/thumbnails/images/clothing/female_11_0.png`

## Configuration

Configuration can be adjusted in the `.env` file:

```
# Server configuration
PORT=3000
DEFAULT_QUALITY=medium
CACHE_MAX_AGE=86400
```

Additional optimization settings can be adjusted directly in the `optimize.js` file.

## Optimization Levels

The default optimization levels are:

- **High**: 80% quality, minimal compression
- **Medium**: 50% quality, good compression
- **Low**: 20% quality, maximum compression
- **Tiny**: 10% quality, resized to 400px width, for 100x reduction

These can be adjusted in the `optimize.js` file.
