export function usePwaInstallHint() {
  const isClient = import.meta.client
  const baseURL = useRuntimeConfig().app.baseURL || '/vsgolf/'

  const userAgent = isClient ? navigator.userAgent : ''
  const isAndroid = /Android/i.test(userAgent)
  const isSamsungBrowser = /SamsungBrowser/i.test(userAgent)
  const isChrome = /Chrome/i.test(userAgent) && !/SamsungBrowser|EdgA|OPR|Brave/i.test(userAgent)

  const siteUrl = computed(() => {
    if (!isClient) return 'https://universenet.github.io/vsgolf/'
    return new URL(baseURL, window.location.origin).href
  })

  const openInChromeUrl = computed(() => {
    const url = new URL(siteUrl.value)
    const hostPath = `${url.host}${url.pathname}`
    return `intent://${hostPath}#Intent;scheme=https;package=com.android.chrome;end`
  })

  const showAndroidInstallGuide = computed(() => isAndroid && (isSamsungBrowser || !isChrome))

  return {
    isAndroid,
    isSamsungBrowser,
    isChrome,
    siteUrl,
    openInChromeUrl,
    showAndroidInstallGuide,
  }
}
