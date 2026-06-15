<script setup lang="ts">
const { reversedHistory, swapHistoryResult, deleteHistoryResult } = useBetBoardContext()
</script>

<template>
  <section class="history-panel" aria-label="진행 기록">
    <ol class="history-list">
      <BetBoardHistoryItem
        v-for="(entry, index) in reversedHistory"
        :key="entry.round"
        :entry="entry"
        :is-latest="index === 0"
        @swap="swapHistoryResult"
        @delete="deleteHistoryResult"
      />
    </ol>
  </section>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.history-panel {
  @include panel-surface;
  padding: 16px;
}

.history-list {
  display: grid;
  gap: 8px;
  min-height: 70px;
  max-height: 380px;
  margin: 0;
  padding: 0;
  overflow: auto;
  list-style: none;

  &:empty::before {
    display: grid;
    place-items: center;
    min-height: 70px;
    border: 1px dashed var(--border-strong);
    border-radius: 8px;
    color: var(--muted);
    font-weight: 700;
    background: rgba(255, 255, 255, 0.44);
    content: '아직 입력된 결과가 없습니다';
  }
}

@media (min-width: 1024px) {
  .history-list {
    max-height: 540px;
    gap: 10px;
  }
}
</style>
