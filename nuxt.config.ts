const appBaseURL = '/vsgolf/'

const appleSplashScreens = [
  { width: 320, height: 568, ratio: 2, file: 'apple-splash-640x1136.jpg' },
  { width: 375, height: 667, ratio: 2, file: 'apple-splash-750x1334.jpg' },
  { width: 414, height: 896, ratio: 2, file: 'apple-splash-828x1792.jpg' },
  { width: 375, height: 812, ratio: 3, file: 'apple-splash-1125x2436.jpg' },
  { width: 390, height: 844, ratio: 3, file: 'apple-splash-1170x2532.jpg' },
  { width: 393, height: 852, ratio: 3, file: 'apple-splash-1179x2556.jpg' },
  { width: 414, height: 736, ratio: 3, file: 'apple-splash-1242x2208.jpg' },
  { width: 414, height: 896, ratio: 3, file: 'apple-splash-1242x2688.jpg' },
  { width: 428, height: 926, ratio: 3, file: 'apple-splash-1284x2778.jpg' },
  { width: 430, height: 932, ratio: 3, file: 'apple-splash-1290x2796.jpg' },
  { width: 768, height: 1024, ratio: 2, file: 'apple-splash-1536x2048.jpg' },
  { width: 834, height: 1112, ratio: 2, file: 'apple-splash-1668x2224.jpg' },
  { width: 834, height: 1194, ratio: 2, file: 'apple-splash-1668x2388.jpg' },
  { width: 1024, height: 1366, ratio: 2, file: 'apple-splash-2048x2732.jpg' },
].map(({ width, height, ratio, file }) => ({
  rel: 'apple-touch-startup-image',
  href: `${appBaseURL}splash/${file}`,
  media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`,
}))

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
  $development: {
    nitro: {
      output: {
        dir: '.output',
        publicDir: '.output/public',
      },
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
    baseURL: appBaseURL,
    head: {
      htmlAttrs: { lang: 'ko' },
      title: '스크린골프 저녁내기 진행판',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' },
        { name: 'theme-color', content: '#071e1a' },
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
        ...appleSplashScreens,
      ],
    },
  },
  pwa: {
    registerType: 'autoUpdate',
    includeAssets: [
      'favicon.ico',
      'apple-touch-icon.png',
      'pwa-192x192.png',
      'pwa-512x512.png',
      'splash/*.jpg',
      'splash/launch-illustration.png',
      '.nojekyll',
    ],
    manifest: {
      id: '/vsgolf/',
      name: 'VSGolf 저녁내기',
      short_name: 'VSGolf',
      description: '스크린골프 저녁내기 진행판',
      start_url: '/vsgolf/',
      scope: '/vsgolf/',
      theme_color: '#071e1a',
      background_color: '#071e1a',
      display: 'standalone',
      lang: 'ko',
      dir: 'ltr',
      orientation: 'portrait',
      categories: ['utilities', 'sports'],
      prefer_related_applications: false,
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
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
      navigateFallback: '/vsgolf/index.html',
      globPatterns: ['**/*.{js,css,html,png,jpg,ico,svg,woff2,json,webmanifest}'],
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
