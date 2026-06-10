<script setup lang="ts">
const { matchState, participantsWithCosts } = useBetBoardContext()
</script>

<template>
  <section class="handicap-panel" aria-label="핸디 변화">
    <p class="handicap-panel__meta">{{ matchState.history.length }}라운드 기준</p>

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

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.handicap-panel {
  @include panel-surface;
  padding: 16px;
}

.handicap-panel__meta {
  margin: 0 0 12px;
  color: var(--muted);
  font-size: 0.84rem;
  font-weight: 600;
}

.handicap-list {
  display: grid;
  gap: 10px;
}

.rule-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.rule-grid__item {
  display: grid;
  gap: 6px;
  min-height: 82px;
  padding: 14px;
  border: 1px solid rgba(34, 58, 50, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms var(--ease-out);

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(7, 137, 135, 0.24);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.86),
      0 12px 26px rgba(16, 26, 23, 0.08);
  }

  span {
    @include muted-label-text;
  }

  strong {
    font-size: 1.22rem;
    font-weight: 800;
    line-height: 1.2;
  }

  &--win {
    border-color: rgba(7, 137, 135, 0.2);
    background: linear-gradient(135deg, var(--teal-soft), rgba(255, 255, 255, 0.7));
  }

  &--lose {
    border-color: rgba(211, 95, 77, 0.22);
    background: linear-gradient(135deg, var(--coral-soft), rgba(255, 255, 255, 0.7));
  }
}

@media (max-width: 960px) {
  .handicap-panel {
    min-width: 0;
  }
}

@media (max-width: 720px) {
  .rule-grid {
    grid-template-columns: 1fr;
  }
}
</style>
