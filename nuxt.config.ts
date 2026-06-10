export default defineNuxtConfig({
  compatibilityDate: '2025-06-09',
  ssr: false,
  experimental: {
    viteEnvironmentApi: true,
  },
  nitro: {
    preset: 'static',
    output: {
      dir: 'docs',
      publicDir: 'docs',
    },
  },
  modules: ['@vite-pwa/nuxt'],
  devtools: { enabled: true },
  components: [
    {
      path: '~/components/bet-board',
      pathPrefix: false,
    },
    {
      path: '~/components/shell',
      pathPrefix: false,
    },
  ],
  css: ['~/assets/css/base.css'],
  app: {
    baseURL: '/vsgolf/',
    head: {
      htmlAttrs: { lang: 'ko' },
      title: '스크린골프 저녁내기 진행판',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' },
        { name: 'theme-color', content: '#12392f' },
        { name: 'description', content: '스크린골프 저녁내기 진행판 — 여러 경기의 부담 비율과 정산을 관리합니다.' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'VSGolf' },
      ],
      link: [
        { rel: 'manifest', href: 'manifest.webmanifest' },
        { rel: 'icon', href: 'pwa-192x192.png', type: 'image/png' },
        { rel: 'apple-touch-icon', href: 'apple-touch-icon.png' },
      ],
    },
  },
  pwa: {
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', '.nojekyll'],
    manifest: {
      name: 'VSGolf 저녁내기',
      short_name: 'VSGolf',
      description: '스크린골프 저녁내기 진행판',
      theme_color: '#12392f',
      background_color: '#f3f6f4',
      display: 'standalone',
      lang: 'ko',
      orientation: 'portrait',
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
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      navigateFallback: '/index.html',
      globPatterns: ['**/*.{js,css,html,png,ico,svg,woff2,json,webmanifest}'],
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 3600,
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  },
})
