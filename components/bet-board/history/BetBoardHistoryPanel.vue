<script setup lang="ts">
const { reversedHistory, swapHistoryResult, deleteHistoryResult } = useBetBoardContext()
</script>

<template>
  <section class="history-panel" aria-label="진행 기록">
    <BetBoardSectionHeading eyebrow="History" title="라운드 기록" />

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
