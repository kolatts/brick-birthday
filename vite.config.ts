import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/** Dev-server only: serves private/family-pack.json. Never part of a build. */
function devFamilyPack(): Plugin {
  return {
    name: 'dev-family-pack',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__family-pack.json', (_req, res) => {
        const file = path.resolve(process.cwd(), 'private/family-pack.json');
        if (!fs.existsSync(file)) {
          res.statusCode = 404;
          res.end('not found');
          return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(fs.readFileSync(file));
      });
    },
  };
}

// dev server -> '/', build + preview -> '/brick-birthday/'. VITE_BASE overrides.
export default defineConfig(({ command, isPreview }) => ({
  base: process.env.VITE_BASE ?? (command === 'build' || isPreview ? '/brick-birthday/' : '/'),
  plugins: [react(), devFamilyPack()],
  build: { chunkSizeWarningLimit: 2000 },
  server: { port: 5173 },
}));
