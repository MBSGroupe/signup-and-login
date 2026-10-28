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
    },
  },
})
