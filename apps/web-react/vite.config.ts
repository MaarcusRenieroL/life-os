import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // Same backend port map as apps/web/proxy.conf.json - one gateway per service,
    // routed by path prefix. Keep these two files in sync.
    proxy: {
      '/v1/auth': { target: 'http://localhost:8001', changeOrigin: true },
      '/v1/vault': { target: 'http://localhost:8002', changeOrigin: true },
      '/v1/jobs': { target: 'http://localhost:8003', changeOrigin: true },
      '/v1/resumes': { target: 'http://localhost:8003', changeOrigin: true },
      '/v1/skills': { target: 'http://localhost:8003', changeOrigin: true },
      '/v1/core': { target: 'http://localhost:8004', changeOrigin: true },
      '/v1/batches': { target: 'http://localhost:8005', changeOrigin: true },
      '/v1/finance': { target: 'http://localhost:8006', changeOrigin: true },
      '/v1/notes': { target: 'http://localhost:8007', changeOrigin: true },
      '/v1/folders': { target: 'http://localhost:8007', changeOrigin: true },
      '/v1/tags': { target: 'http://localhost:8007', changeOrigin: true },
      '/v1/templates': { target: 'http://localhost:8007', changeOrigin: true },
    },
  },
});
