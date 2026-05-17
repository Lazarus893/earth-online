import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: 'viz',
  server: {
    proxy: {
      // OpenClaw Gateway 代理 — 解决 CORS
      '/api/openclaw': {
        target: 'http://localhost:18789',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openclaw/, ''),
      },
    },
  },
})
