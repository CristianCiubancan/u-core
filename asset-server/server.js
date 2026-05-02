const express = require('express');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

const config = {
  port: process.env.PORT || 3000,
  host: process.env.ASSET_SERVER_HOST || '127.0.0.1',
  publicDir: path.join(__dirname, 'public'),
  defaultQuality: process.env.DEFAULT_QUALITY || 'medium',
  cacheMaxAge: Number.parseInt(process.env.CACHE_MAX_AGE, 10) || 86400,
  compressionLevel: 6,
  thumbnailSuffix: '-thumbnail',
  authToken: process.env.ASSET_SERVER_TOKEN || '',
};

app.use(cors());
app.use(compression({ level: config.compressionLevel }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  next();
});

// TODO(auth): replace this stub with a real token-validation hook (JWT / shared
// secret behind a reverse proxy). For now: if ASSET_SERVER_TOKEN is set, every
// request must present it via `?token=` or the `x-asset-token` header. If it
// is unset, the middleware is a no-op and requests are accepted (preserves the
// existing local-dev workflow). Tracked in synthesis A-2 / PR-02.
app.use((req, res, next) => {
  if (!config.authToken) return next();
  const provided = req.get('x-asset-token') || req.query.token;
  if (provided !== config.authToken) {
    return res.status(401).send('Unauthorized');
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
  });
  next();
});

const dirExists = (p) => {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
};

if (!dirExists(config.publicDir)) {
  console.error(`Public directory not found: ${config.publicDir}`);
  console.error('Please run the optimization script first: npm run optimize');
  process.exit(1);
}

const qualityDirs = ['high', 'medium', 'low', 'tiny'];
for (const dir of qualityDirs) {
  const qualityDir = path.join(config.publicDir, dir);
  if (!dirExists(qualityDir)) {
    console.warn(`Quality directory not found: ${qualityDir}`);
  }

  const thumbnailDir = path.join(
    config.publicDir,
    `${dir}${config.thumbnailSuffix}`
  );
  if (!dirExists(thumbnailDir)) {
    console.warn(`Thumbnail directory not found: ${thumbnailDir}`);
    console.warn(`Run 'npm run thumbnails' to generate thumbnails.`);
  }
}

const sendOptions = (root) => ({ root, dotfiles: 'deny' });

const sendScoped = (res, root, assetPath, notFoundMsg) => {
  res.setHeader('Cache-Control', `public, max-age=${config.cacheMaxAge}`);
  res.sendFile(assetPath, sendOptions(root), (err) => {
    if (!err) return;
    if (res.headersSent) return;
    if (err.status === 404 || err.code === 'ENOENT') {
      return res.status(404).send(notFoundMsg);
    }
    if (err.status === 403) {
      return res.status(403).send('Forbidden');
    }
    return res.status(err.status || 500).send('Asset error');
  });
};

app.get('/assets/:quality/*', (req, res) => {
  const { quality } = req.params;
  const assetPath = req.params[0];

  if (!qualityDirs.includes(quality)) {
    return res
      .status(400)
      .send(
        `Invalid quality parameter. Must be one of: ${qualityDirs.join(', ')}`
      );
  }

  const root = path.join(config.publicDir, quality);
  sendScoped(res, root, assetPath, 'Asset not found');
});

app.get('/thumbnails/:quality/*', (req, res) => {
  const { quality } = req.params;
  const assetPath = req.params[0];

  if (!qualityDirs.includes(quality)) {
    return res
      .status(400)
      .send(
        `Invalid quality parameter. Must be one of: ${qualityDirs.join(', ')}`
      );
  }

  const thumbRoot = path.join(
    config.publicDir,
    `${quality}${config.thumbnailSuffix}`
  );
  const fallbackRoot = path.join(config.publicDir, quality);

  res.setHeader('Cache-Control', `public, max-age=${config.cacheMaxAge}`);
  res.sendFile(assetPath, sendOptions(thumbRoot), (err) => {
    if (!err) return;
    if (res.headersSent) return;
    if (err.status === 404 || err.code === 'ENOENT') {
      return res.sendFile(assetPath, sendOptions(fallbackRoot), (err2) => {
        if (!err2) return;
        if (res.headersSent) return;
        if (err2.status === 404 || err2.code === 'ENOENT') {
          return res.status(404).send('Thumbnail not found');
        }
        if (err2.status === 403) {
          return res.status(403).send('Forbidden');
        }
        return res.status(err2.status || 500).send('Asset error');
      });
    }
    if (err.status === 403) {
      return res.status(403).send('Forbidden');
    }
    return res.status(err.status || 500).send('Asset error');
  });
});

app.get('/thumbnails/*', (req, res) => {
  const assetPath = req.params[0];
  const thumbRoot = path.join(
    config.publicDir,
    `${config.defaultQuality}${config.thumbnailSuffix}`
  );
  const fallbackRoot = path.join(config.publicDir, config.defaultQuality);

  res.setHeader('Cache-Control', `public, max-age=${config.cacheMaxAge}`);
  res.sendFile(assetPath, sendOptions(thumbRoot), (err) => {
    if (!err) return;
    if (res.headersSent) return;
    if (err.status === 404 || err.code === 'ENOENT') {
      return res.sendFile(assetPath, sendOptions(fallbackRoot), (err2) => {
        if (!err2) return;
        if (res.headersSent) return;
        if (err2.status === 404 || err2.code === 'ENOENT') {
          return res.status(404).send('Thumbnail not found');
        }
        if (err2.status === 403) {
          return res.status(403).send('Forbidden');
        }
        return res.status(err2.status || 500).send('Asset error');
      });
    }
    if (err.status === 403) {
      return res.status(403).send('Forbidden');
    }
    return res.status(err.status || 500).send('Asset error');
  });
});

app.get('/assets/*', (req, res) => {
  const assetPath = req.params[0];
  const root = path.join(config.publicDir, config.defaultQuality);
  sendScoped(res, root, assetPath, 'Asset not found');
});

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

        <h3>Thumbnails with Specific Quality</h3>
        <pre>/thumbnails/{quality}/{path}</pre>
        <p>Where <code>{quality}</code> is one of: high, medium, low, tiny</p>

        <h3>Thumbnails with Default Quality</h3>
        <pre>/thumbnails/{path}</pre>
        <p>Uses the default quality level (${config.defaultQuality})</p>

        <h2>Examples</h2>
        <ul>
          <li>High quality: <code>/assets/high/images/clothing/female_11_0.png</code></li>
          <li>Medium quality: <code>/assets/medium/images/clothing/female_11_0.png</code></li>
          <li>Low quality: <code>/assets/low/images/clothing/female_11_0.png</code></li>
          <li>Tiny quality: <code>/assets/tiny/images/clothing/female_11_0.png</code></li>
          <li>Default quality: <code>/assets/images/clothing/female_11_0.png</code></li>
          <li>High quality thumbnail: <code>/thumbnails/high/images/clothing/female_11_0.png</code></li>
          <li>Default quality thumbnail: <code>/thumbnails/images/clothing/female_11_0.png</code></li>
        </ul>
      </body>
    </html>
  `);
});

app.listen(config.port, config.host, () => {
  console.log(`Asset server running at http://${config.host}:${config.port}`);
  console.log(`Serving optimized assets from: ${config.publicDir}`);
  console.log(`Default quality: ${config.defaultQuality}`);
  if (!config.authToken) {
    console.warn(
      '[asset-server] ASSET_SERVER_TOKEN not set — auth middleware is a pass-through (dev mode).'
    );
  }
});
