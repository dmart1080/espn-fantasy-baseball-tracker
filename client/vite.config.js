import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Our Express backend
      '/api': 'http://localhost:3001',

      // ESPN Fantasy API — proxied from the user's machine so the IP isn't blocked.
      // The browser calls /espn-proxy/... and Vite rewrites it to fantasy.espn.com.
      '/espn-proxy': {
        target: 'https://fantasy.espn.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/espn-proxy/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Make the request look like it came from ESPN's own site
            proxyReq.setHeader('Origin', 'https://fantasy.espn.com')
            proxyReq.setHeader('Referer', 'https://fantasy.espn.com/')
          })
        },
      },
    },
  },
})
