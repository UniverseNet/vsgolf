<script setup lang="ts">
const { matchState, lowestBurdenParticipant, leadingParticipant, leaderText, lowestBurdenText } =
  useBetBoardContext()
</script>

<template>
  <section class="dashboard" aria-label="현재 내기 상태">
    <article class="metric metric--mine">
      <span class="metric__label">최소 부담</span>
      <strong class="metric__value">
        {{ lowestBurdenParticipant ? `${lowestBurdenParticipant.share}점` : '-' }}
      </strong>
      <span class="metric__sub-value">
        {{ lowestBurdenParticipant ? `${lowestBurdenText} · ${lowestBurdenParticipant.percent.toFixed(1)}%` : '참가자 없음' }}
      </span>
    </article>

    <article class="metric metric--handicap">
      <span class="metric__label">현재 최다 부담</span>
      <strong class="metric__value">
        {{ leadingParticipant ? `${leadingParticipant.share}점` : '-' }}
      </strong>
      <span class="metric__sub-value">{{ leaderText }}</span>
    </article>

    <article class="metric metric--opponent">
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
  gap: 12px;
  margin-top: 16px;
  @include panel-rise(130ms);
}

.metric {
  @include panel-surface;
  position: relative;
  display: grid;
  gap: 7px;
  min-height: 118px;
  overflow: hidden;
  padding: 17px 18px;
  box-shadow: 0 12px 28px rgba(16, 26, 23, 0.08);
  transition:
    box-shadow 220ms ease,
    transform 220ms var(--ease-out);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 34px rgba(16, 26, 23, 0.12);
  }

  &::before {
    position: absolute;
    inset: 0;
    opacity: 0.84;
    content: '';
    pointer-events: none;
  }

  &::after {
    position: absolute;
    right: 16px;
    bottom: 14px;
    width: 68px;
    height: 68px;
    border: 1px solid rgba(255, 255, 255, 0.42);
    border-radius: 50%;
    opacity: 0.42;
    content: '';
  }

  > * {
    position: relative;
    z-index: 1;
  }
}

.metric--mine {
  color: #08332f;
  background: linear-gradient(135deg, #e2f7ef, #c9eee6 54%, #f5efd7);

  &::before {
    background: linear-gradient(135deg, rgba(56, 201, 141, 0.22), transparent 62%);
  }
}

.metric--handicap {
  color: #35250c;
  background: linear-gradient(135deg, #fff2cf, #f4d9a9 54%, #edf4eb);

  &::before {
    background: linear-gradient(135deg, rgba(199, 147, 53, 0.32), transparent 60%);
  }
}

.metric--opponent {
  color: #3a1712;
  background: linear-gradient(135deg, #ffe8e2, #f1c6bc 54%, #eee3ef);

  &::before {
    background: linear-gradient(135deg, rgba(211, 95, 77, 0.26), transparent 62%);
  }
}

.metric__label,
.metric__sub-value {
  @include muted-label-text;
}

.metric__value {
  display: inline-block;
  font-size: 2.55rem;
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.46);
  transform-origin: left center;
}

.metric__sub-value {
  transform-origin: center;
}

@media (max-width: 720px) {
  .dashboard {
    grid-template-columns: 1fr;
  }

  .metric {
    min-height: 110px;
  }

  .metric__value {
    font-size: 2.08rem;
  }
}
</style>
