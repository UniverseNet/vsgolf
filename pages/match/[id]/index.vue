<script setup lang="ts">
const { boardRoundFeedback, isRankFundMode } = useBetBoardContext()
</script>

<template>
  <div class="match-page" :class="{ 'is-round-feedback': boardRoundFeedback }">
    <PageIntro
      eyebrow="Overview"
      title="내기 개요"
      :description="isRankFundMode ? '현재 적립금과 목표까지 남은 금액을 한눈에 확인하세요.' : '현재 부담 비율과 진행 상황을 한눈에 확인하세요.'"
    />

    <BetBoardRulesPrimer />
    <BetBoardMyStatusPanel />
    <BetBoardProgressGuide />
    <BetBoardDashboard />
  </div>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.match-page {
  @include page-stack;

  &.is-round-feedback :deep(.dashboard) {
    animation: outcome-win 520ms ease;
  }
}

</style>
