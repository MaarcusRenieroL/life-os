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
  build: {
    rollupOptions: {
      output: {
        // Everything shipped in one ~550KB chunk loaded on first paint, even though every
        // route is already lazy-imported (see app-routes.tsx). Splitting out the big,
        // rarely-changing vendor deps means a route-code change only invalidates that
        // route's small chunk, and these libraries cache across deploys instead of every
        // page load re-downloading the same react/radix/query bundle. Function form (not
        // the object-alias form) since this Rolldown-powered Vite's types only accept that.
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/.test(id)) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/radix-ui')) {
              return 'vendor-radix';
            }
            if (id.includes('node_modules/@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (id.includes('node_modules/date-fns')) {
              return 'vendor-date-fns';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-lucide';
            }
          }
          return undefined;
        },
      },
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
      '/v1/career-profile': { target: 'http://localhost:8003', changeOrigin: true },
      '/v1/core': { target: 'http://localhost:8004', changeOrigin: true },
      '/v1/batches': { target: 'http://localhost:8005', changeOrigin: true },
      '/v1/finance': { target: 'http://localhost:8006', changeOrigin: true },
      '/v1/notes': { target: 'http://localhost:8007', changeOrigin: true },
      '/v1/folders': { target: 'http://localhost:8007', changeOrigin: true },
      '/v1/tags': { target: 'http://localhost:8007', changeOrigin: true },
      '/v1/templates': { target: 'http://localhost:8007', changeOrigin: true },
      '/v1/habits': { target: 'http://localhost:8008', changeOrigin: true },
    },
  },
});
