<script setup lang="ts">
const { isRankFundMode } = useBetBoardContext()
</script>

<template>
  <div class="match-page">
    <PageIntro
      eyebrow="Settlement"
      title="최종 정산"
      :description="isRankFundMode ? '참가자별 누적 적립금과 정산 요약입니다.' : '참가자별 예상 결제 금액과 정산 요약입니다.'"
    />
    <BetBoardMyStatusPanel />
    <BetBoardSettlementPanel />
  </div>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.match-page {
  @include page-stack;
}

@media (min-width: 1024px) {
  .match-page {
    :deep(.settlement-panel) {
      padding: 20px;
    }
  }
}
</style>
