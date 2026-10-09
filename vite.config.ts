import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { motionStudio } from 'motion-studio'

export default defineConfig({
  base: '/global-audience-pulse/',
  plugins: [
    react(),
    tailwindcss(),
    motionStudio(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'Global Audience Pulse',
        short_name: 'Audience Pulse',
        description: 'Die Live-Weltuhr für Creator.',
        theme_color: '#11110f',
        background_color: '#11110f',
        display: 'standalone',
        lang: 'de',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,json}'],
        runtimeCaching: [{
          urlPattern: /\/data\/snapshot\.json$/,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'audience-snapshot' },
        }],
      },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
