import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vitest (ignored by `vite` / `vite build`).
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    // e2e/ holds the Playwright browser tests (npm run test:e2e).
    exclude: ['**/node_modules/**', 'e2e/**'],
    env: { VITE_NEST_API_URL: 'http://api.test' },
    restoreMocks: true,
    css: false,
    coverage: {
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/test/**', 'src/**/*.test.{js,jsx}', 'src/main.jsx', 'src/assets/**'],
      // Floors (npm run test:cov, CI): today's level, rounded down. Screens
      // are mostly covered by the browser tests (e2e/), not by unit tests.
      // Raise them when coverage goes up; never lower them.
      thresholds: { lines: 4.5, statements: 4.5, branches: 75, functions: 63 },
    },
  },
})
