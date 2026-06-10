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
      eyebrow="Analysis"
      title="부담 · 핸디 분석"
      description="저녁값 부담 비율과 핸디 변화를 확인하세요."
    />
    <BetBoardSplitPanel />
    <BetBoardHandicapPanel />
  </div>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.match-page {
  @include page-stack;
}
</style>
