<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { appState, isRankFundMode } = useBetBoardContext()

onMounted(() => {
  const matchId = route.params.id as string

  if (!appState.value.matches.some((match) => match.id === matchId)) {
    router.replace('/')
  }
})
</script>

<template>
  <div class="match-page">
    <PageIntro
      eyebrow="Analysis"
      :title="isRankFundMode ? '적립 · 핸디 분석' : '부담 · 핸디 분석'"
      :description="isRankFundMode ? '누적 적립금과 핸디 변화를 확인하세요.' : '저녁값 부담 비율과 핸디 변화를 확인하세요.'"
    />
    <BetBoardMyStatusPanel />
    <BetBoardSplitPanel />
    <BetBoardHandicapPanel />
  </div>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.match-page {
  @include page-stack;
}

@media (min-width: 1024px) {
  .match-page {
    grid-template-columns: minmax(0, 1.08fr) minmax(360px, 0.92fr);
    align-items: start;

    :deep(.page-intro) {
      grid-column: 1 / -1;
    }

    :deep(.my-status) {
      grid-column: 1 / -1;
    }
  }
}
</style>
