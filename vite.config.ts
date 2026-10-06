import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// dev server -> '/', build + preview -> '/brick-birthday/'. VITE_BASE overrides.
export default defineConfig(({ command, isPreview }) => ({
  base: process.env.VITE_BASE ?? (command === 'build' || isPreview ? '/brick-birthday/' : '/'),
  plugins: [react()],
  build: { chunkSizeWarningLimit: 2000 },
  server: { port: 5173 },
}));
