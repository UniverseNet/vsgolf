<script setup lang="ts">
const { matchState, reversedHistory, swapHistoryResult, deleteHistoryResult } = useBetBoardContext()

const historySummaryItems = computed(() => [
  {
    label: '전체 기록',
    value: `${matchState.value.recordedRoundCount}R`,
  },
  {
    label: '정산 반영',
    value: `${matchState.value.settlementRoundCount}R`,
  },
  {
    label: '부분 라운드',
    value: `${matchState.value.partialRoundCount}R`,
  },
  {
    label: '정산 제외',
    value: `${matchState.value.excludedRoundCount}R`,
  },
])
</script>

<template>
  <section class="history-panel" aria-label="진행 기록">
    <div class="history-panel__summary" aria-label="라운드 기록 요약">
      <article
        v-for="summaryItem in historySummaryItems"
        :key="summaryItem.label"
        class="history-panel__summary-item"
      >
        <span>{{ summaryItem.label }}</span>
        <strong>{{ summaryItem.value }}</strong>
      </article>
    </div>

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
  display: grid;
  gap: 14px;
  padding: 16px;
}

.history-panel__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.history-panel__summary-item {
  display: grid;
  gap: 3px;
  min-height: 70px;
  padding: 12px;
  border: 1px solid rgba(34, 58, 50, 0.1);
  border-radius: 8px;
  background: var(--surface-muted);

  span {
    @include muted-label-text;
    font-size: 0.76rem;
  }

  strong {
    font-size: 1.25rem;
    font-weight: 900;
    line-height: 1.15;
  }
}

.history-list {
  display: grid;
  gap: 8px;
  min-height: 70px;
  margin: 0;
  padding: 0;
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

@media (max-width: 720px) {
  .history-panel__summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .history-list {
    gap: 10px;
  }
}
</style>
