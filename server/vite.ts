import express, { type Express } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer, createLogger } from 'vite';
import { type Server } from 'http';

// Node 18 does not have __dirname — derive it from import.meta.url
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const viteLogger = createLogger();

export function log(message: string, source = 'express') {
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const { default: viteConfig } = await import('../vite.config');
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        if (process.env.NODE_ENV === 'production') process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      // In middleware mode, pass the HTTP server directly for HMR WebSocket.
      // Do NOT also specify port/protocol/host — that would tell Vite to spin
      // up a second standalone WebSocket server which conflicts with the
      // existing HTTP server on the same port and causes "server connection
      // lost" reload loops.
      hmr: { server },
      allowedHosts: true as const,
    },
    appType: 'custom',
  });

  app.use(vite.middlewares);
  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(__dirname, '..', 'client', 'index.html');

      // always reload the index.html file from disk incase it changes
      const template = await fs.promises.readFile(clientTemplate, 'utf-8');
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, 'public');

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use('*', (_req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}
