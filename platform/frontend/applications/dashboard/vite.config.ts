import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { config } from 'dotenv'

config({
    path: 'vite.server.env',
})

const DEV_SERVER = process.env.DEV_SERVER || 'http://localhost:9080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: DEV_SERVER,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false,
        // Large multipart uploads (e.g. .tar) — avoid proxy aborting mid-stream
        timeout: 0,
        proxyTimeout: 0,
      },
    },
  },
  appType: 'spa',
})
