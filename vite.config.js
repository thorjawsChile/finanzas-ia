import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'FinanzasIA',
        short_name: 'FinanzasIA',
        description: 'Análisis inteligente de gastos y sueldos',
        theme_color: '#059669',
        background_color: '#060810',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // Don't cache JS/HTML — always fetch fresh from network
        globPatterns: ['**/*.{css,svg,png,ico}'],
        navigateFallback: null,
        runtimeCaching: []
      }
    })
  ]
})
