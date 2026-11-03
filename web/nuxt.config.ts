export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/ui', '@vite-pwa/nuxt'],
  css: ['~/assets/css/main.css'],
  app: { head: { htmlAttrs: { lang: 'nl' }, title: 'GymXL', meta: [{ name: 'theme-color', content: '#1d4ed8' }] } },
  runtimeConfig: { public: { pbUrl: '' } }, // leeg = zelfde host (pb_public)
  // In dev draait PocketBase op :8090
  vite: { server: { proxy: { '/api': 'http://127.0.0.1:8090' } } },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'GymXL Niveauvolgsysteem', short_name: 'GymXL', lang: 'nl',
      theme_color: '#1d4ed8', background_color: '#ffffff', display: 'standalone',
      icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
    },
    workbox: { globPatterns: ['**/*.{js,css,html,svg,webmanifest}'], navigateFallback: '/', navigateFallbackDenylist: [/^\/api/, /^\/_\//] },
  },
  // Iconen meebundelen: geen externe iconen-API (AVG, werkt ook met slecht bereik)
  icon: {
    provider: 'none',
    clientBundle: {
      scan: true,
      icons: ['check', 'chevron-down', 'chevron-up', 'chevron-left', 'chevron-right', 'x', 'circle-alert', 'circle-check', 'circle-x', 'info', 'triangle-alert', 'loader-circle', 'menu', 'minus', 'plus', 'search', 'eye', 'eye-off', 'ellipsis', 'arrow-left', 'arrow-right'].map(i => `lucide:${i}`),
    },
  },
  compatibilityDate: '2026-11-01',
})
