<script setup lang="ts">
const { boardRoundFeedback } = provideBetBoard()
</script>

<template>
  <main class="bet-board" :class="{ 'is-round-feedback': boardRoundFeedback }">
    <BetBoardHeader />
    <BetBoardSetupPanel />
    <BetBoardDashboard />
    <BetBoardControlPanel />

    <div class="insight-grid">
      <BetBoardSplitPanel />
      <BetBoardHandicapPanel />
    </div>

    <BetBoardSettlementPanel />
    <BetBoardHistoryPanel />
  </main>
</template>

<style lang="scss" scoped>
.bet-board {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 18px 0 116px;
  animation: board-fade-in 520ms var(--ease-out) both;

  &.is-round-feedback {
    :deep(.dashboard),
    :deep(.split-panel) {
      animation: outcome-win 520ms ease;
    }
  }
}

.insight-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 16px;
  margin-top: 16px;
  animation: panel-rise 560ms var(--ease-out) 190ms both;
}

@media (max-width: 960px) {
  .insight-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .bet-board {
    width: min(100% - 20px, 1180px);
    padding-top: 10px;
  }

  .insight-grid {
    grid-template-columns: 1fr;
  }
}
</style>
