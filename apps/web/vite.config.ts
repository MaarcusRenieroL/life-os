import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Unit tests live beside the code; e2e/ belongs to Playwright and must not be picked up here.
  test: { include: ['src/**/*.test.ts'] },
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
            // The `radix-ui` meta-package is a thin re-export shim; the actual component code
            // lives in its scoped `@radix-ui/react-*` dependencies. Under pnpm's virtual store
            // those are nested as `node_modules/.pnpm/@radix-ui+react-x@.../node_modules/
            // @radix-ui/react-x/...`, so the id contains "node_modules/@radix-ui", not
            // "node_modules/radix-ui" (the leading `@` breaks that substring match) - which is
            // why this rule matched nothing and every Radix primitive ended up in whichever
            // anonymous chunk Rollup happened to put it in instead of one cache-friendly bundle.
            if (id.includes('node_modules/radix-ui') || id.includes('node_modules/@radix-ui')) {
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
    // The whole backend is one process on 8005.
    proxy: {
      '/v1': { target: 'http://localhost:8005', changeOrigin: true },
    },
  },
});
