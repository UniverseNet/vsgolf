<script setup lang="ts">
const { activeMatch, matchState, saveStatusText, saveStatusAnimating } = useBetBoardContext()
</script>

<template>
  <header class="app-header" aria-labelledby="page-title">
    <div class="app-header__identity">
      <span class="app-header__mark" aria-hidden="true" />
      <div class="app-header__title">
        <p class="app-header__eyebrow">Dinner Match Board</p>
        <h1 id="page-title">저녁내기 보드</h1>
        <p class="app-header__summary">
          참가자 {{ activeMatch?.participants.length ?? 0 }}명 · {{ matchState.recordedRoundCount + 1 }}번째 내기 기준
        </p>
      </div>
    </div>

    <div class="app-header__meta" aria-label="보드 상태">
      <output class="status-pill status-pill--active">
        {{ (activeMatch?.participants.length ?? 0) >= 3 ? '다인전' : '1:1' }}
      </output>
      <output class="status-pill">참가자 {{ activeMatch?.participants.length ?? 0 }}명</output>
      <output class="save-status" :class="{ 'is-value-changing': saveStatusAnimating }">
        {{ saveStatusText }}
      </output>
    </div>
  </header>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  overflow: hidden;
  padding: 16px 18px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  color: #ffffff;
  background:
    linear-gradient(110deg, rgba(255, 255, 255, 0.08), transparent 42%),
    linear-gradient(135deg, rgba(18, 57, 47, 0.96), rgba(16, 26, 23, 0.92) 54%, rgba(122, 76, 104, 0.86));
  box-shadow: var(--shadow-strong);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);

  &::before {
    position: absolute;
    inset: 0;
    background:
      repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px 58px),
      linear-gradient(90deg, transparent, rgba(56, 201, 141, 0.12), transparent);
    background-size:
      58px 100%,
      180px 100%;
    animation: header-sheen 6s ease-in-out infinite;
    content: '';
    pointer-events: none;
  }
}

.app-header__identity,
.app-header__meta {
  position: relative;
  z-index: 1;
}

.app-header__identity {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.app-header__mark {
  position: relative;
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 8px;
  background:
    linear-gradient(140deg, rgba(56, 201, 141, 0.9), rgba(7, 137, 135, 0.72)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.24), transparent);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
  animation: mark-glow 3.8s ease-in-out infinite;

  &::before {
    position: absolute;
    right: 10px;
    bottom: 10px;
    width: 24px;
    height: 24px;
    border: 3px solid rgba(255, 255, 255, 0.92);
    border-radius: 50%;
    content: '';
  }

  &::after {
    position: absolute;
    left: 9px;
    bottom: 16px;
    width: 30px;
    height: 3px;
    border-radius: 99px;
    background: rgba(255, 255, 255, 0.92);
    transform: rotate(-28deg);
    transform-origin: left center;
    content: '';
  }
}

.app-header__eyebrow {
  @include eyebrow-text;
  color: rgba(255, 255, 255, 0.66);
}

.app-header h1 {
  margin: 0;
  font-size: 1.76rem;
  line-height: 1.05;
}

.app-header__summary {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.95rem;
  font-weight: 700;
}

.app-header__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.status-pill,
.save-status {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.1);
}

.status-pill--active {
  color: #073f3c;
  background: linear-gradient(135deg, rgba(78, 223, 167, 0.94), rgba(255, 231, 158, 0.9));
}

.save-status::before {
  width: 8px;
  height: 8px;
  margin-right: 8px;
  border-radius: 50%;
  background: var(--mint);
  box-shadow: 0 0 0 4px rgba(56, 201, 141, 0.18);
  content: '';
}

.save-status.is-value-changing::before {
  animation: save-pulse 700ms ease-in-out;
}

@media (max-width: 720px) {
  .app-header {
    position: relative;
    align-items: start;
    flex-direction: column;
    padding: 18px;
  }

  .app-header__identity {
    align-items: start;
  }

  .app-header h1 {
    font-size: 1.65rem;
  }

  .app-header__meta {
    justify-content: flex-start;
  }
}
</style>
