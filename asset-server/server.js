const express = require('express');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Configuration
const config = {
  port: process.env.PORT || 3000,
  publicDir: path.join(__dirname, 'public'),
  defaultQuality: process.env.DEFAULT_QUALITY || 'medium',
  cacheMaxAge: process.env.CACHE_MAX_AGE || 86400, // 1 day in seconds
  compressionLevel: 6
};

// Middleware
app.use(cors());
app.use(compression({ level: config.compressionLevel }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Check if public directory exists
if (!fs.existsSync(config.publicDir)) {
  console.error(`Public directory not found: ${config.publicDir}`);
  console.error('Please run the optimization script first: npm run optimize');
  process.exit(1);
}

// Check if quality subdirectories exist
const qualityDirs = ['high', 'medium', 'low', 'tiny'];
for (const dir of qualityDirs) {
  const qualityDir = path.join(config.publicDir, dir);
  if (!fs.existsSync(qualityDir)) {
    console.warn(`Quality directory not found: ${qualityDir}`);
  }
}

// Route to serve optimized assets
app.get('/assets/:quality/*', (req, res) => {
  const quality = req.params.quality;
  const assetPath = req.params[0];
  
  // Validate quality parameter
  if (!qualityDirs.includes(quality)) {
    return res.status(400).send(`Invalid quality parameter. Must be one of: ${qualityDirs.join(', ')}`);
  }
  
  // Construct the file path
  const filePath = path.join(config.publicDir, quality, assetPath);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Asset not found');
  }
  
  // Set cache headers
  res.setHeader('Cache-Control', `public, max-age=${config.cacheMaxAge}`);
  
  // Send the file
  res.sendFile(filePath);
});

// Route to serve assets with default quality
app.get('/assets/*', (req, res) => {
  const assetPath = req.params[0];
  const filePath = path.join(config.publicDir, config.defaultQuality, assetPath);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Asset not found');
  }
  
  // Set cache headers
  res.setHeader('Cache-Control', `public, max-age=${config.cacheMaxAge}`);
  
  // Send the file
  res.sendFile(filePath);
});

// Root route
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Asset Server</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 {
            color: #333;
          }
          code {
            background-color: #f4f4f4;
            padding: 2px 4px;
            border-radius: 4px;
          }
          pre {
            background-color: #f4f4f4;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
          }
        </style>
      </head>
      <body>
        <h1>Asset Server</h1>
        <p>This server provides optimized assets with different quality levels.</p>
        
        <h2>Usage</h2>
        <p>Access assets using the following URL patterns:</p>
        
        <h3>Specific Quality</h3>
        <pre>/assets/{quality}/{path}</pre>
        <p>Where <code>{quality}</code> is one of: high, medium, low, tiny</p>
        
        <h3>Default Quality</h3>
        <pre>/assets/{path}</pre>
        <p>Uses the default quality level (${config.defaultQuality})</p>
        
        <h2>Examples</h2>
        <ul>
          <li>High quality: <code>/assets/high/images/clothing/female_11_0.png</code></li>
          <li>Medium quality: <code>/assets/medium/images/clothing/female_11_0.png</code></li>
          <li>Low quality: <code>/assets/low/images/clothing/female_11_0.png</code></li>
          <li>Tiny quality: <code>/assets/tiny/images/clothing/female_11_0.png</code></li>
          <li>Default quality: <code>/assets/images/clothing/female_11_0.png</code></li>
        </ul>
      </body>
    </html>
  `);
});

// Start the server
app.listen(config.port, () => {
  console.log(`Asset server running at http://localhost:${config.port}`);
  console.log(`Serving optimized assets from: ${config.publicDir}`);
  console.log(`Default quality: ${config.defaultQuality}`);
});
