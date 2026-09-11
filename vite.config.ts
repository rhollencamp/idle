import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/idle/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mate Atua',
        short_name: 'Mate Atua',
        description:
          'An idle game: your pā holds the shore against what the sea is sending up the beach.',
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
        // The backdrop photograph is precached as AVIF only; the JPEG beside
        // it is a fallback for browsers that cannot decode AVIF, and doubling
        // the install cost to cover them offline is not worth it.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,avif}'],
      },
    }),
  ],
})
