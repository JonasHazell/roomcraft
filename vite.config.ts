import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Lyssna på alla nätverksinterface så dev-servern nås från LAN (t.ex. mobil på samma nät).
    host: true,
    // AI-förslagsservern (npm run server) — håller Claude-anropen utanför webbläsaren.
    proxy: { '/api': 'http://localhost:8787' },
  },
  test: {
    // Vitest kör enhetstesterna under src/ och server/. Playwright-specarna i
    // e2e/ (*.spec.ts) drivs av `npm run test:e2e`, inte av Vitest — annars
    // krockar Playwrights test-API med Vitest.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
