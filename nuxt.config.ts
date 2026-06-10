export default defineNuxtConfig({
  compatibilityDate: '2025-06-09',
  ssr: false,
  experimental: {
    viteEnvironmentApi: true,
  },
  nitro: {
    preset: 'static',
    output: {
      dir: 'dist',
      publicDir: 'dist',
    },
  },
  devtools: { enabled: true },
  components: [
    {
      path: '~/components/bet-board',
      pathPrefix: false,
    },
  ],
  css: ['~/assets/css/base.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'ko' },
      title: '스크린골프 저녁내기 진행판',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
        { name: 'theme-color', content: '#101a17' },
      ],
    },
  },
})
