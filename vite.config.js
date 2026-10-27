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
        // Cache the app shell without downloading the entire image library or
        // experimental model on every first visit.
        globPatterns: ['**/*.{js,css,html,svg,ico,woff,woff2}'],
        navigateFallback: '/index.html',
        // Never serve the SPA shell for API calls.
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => request.destination === 'image' && url.origin === self.location.origin,
            handler: 'CacheFirst',
            options: {
              cacheName: 'practice-images',
              expiration: { maxEntries: 24, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
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
