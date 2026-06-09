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
