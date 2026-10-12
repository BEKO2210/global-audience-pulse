import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { motionStudio } from 'motion-studio'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

const BASE = '/global-audience-pulse/'
const SITE = `https://beko2210.github.io${BASE}`

/**
 * Latin woff2 of the fonts the static shell paints per style: display 600 (h1), ui 500/600 (eyebrow, wordmark)
 * and ui 400 for the body right after. The inline style script in index.html preloads the stored style's files
 * only (O-014), so the headline no longer waits for main.js -> style chunk -> css -> font.
 */
const SHELL_FONTS: Record<string, string[]> = {
  tafel: [
    'ibm-plex-sans-condensed-latin-600',
    'ibm-plex-sans-latin-600',
    'ibm-plex-sans-latin-500',
    'ibm-plex-sans-latin-400',
  ],
  atlas: ['source-serif-4-latin-wght', 'source-sans-3-latin-wght'],
  praezision: ['schibsted-grotesk-latin-wght'],
  archiv: [
    'source-serif-4-latin-wght',
    'ibm-plex-sans-latin-600',
    'ibm-plex-sans-latin-500',
    'ibm-plex-sans-latin-400',
  ],
}

/** Fills `const fonts = {}` in the index.html style script with the hashed URLs from the bundle. */
function fontPreload(): Plugin {
  return {
    name: 'gap-font-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const files = Object.keys(ctx.bundle ?? {}).filter((f) => f.endsWith('.woff2'))
        const fonts = Object.fromEntries(
          Object.entries(SHELL_FONTS).map(([style, names]) => [
            style,
            names.flatMap((name) =>
              files.filter((f) => f.includes(`/${name}-normal-`)).map((f) => BASE + f),
            ),
          ]),
        )
        return html.replace('const fonts = {}', `const fonts = ${JSON.stringify(fonts)}`)
      },
    },
  }
}

/** sitemap.xml with the build date: the home page plus the legal pages (those are noindex, so only home). */
function sitemap(): Plugin {
  return {
    name: 'gap-sitemap',
    apply: 'build',
    generateBundle() {
      const lastmod = new Date().toISOString().slice(0, 10)
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${['', '?lang=en']
  .map(
    (query) => `  <url>
    <loc>${SITE}${query}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq>
    <xhtml:link rel="alternate" hreflang="de" href="${SITE}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}?lang=en"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}"/>
  </url>`,
  )
  .join('\n')}
</urlset>
`,
      })
    },
  }
}

export default defineConfig({
  base: BASE,
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
    sitemap(),
    fontPreload(),
    VitePWA({
      // Registered by UpdateToast after idle; a waiting deploy is announced instead of silently skipped,
      // so open tabs and installed apps never keep running an old build.
      injectRegister: false,
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'favicon-32x32.png', 'apple-touch-icon.png', 'og-image.png'],
      manifest: {
        name: 'Global Audience Pulse',
        short_name: 'Audience Pulse',
        description:
          'Live-Weltuhr für Creator: wann dein Publikum weltweit wach ist, mit Planer und geprüften Posting-Zeiten.',
        categories: ['productivity', 'social', 'utilities'],
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
        globIgnores: [
          // The DE/EN UI never requests these subsets (@font-face unicode-range): 39 files, 440 kB less to precache.
          '**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2',
          // the snapshot is refreshed by the data workflow without a rebuild: never serve it from the revisioned
          // precache (that route wins over runtimeCaching); NetworkFirst below keeps the last real one for offline
          '**/data/snapshot.json',
        ],
        navigateFallbackDenylist: [/\/(?:impressum|datenschutz)\/?$/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname === 'stats.it-handwerk-stuttgart.de',
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/data\/snapshot\.json$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'audience-snapshot', networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
})
