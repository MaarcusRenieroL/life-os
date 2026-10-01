import { defineConfig, devices } from '@playwright/test';

// No test infrastructure existed anywhere in this repo before this - a deliberately minimal
// starting point (chromium only, no CI wiring yet) rather than a full cross-browser/CI setup,
// which is a reasonable follow-up once this is validated. Assumes the Docker stack (nginx +
// every backend service) and `pnpm --filter web dev` are already running, same as manual testing
// throughout this session - webServer is intentionally not configured to auto-start either, since
// the backend services it depends on can't be started by Playwright itself.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
