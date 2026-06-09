<script setup lang="ts">
const { appState, matchState, saveStatusText, saveStatusAnimating } = useBetBoardContext()
</script>

<template>
  <header class="app-header" aria-labelledby="page-title">
    <div class="app-header__identity">
      <span class="app-header__mark" aria-hidden="true" />
      <div class="app-header__title">
        <p class="app-header__eyebrow">Dinner Match Board</p>
        <h1 id="page-title">저녁내기 보드</h1>
        <p class="app-header__summary">
          참가자 {{ appState.participants.length }}명 · {{ matchState.history.length + 1 }}번째 내기 기준
        </p>
      </div>
    </div>

    <div class="app-header__meta" aria-label="보드 상태">
      <output class="status-pill status-pill--active">
        {{ appState.participants.length >= 3 ? '다인전' : '1:1' }}
      </output>
      <output class="status-pill">참가자 {{ appState.participants.length }}명</output>
      <output class="save-status" :class="{ 'is-value-changing': saveStatusAnimating }">
        {{ saveStatusText }}
      </output>
    </div>
  </header>
</template>
