<script setup lang="ts">
const appBaseURL = useRuntimeConfig().app.baseURL
</script>

<template>
  <section class="pwa-launch-screen" aria-hidden="true">
    <div class="pwa-launch-screen__brand">
      <img class="pwa-launch-screen__icon" :src="`${appBaseURL}apple-touch-icon.png`" alt="" />
      <strong class="pwa-launch-screen__name">VSGolf</strong>
      <span class="pwa-launch-screen__title">저녁내기 보드</span>
      <span class="pwa-launch-screen__description">라운드 부담 · 실시간 정산</span>
    </div>
    <div class="pwa-launch-screen__bar">
      <span />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.pwa-launch-screen {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  grid-template-rows: 1fr auto;
  min-height: 100dvh;
  overflow: hidden;
  padding: max(76px, calc(64px + env(safe-area-inset-top))) 28px
    max(54px, calc(42px + env(safe-area-inset-bottom)));
  color: #f7f2e7;
  background: #071e1a;
  isolation: isolate;
  animation: launch-hide 260ms ease 1180ms both;
  pointer-events: none;

  &::before,
  &::after {
    position: absolute;
    inset: 0;
    z-index: -1;
    content: '';
  }

  &::before {
    background:
      linear-gradient(180deg, rgba(4, 18, 15, 0.92), rgba(7, 30, 26, 0.28) 42%, rgba(3, 12, 10, 0.72)),
      url('/vsgolf/splash/launch-illustration.png') center / cover no-repeat;
    transform: scale(1.025);
    animation: launch-scene 1280ms var(--ease-out) both;
  }

  &::after {
    background:
      radial-gradient(circle at 50% 23%, rgba(56, 201, 141, 0.26), transparent 26%),
      linear-gradient(180deg, rgba(5, 21, 18, 0.18), rgba(5, 21, 18, 0.72));
  }
}

.pwa-launch-screen__brand {
  align-self: start;
  display: grid;
  justify-items: center;
  gap: 8px;
  padding-top: min(8dvh, 88px);
  text-align: center;
  animation: launch-brand 820ms var(--ease-out) both;
}

.pwa-launch-screen__icon {
  width: clamp(92px, 18vw, 148px);
  height: clamp(92px, 18vw, 148px);
  margin-bottom: 8px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 26%;
  box-shadow:
    0 22px 52px rgba(0, 0, 0, 0.34),
    0 0 42px rgba(56, 201, 141, 0.18);
}

.pwa-launch-screen__name {
  font-size: clamp(3.2rem, 13vw, 5.8rem);
  font-weight: 900;
  line-height: 0.92;
  text-shadow: 0 12px 28px rgba(0, 0, 0, 0.32);
}

.pwa-launch-screen__title {
  color: #c7f6e6;
  font-size: clamp(1.45rem, 6.4vw, 2.7rem);
  font-weight: 800;
  line-height: 1.08;
  text-shadow: 0 8px 18px rgba(0, 0, 0, 0.28);
}

.pwa-launch-screen__description {
  color: rgba(246, 240, 223, 0.86);
  font-size: clamp(0.92rem, 3.6vw, 1.32rem);
  font-weight: 700;
  line-height: 1.25;
}

.pwa-launch-screen__bar {
  justify-self: center;
  width: min(58vw, 320px);
  height: 5px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: rgba(247, 242, 231, 0.18);
  box-shadow: 0 0 0 1px rgba(242, 197, 107, 0.16);

  span {
    display: block;
    width: 42%;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #38c98d, #f2c56b);
    animation: launch-bar 1020ms ease-in-out both;
  }
}

@keyframes launch-scene {
  from {
    filter: saturate(0.82) brightness(0.72);
    transform: scale(1.055);
  }

  to {
    filter: saturate(1) brightness(1);
    transform: scale(1.025);
  }
}

@keyframes launch-brand {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes launch-bar {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(150%);
  }
}

@keyframes launch-hide {
  to {
    opacity: 0;
    visibility: hidden;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pwa-launch-screen,
  .pwa-launch-screen::before,
  .pwa-launch-screen__brand,
  .pwa-launch-screen__bar span {
    animation-duration: 1ms;
  }
}
</style>
