import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Lyssna på alla nätverksinterface så dev-servern nås från LAN (t.ex. mobil på samma nät).
    host: true,
    // AI-förslagsservern (npm run server) — håller Claude-anropen utanför webbläsaren.
    proxy: { '/api': 'http://localhost:8787' },
  },
})
