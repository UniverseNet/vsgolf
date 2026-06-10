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
      eyebrow="Setup"
      title="경기 · 참가자 설정"
      description="경기 정보와 참가자를 관리합니다."
    />
    <BetBoardSetupPanel />
    <NuxtLink :to="`/match/${route.params.id}/history`" class="history-link">
      라운드 기록 보기 →
    </NuxtLink>
  </div>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.match-page {
  @include page-stack;
}

.history-link {
  justify-self: start;
  color: var(--teal);
  font-size: 0.88rem;
  font-weight: 700;
}
</style>
