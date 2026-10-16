import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, getConfig } from './config.js';
import { initDatabaseEngine } from './data-service.js';
import { lspdfrClient } from './lspdfr-client.js';
import { createApiRouter, getLocalIPAddresses } from './api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

async function startServer() {
  const config = loadConfig();
  await initDatabaseEngine();

  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Handle incoming WebSocket connections
  wss.on('connection', (ws, req) => {
    // Send initial snapshot
    const initialSnapshot = {
      type: 'init',
      data: {
        isConnected: lspdfrClient.isConnected,
        host: lspdfrClient.host,
        port: lspdfrClient.port,
        gameData: lspdfrClient.gameData,
        currentTrafficStop: lspdfrClient.currentTrafficStop,
        currentID: lspdfrClient.currentID,
        recentALPR: lspdfrClient.recentALPR
      }
    };
    ws.send(JSON.stringify(initialSnapshot));

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message);
        if (parsed.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (err) {}
    });
  });

  // API router
  app.use('/api', createApiRouter(wss));

  // Serve static web client
  app.use(express.static(PUBLIC_DIR));

  // Fallback to index.html for SPA routing
  app.use((req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  const port = process.env.PORT || config.webServer?.port || 3000;
  const host = config.webServer?.host || '0.0.0.0';

  server.listen(port, host, () => {
    console.log('\n======================================================');
    console.log('       REPORTS PLUS - WEB MDT SERVER STARTED          ');
    console.log('======================================================');
    console.log(`\nLocal PC Access:`);
    console.log(`  http://localhost:${port}`);
    console.log(`\nNetwork Access (Open this on your iPad, Phone, or Tablet):`);
    const localIPs = getLocalIPAddresses();
    if (localIPs.length === 0) {
      console.log(`  http://<Your-Computer-IP>:${port}`);
    } else {
      localIPs.forEach(ip => {
        console.log(`  http://${ip}:${port}`);
      });
    }
    console.log('======================================================\n');

    // Start auto-discovery if configured
    if (config.connectionSettings?.serverAutoConnect) {
      lspdfrClient.startUDPDiscovery();
    }
  });
}

startServer().catch(err => {
  console.error('[ReportsPlus Server] Fatal error during startup:', err);
});
