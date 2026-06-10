<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { appState, boardRoundFeedback } = useBetBoardContext()

onMounted(() => {
  const matchId = route.params.id as string

  if (!appState.value.matches.some((match) => match.id === matchId)) {
    router.replace('/')
  }
})
</script>

<template>
  <div class="match-page" :class="{ 'is-round-feedback': boardRoundFeedback }">
    <PageIntro
      eyebrow="Overview"
      title="경기 개요"
      description="현재 부담 비율과 진행 상황을 한눈에 확인하세요."
    />

    <BetBoardDashboard />

    <section class="quick-links">
      <NuxtLink :to="`/match/${route.params.id}/play`" class="quick-link quick-link--primary">
        라운드 입력
      </NuxtLink>
      <NuxtLink :to="`/match/${route.params.id}/history`" class="quick-link">
        기록 보기
      </NuxtLink>
    </section>
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

.quick-links {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.quick-link {
  display: grid;
  place-items: center;
  min-height: 48px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 700;
  background: var(--surface);

  &--primary {
    color: #fff;
    border-color: transparent;
    background: linear-gradient(135deg, var(--teal), var(--mint));
  }
}
</style>
