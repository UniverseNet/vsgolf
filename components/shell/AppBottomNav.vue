<script setup lang="ts">
const route = useRoute()

const matchId = computed(() => route.params.id as string)

const tabs = computed(() => [
  { label: '개요', to: `/match/${matchId.value}`, exact: true },
  { label: '라운드', to: `/match/${matchId.value}/play` },
  { label: '분석', to: `/match/${matchId.value}/analysis` },
  { label: '정산', to: `/match/${matchId.value}/settlement` },
  { label: '설정', to: `/match/${matchId.value}/setup` },
])

const isActiveTab = (to: string, exact = false) => {
  const currentPath = route.path.replace(/\/$/, '')
  const targetPath = to.replace(/\/$/, '')

  if (exact) {
    return currentPath === targetPath
  }

  return currentPath.startsWith(targetPath)
}
</script>

<template>
  <nav class="bottom-nav" aria-label="경기 메뉴">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="bottom-nav__item"
      :class="{ 'bottom-nav__item--active': isActiveTab(tab.to, tab.exact) }"
    >
      {{ tab.label }}
    </NuxtLink>
  </nav>
</template>

<style lang="scss" scoped>
.bottom-nav {
  position: fixed;
  inset: auto 0 0;
  z-index: 50;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
  height: var(--shell-nav-h);
  padding: 8px max(12px, env(safe-area-inset-left)) calc(8px + env(safe-area-inset-bottom))
    max(12px, env(safe-area-inset-right));
  border-top: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);

  &__item {
    display: grid;
    place-items: center;
    min-height: 44px;
    border-radius: var(--radius-sm);
    color: var(--muted);
    font-size: 0.78rem;
    font-weight: 700;
    transition:
      background-color 140ms ease,
      color 140ms ease;

    &--active {
      color: var(--pine);
      background: var(--teal-soft);
    }
  }
}
</style>
