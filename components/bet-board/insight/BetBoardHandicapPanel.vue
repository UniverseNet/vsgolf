<script setup lang="ts">
const { matchState, participantsWithCosts } = useBetBoardContext()
</script>

<template>
  <section class="handicap-panel" aria-label="핸디 변화">
    <BetBoardSectionHeading
      eyebrow="Handicap"
      title="참가자 핸디"
      :value="`${matchState.history.length}라운드`"
    />

    <div class="handicap-list">
      <BetBoardHandicapItem
        v-for="participant in participantsWithCosts"
        :key="participant.id"
        :participant="participant"
      />
    </div>

    <div class="rule-grid" aria-label="조정 규칙">
      <article class="rule-grid__item rule-grid__item--win">
        <span>최저타는</span>
        <strong>부담 -1점 · 핸디 -1</strong>
      </article>
      <article class="rule-grid__item rule-grid__item--lose">
        <span>최고타는</span>
        <strong>부담 +1점 · 핸디 +1</strong>
      </article>
    </div>
  </section>
</template>
