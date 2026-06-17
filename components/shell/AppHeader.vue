<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const {
  activeMatch,
  saveStatusText,
  saveStatusAnimating,
  isRemoteStoreEnabled,
  isRemoteStoreConnected,
} = useBetBoardContext()

const isHome = computed(() => route.name === 'index')
const isMatchRoute = computed(() => Boolean(route.params.id))
const storageStatusText = computed(() => {
  if (!isRemoteStoreEnabled.value) {
    return '개인 저장'
  }

  return isRemoteStoreConnected.value ? '실시간 공유' : '공유 연결 확인'
})
const headerStatusText = computed(() => `${storageStatusText.value} · ${saveStatusText.value}`)

const pageTitle = computed(() => {
  if (isHome.value) {
    return 'VSGolf Bet'
  }

  return activeMatch.value?.title ?? '경기'
})

const goBack = () => {
  if (isMatchRoute.value) {
    router.push('/')
    return
  }

  router.back()
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <button
        v-if="!isHome"
        class="app-header__back"
        type="button"
        aria-label="뒤로 가기"
        @click="goBack"
      >
        ←
      </button>

      <div class="app-header__brand">
        <NuxtLink v-if="isHome" to="/" class="app-header__logo">VSGolf</NuxtLink>
        <div v-else class="app-header__title-wrap">
          <p class="app-header__eyebrow">Dinner Match</p>
          <h1 class="app-header__title">{{ pageTitle }}</h1>
        </div>
      </div>

      <output
        class="app-header__status"
        :class="{
          'app-header__status--remote': isRemoteStoreEnabled,
          'app-header__status--offline': isRemoteStoreEnabled && !isRemoteStoreConnected,
          'is-value-changing': saveStatusAnimating,
        }"
        aria-label="저장 상태"
      >
        {{ headerStatusText }}
      </output>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.app-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 50;
  height: var(--shell-header-h);
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);

  &__inner {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
    width: min(var(--page-max), calc(100% - var(--page-gutter) * 2));
    height: 100%;
    margin: 0 auto;
  }

  &__back {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    color: var(--text);
    font-size: 1rem;
    font-weight: 700;
    background: var(--surface);
  }

  &__logo {
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: 0;
    color: var(--pine);
  }

  &__title-wrap {
    min-width: 0;
  }

  &__eyebrow {
    margin: 0;
    color: var(--muted);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  &__title {
    overflow: hidden;
    margin: 0;
    font-size: 1rem;
    font-weight: 800;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__status {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    color: var(--muted);
    font-size: 0.75rem;
    font-weight: 700;
    background: var(--surface-muted);
    white-space: nowrap;

    &::before {
      width: 6px;
      height: 6px;
      margin-right: 6px;
      border-radius: 50%;
      background: #94a3b8;
      content: '';
    }
  }

  &__status--remote::before {
    background: var(--mint);
  }

  &__status--offline::before {
    background: #f59e0b;
  }

  &__status {
    &.is-value-changing::before {
      animation: save-pulse 700ms ease-in-out;
    }
  }
}

@media (min-width: 1024px) {
  .app-header {
    &__inner {
      gap: 16px;
    }

    &__back {
      width: 40px;
      height: 40px;
    }

    &__logo {
      font-size: 1.28rem;
    }

    &__title {
      font-size: 1.12rem;
    }

    &__status {
      min-height: 34px;
      padding: 0 12px;
      font-size: 0.8rem;
    }
  }
}
</style>
