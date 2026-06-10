<script setup lang="ts">
const { $pwa } = useNuxtApp()
const {
  isAndroid,
  openInChromeUrl,
  showAndroidInstallGuide,
} = usePwaInstallHint()

const showUpdatePrompt = computed(() => Boolean($pwa?.needRefresh))
const showOfflineReady = computed(() => Boolean($pwa?.offlineReady))
const showInstallPrompt = computed(() => Boolean($pwa?.showInstallPrompt))
const showPlayProtectGuide = computed(() => showInstallPrompt.value && isAndroid)

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

      <div v-if="showPlayProtectGuide" class="pwa-prompt__guide">
        <p v-if="showAndroidInstallGuide" class="pwa-prompt__note">
          삼성 인터넷 등 일부 브라우저에서는 Play Protect 경고로 설치가 막힐 수 있습니다.
          <strong>Chrome</strong>에서 설치해 주세요.
        </p>
        <p v-else class="pwa-prompt__note">
          Play Protect 경고가 나오면 앱 문제가 아니라 Android의 WebAPK 보안 검사입니다.
        </p>
        <ul class="pwa-prompt__steps">
          <li>Chrome 메뉴(⋮) → 「홈 화면에 추가」 또는 아래 「설치」</li>
          <li>경고 화면에서 「자세히」 → 「그래도 설치」 선택</li>
        </ul>
        <a
          v-if="showAndroidInstallGuide"
          class="pwa-prompt__link"
          :href="openInChromeUrl"
        >
          Chrome에서 열기
        </a>
      </div>

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

  &__guide {
    display: grid;
    gap: 8px;
  }

  &__note {
    font-size: 0.82rem !important;
    font-weight: 500 !important;
    color: var(--muted);
  }

  &__steps {
    margin: 0;
    padding-left: 18px;
    color: var(--muted);
    font-size: 0.8rem;
    line-height: 1.45;

    li + li {
      margin-top: 4px;
    }
  }

  &__link {
    justify-self: start;
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--teal);
    text-decoration: underline;
    text-underline-offset: 2px;
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
