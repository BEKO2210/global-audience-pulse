import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { motionStudio } from 'motion-studio'

export default defineConfig({
  base: '/global-audience-pulse/',
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'dev') },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler'))
            return 'react'
          if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion'))
            return 'motion'
          if (id.includes('node_modules/d3-')) return 'charts'
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    motionStudio(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-32x32.png', 'apple-touch-icon.png', 'og-image.png'],
      manifest: {
        name: 'Global Audience Pulse',
        short_name: 'Audience Pulse',
        description: 'Die Live-Weltuhr für Creator.',
        theme_color: '#11110f',
        background_color: '#11110f',
        display: 'standalone',
        lang: 'de',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        runtimeCaching: [
          {
            urlPattern: /\/data\/snapshot\.json$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'audience-snapshot', networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'] },
})
