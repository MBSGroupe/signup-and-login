// Browser tests (phase 6): the real frontend against the real backend, on
// the throwaway copy of the database (see e2e/README section in TESTING.md).
//
//   npm run test:e2e                     starts both servers, runs, stops
//   E2E_BACKEND_DIR=../bckGO-testing ... another backend checkout
//
// Both servers listen on 127.0.0.1 only. The backend's own script rebuilds
// its database at each start (npm run e2e:serve, in the backend repo).
import { defineConfig, devices } from '@playwright/test';

const BACKEND_DIR = process.env.E2E_BACKEND_DIR || '../bckGO';
const API = 'http://127.0.0.1:3100/api';
const FRONTEND = 'http://127.0.0.1:5174';

export default defineConfig({
  testDir: './e2e',
  // One database for every test: run them one after the other.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Screenshots are taken on Windows (*-win32.png); Linux (CI) renders fonts
  // differently. CI keeps the right-to-left checks, not the pixel comparison.
  ignoreSnapshots: !!process.env.CI,
  // Reports and traces show real (anonymised) data of the copy: local only,
  // never committed (see .gitignore).
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  outputDir: 'e2e-results',
  use: {
    baseURL: FRONTEND,
    locale: 'fr-FR',
    timezoneId: 'Africa/Algiers',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run e2e:serve',
      cwd: BACKEND_DIR,
      url: 'http://127.0.0.1:3101/health',
      env: { E2E_ENV_FILE: process.env.E2E_ENV_FILE || '.env', E2E_FRONTEND_URL: FRONTEND },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'pipe',
    },
    {
      command: 'npx vite --host 127.0.0.1 --port 5174 --strictPort',
      url: FRONTEND,
      env: { VITE_NEST_API_URL: API },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
