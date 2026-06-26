<template>
  <div class="match-page">
    <PageIntro
      eyebrow="History"
      title="라운드 기록"
      description="입력한 라운드 결과를 확인하고 수정할 수 있습니다."
    />
    <BetBoardHistoryPanel />
  </div>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.match-page {
  @include page-stack;
}

@media (min-width: 1024px) {
  .match-page {
    :deep(.history-panel) {
      padding: 20px;
    }
  }
}
</style>
