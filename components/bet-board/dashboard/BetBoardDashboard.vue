<script setup lang="ts">
const { matchState, lowestBurdenParticipant, leadingParticipant, leaderText, lowestBurdenText } =
  useBetBoardContext()
</script>

<template>
  <section class="dashboard" aria-label="현재 내기 상태">
    <article class="metric">
      <span class="metric__label">최소 부담</span>
      <strong class="metric__value">
        {{ lowestBurdenParticipant ? `${lowestBurdenParticipant.share}점` : '-' }}
      </strong>
      <span class="metric__sub-value">
        {{ lowestBurdenParticipant ? `${lowestBurdenText} · ${lowestBurdenParticipant.percent.toFixed(1)}%` : '참가자 없음' }}
      </span>
    </article>

    <article class="metric">
      <span class="metric__label">최다 부담</span>
      <strong class="metric__value">
        {{ leadingParticipant ? `${leadingParticipant.share}점` : '-' }}
      </strong>
      <span class="metric__sub-value">{{ leaderText }}</span>
    </article>

    <article class="metric">
      <span class="metric__label">진행 라운드</span>
      <strong class="metric__value">{{ matchState.history.length }}R</strong>
      <span class="metric__sub-value">총 {{ matchState.totalShare }}점</span>
    </article>
  </section>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.dashboard {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.metric {
  @include panel-surface;
  display: grid;
  gap: 6px;
  padding: 16px;
}

.metric__label {
  @include muted-label-text;
  font-size: 0.78rem;
}

.metric__value {
  font-size: 1.65rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.metric__sub-value {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.35;
}

@media (max-width: 720px) {
  .dashboard {
    grid-template-columns: 1fr;
  }
}
</style>
