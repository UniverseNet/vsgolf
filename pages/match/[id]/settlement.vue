<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { appState } = useBetBoardContext()

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
      eyebrow="Settlement"
      title="최종 정산"
      description="참가자별 예상 결제 금액과 정산 요약입니다."
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
