import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/idle/',
  css: {
    preprocessorOptions: {
      scss: {
        // Bootstrap 5 is written against the legacy Sass module system: consuming
        // individual partials (see src/styles/app.scss) requires `@import`, and
        // its internals still use the deprecated global/colour functions. These
        // are Bootstrap's to fix in a future major - silence them so real
        // warnings from our own styles stay visible.
        silenceDeprecations: [
          'import',
          'global-builtin',
          'color-functions',
          'if-function',
        ],
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Castaway Idle',
        short_name: 'Castaway',
        description: 'Stranded on an island idle survival game.',
        theme_color: '#0e5c82',
        background_color: '#7ed0e8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/idle/',
        scope: '/idle/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})
