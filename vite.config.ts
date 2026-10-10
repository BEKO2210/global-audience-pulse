import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { motionStudio } from 'motion-studio'
import { resolve } from 'node:path'

export default defineConfig({
  base: '/global-audience-pulse/',
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'dev') },
  build: {
    // No eager modulepreload of the big chunks: on slow links they compete with the CSS that gates
    // first paint of the static shell (index.html). They still load right after main.js starts.
    modulePreload: false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        impressum: resolve(import.meta.dirname, 'impressum/index.html'),
        datenschutz: resolve(import.meta.dirname, 'datenschutz/index.html'),
      },
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
      injectRegister: 'script-defer',
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
        navigateFallbackDenylist: [/\/(?:impressum|datenschutz)\/?$/],
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
