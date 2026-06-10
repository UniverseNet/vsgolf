<script setup lang="ts">
const { $pwa } = useNuxtApp()

const showUpdatePrompt = computed(() => Boolean($pwa?.needRefresh))
const showOfflineReady = computed(() => Boolean($pwa?.offlineReady))
const showInstallPrompt = computed(() => Boolean($pwa?.showInstallPrompt))

const dismissOfflineReady = async () => {
  await $pwa?.cancelPrompt()
}

const reloadApp = async () => {
  await $pwa?.updateServiceWorker(true)
}

const installApp = async () => {
  await $pwa?.install()
}

const dismissInstall = () => {
  $pwa?.cancelInstall()
}
</script>

<template>
  <TransitionGroup name="pwa-toast" tag="div" class="pwa-prompts" aria-live="polite">
    <div v-if="showOfflineReady" class="pwa-prompt pwa-prompt--info">
      <p>오프라인에서도 사용할 수 있습니다.</p>
      <button type="button" @click="dismissOfflineReady">확인</button>
    </div>

    <div v-if="showUpdatePrompt" class="pwa-prompt pwa-prompt--update">
      <p>새 버전이 있습니다. 업데이트하시겠습니까?</p>
      <div class="pwa-prompt__actions">
        <button type="button" class="pwa-prompt__primary" @click="reloadApp">업데이트</button>
        <button type="button" @click="dismissOfflineReady">나중에</button>
      </div>
    </div>

    <div v-if="showInstallPrompt" class="pwa-prompt pwa-prompt--install">
      <p>홈 화면에 추가하면 앱처럼 사용할 수 있습니다.</p>
      <div class="pwa-prompt__actions">
        <button type="button" class="pwa-prompt__primary" @click="installApp">설치</button>
        <button type="button" @click="dismissInstall">닫기</button>
      </div>
    </div>
  </TransitionGroup>
</template>

<style lang="scss" scoped>
.pwa-prompts {
  position: fixed;
  right: 16px;
  bottom: calc(var(--shell-nav-h, 72px) + 16px);
  z-index: 80;
  display: grid;
  gap: 10px;
  width: min(360px, calc(100vw - 32px));
}

.pwa-prompt {
  display: grid;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: var(--shadow-strong);
  backdrop-filter: blur(10px);

  p {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    line-height: 1.45;
  }

  button {
    min-height: 36px;
    padding: 0 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 0.84rem;
    font-weight: 700;
    background: var(--surface);
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  &__primary {
    color: #fff;
    border-color: transparent;
    background: linear-gradient(135deg, var(--teal), var(--mint));
  }

  &--info {
    border-color: rgba(7, 137, 135, 0.2);
    background: linear-gradient(135deg, rgba(228, 246, 243, 0.98), rgba(255, 255, 255, 0.98));
  }
}

.pwa-toast-enter-active,
.pwa-toast-leave-active {
  transition:
    opacity 200ms ease,
    transform 200ms var(--ease-out);
}

.pwa-toast-enter-from,
.pwa-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
