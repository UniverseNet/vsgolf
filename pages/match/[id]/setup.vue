<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { appState, activeMatch, MIN_PARTICIPANTS } = useBetBoardContext()

const canStartRound = computed(() => (activeMatch.value?.participants.length ?? 0) >= MIN_PARTICIPANTS)
const followUpLink = computed(() =>
  canStartRound.value ? `/match/${route.params.id}/play` : `/match/${route.params.id}`,
)
const followUpLabel = computed(() => (canStartRound.value ? '라운드 입력으로 이동 →' : '내기 개요로 이동 →'))

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
      title="내기 · 참가자 설정"
      description="내기 정보와 참가자를 관리합니다."
    />
    <BetBoardSetupPanel />
    <NuxtLink :to="followUpLink" class="history-link">
      {{ followUpLabel }}
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

@media (min-width: 1024px) {
  .match-page {
    :deep(.setup-panel) {
      padding: 20px;
    }
  }
}
</style>
