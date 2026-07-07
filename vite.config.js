import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // Keep the hand-authored public/manifest.json (already linked in index.html).
      manifest: false,
      workbox: {
        // Precache the actual hashed build output so offline launch renders the
        // shell, plus the (small) in-browser shot-classifier model.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,onnx}'],
        navigateFallback: '/index.html',
        // Never serve the SPA shell for API calls.
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Backend API: always hit the network, never cache.
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkOnly',
          },
          {
            // MediaPipe model weights on the CDN: network only (too large to precache).
            urlPattern: ({ url }) => url.origin === 'https://cdn.jsdelivr.net',
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  }
})
