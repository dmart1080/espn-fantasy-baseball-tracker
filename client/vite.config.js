import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Our Express backend
      '/api': 'http://localhost:3001',

      // ESPN Fantasy API proxy — requests come from user's machine (not blocked).
      // Client sends ESPN cookies as X-ESPN-S2 / X-ESPN-SWID headers;
      // the proxy converts them to a proper Cookie header for ESPN.
      '/espn-proxy': {
        target: 'https://fantasy.espn.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/espn-proxy/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Spoof browser-like headers
            proxyReq.setHeader('Origin', 'https://fantasy.espn.com')
            proxyReq.setHeader('Referer', 'https://fantasy.espn.com/')
            proxyReq.setHeader(
              'User-Agent',
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            )
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9')

            // Forward ESPN auth cookies if provided by client
            const s2 = req.headers['x-espn-s2']
            const swid = req.headers['x-espn-swid']
            if (s2 && swid) {
              proxyReq.setHeader('Cookie', `espn_s2=${s2}; SWID=${swid}`)
            }

            // Remove the custom headers so ESPN doesn't see them
            proxyReq.removeHeader('x-espn-s2')
            proxyReq.removeHeader('x-espn-swid')
          })
        },
      },
    },
  },
})
