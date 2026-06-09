<script setup lang="ts">
const { matchState, myParticipant, leadingParticipant, leaderText } = useBetBoardContext()
</script>

<template>
  <section class="dashboard" aria-label="현재 내기 상태">
    <article class="metric metric--mine">
      <span class="metric__label">내 부담</span>
      <strong class="metric__value">{{ myParticipant.share }}점</strong>
      <span class="metric__sub-value">{{ myParticipant.percent.toFixed(1) }}%</span>
    </article>

    <article class="metric metric--handicap">
      <span class="metric__label">현재 최다 부담</span>
      <strong class="metric__value">{{ leadingParticipant.share }}점</strong>
      <span class="metric__sub-value">{{ leaderText }}</span>
    </article>

    <article class="metric metric--opponent">
      <span class="metric__label">진행 라운드</span>
      <strong class="metric__value">{{ matchState.history.length }}R</strong>
      <span class="metric__sub-value">총 {{ matchState.totalShare }}점</span>
    </article>
  </section>
</template>
