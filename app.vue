<script setup lang="ts">
const route = useRoute()
const isLaunchScreenVisible = ref(false)
const shouldRenderPwaManifest = !import.meta.dev
let launchScreenTimer: ReturnType<typeof setTimeout> | null = null

const isStandaloneDisplay = () => {
  if (!import.meta.client) {
    return false
  }

  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }

  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
}

onMounted(() => {
  if (!isStandaloneDisplay() && route.query.launch !== '1') {
    return
  }

  isLaunchScreenVisible.value = true
  launchScreenTimer = window.setTimeout(() => {
    isLaunchScreenVisible.value = false
  }, 1380)
})

onBeforeUnmount(() => {
  if (launchScreenTimer) {
    window.clearTimeout(launchScreenTimer)
  }
})
</script>

<template>
  <NuxtPwaManifest v-if="shouldRenderPwaManifest" />
  <PwaLaunchScreen v-if="isLaunchScreenVisible" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
