<script setup lang="ts">
const {
  matchState,
  isRankFundMode,
  fundProgressPercent,
  fundRemainingAmount,
  fundEstimatedRemainingRoundCount,
  lowestBurdenParticipant,
  leadingParticipant,
  leaderText,
  lowestBurdenText,
  dinnerPrice,
  formatWon,
} = useBetBoardContext()
</script>

<template>
  <section class="dashboard" aria-label="현재 내기 상태">
    <article class="metric">
      <span class="metric__label">{{ isRankFundMode ? '현재 적립' : '최소 부담' }}</span>
      <strong class="metric__value">
        <template v-if="isRankFundMode">
          {{ formatWon(matchState.totalFundAmount) }}
        </template>
        <template v-else-if="lowestBurdenParticipant">
          {{ `${lowestBurdenParticipant.share}점` }}
        </template>
        <template v-else>-</template>
      </strong>
      <span class="metric__sub-value">
        <template v-if="isRankFundMode">
          목표 {{ formatWon(dinnerPrice) }} · {{ fundProgressPercent.toFixed(1) }}%
        </template>
        <template v-else>
          {{ lowestBurdenParticipant ? `${lowestBurdenText} · ${lowestBurdenParticipant.percent.toFixed(1)}%` : '참가자 없음' }}
        </template>
      </span>
    </article>

    <article class="metric">
      <span class="metric__label">{{ isRankFundMode ? '최다 적립' : '최다 부담' }}</span>
      <strong class="metric__value">
        <template v-if="leadingParticipant">
          {{ isRankFundMode ? formatWon(leadingParticipant.cost) : `${leadingParticipant.share}점` }}
        </template>
        <template v-else>-</template>
      </strong>
      <span class="metric__sub-value">{{ leaderText }}</span>
    </article>

    <article class="metric">
      <span class="metric__label">{{ isRankFundMode ? '목표까지' : '기록 라운드' }}</span>
      <strong class="metric__value">
        {{ isRankFundMode ? formatWon(fundRemainingAmount) : `${matchState.recordedRoundCount}R` }}
      </strong>
      <span class="metric__sub-value">
        <template v-if="isRankFundMode">
          예상 {{ fundEstimatedRemainingRoundCount }}R · 제외 {{ matchState.excludedRoundCount }}R
        </template>
        <template v-else>
          정산 {{ matchState.settlementRoundCount }}R · 제외 {{ matchState.excludedRoundCount }}R
        </template>
      </span>
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

@media (min-width: 1024px) {
  .dashboard {
    gap: 14px;
  }

  .metric {
    min-height: 128px;
    padding: 20px;
  }

  .metric__value {
    font-size: 2rem;
  }
}
</style>
