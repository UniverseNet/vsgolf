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
      eyebrow="Round"
      title="라운드 입력"
      description="참가자 타수를 입력하고 이번 라운드 결과를 저장하세요."
    />
    <BetBoardMyStatusPanel />
    <BetBoardControlPanel />
  </div>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.match-page {
  @include page-stack;
}

@media (min-width: 1024px) {
  .match-page {
    :deep(.control-panel) {
      padding: 20px;
    }
  }
}
</style>
