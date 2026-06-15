<script setup lang="ts">
const route = useRoute()
const board = provideBetBoard()

const isMatchRoute = computed(() => route.path.includes('/match/'))

watch(
  () => route.params.id,
  (matchId) => {
    if (typeof matchId !== 'string') {
      return
    }

    if (board.appState.value.matches.some((match) => match.id === matchId)) {
      board.switchMatch(matchId)
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--match': isMatchRoute }">
    <AppHeader />
    <main class="app-shell__main">
      <slot />
    </main>
    <AppBottomNav v-if="isMatchRoute" />
    <PwaPrompt />
  </div>
</template>

<style lang="scss" scoped>
.app-shell {
  min-height: 100vh;
  background: var(--bg-app);

  &__main {
    width: min(var(--page-max), calc(100% - var(--page-gutter) * 2));
    margin: 0 auto;
    padding: calc(var(--shell-header-h) + 16px) 0 24px;
  }

  &--match &__main {
    padding-bottom: calc(var(--shell-nav-h) + 24px);
  }
}

@media (min-width: 1024px) {
  .app-shell {
    &__main {
      padding-top: calc(var(--shell-header-h) + 24px);
    }

    &--match &__main {
      padding-bottom: calc(var(--shell-nav-h) + 34px);
    }
  }
}
</style>
