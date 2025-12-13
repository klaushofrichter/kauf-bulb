import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { bulbStore } from './bulbStore.js';
import { startDiscovery, stopDiscovery } from './discovery.js';
import apiRoutes from './routes/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3001', 10);
const DISCOVERY_INTERVAL = parseInt(process.env.DISCOVERY_INTERVAL || '60000', 10);
const isProduction = process.env.NODE_ENV === 'production';

async function createServer() {
  const app = express();

  app.use(express.json());

  // Mount API routes
  app.use('/api', apiRoutes);

  if (isProduction) {
    // Serve static files from dist in production
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));

    // SPA fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Use Vite dev server as middleware in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });

    app.use(vite.middlewares);
  }

  // Load existing bulb data
  await bulbStore.load();

  // Start discovery service
  startDiscovery(DISCOVERY_INTERVAL);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    stopDiscovery();
    try {
      await bulbStore.save();
    } catch (error) {
      console.error('Error saving on shutdown:', error.message);
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Mode: ${isProduction ? 'production' : 'development'}`);
    console.log(`Discovery interval: ${DISCOVERY_INTERVAL}ms`);
  });
}

createServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
