<script setup lang="ts">
const {
  activeMatch,
  matchState,
  participantsWithCosts,
  shareRatioText,
  settlementSummary,
  lowestBurdenParticipant,
  leadingParticipant,
  dinnerPrice,
  copySettlementSummary,
  getSessionMetaText,
  formatWon,
} = useBetBoardContext()
</script>

<template>
  <section class="settlement-panel" aria-label="최종 정산 요약">
    <div class="settlement-actions">
      <button class="button button--neutral" type="button" @click="copySettlementSummary">
        요약 복사
      </button>
    </div>

    <div class="settlement-grid">
      <article class="settlement-card settlement-card--wide">
        <span>현재 내기</span>
        <strong>{{ activeMatch?.title ?? '-' }}</strong>
        <small>{{ activeMatch ? getSessionMetaText(activeMatch) : '-' }}</small>
      </article>
      <article class="settlement-card">
        <span>최종 비율</span>
        <strong>{{ shareRatioText }}</strong>
      </article>
      <article class="settlement-card">
        <span>총 저녁값</span>
        <strong>{{ formatWon(dinnerPrice) }}</strong>
      </article>
      <article class="settlement-card">
        <span>정산 반영</span>
        <strong>{{ matchState.settlementRoundCount }}R</strong>
        <small>기록 {{ matchState.recordedRoundCount }}R · 제외 {{ matchState.excludedRoundCount }}R</small>
      </article>
      <article class="settlement-card">
        <span>최소 정산</span>
        <strong>{{ lowestBurdenParticipant ? formatWon(lowestBurdenParticipant.cost) : '-' }}</strong>
      </article>
      <article class="settlement-card">
        <span>최다 부담</span>
        <strong>{{ leadingParticipant?.name ?? '-' }}</strong>
      </article>
    </div>

    <div class="settlement-participants" aria-label="참가자별 최종 정산">
      <article v-for="participant in participantsWithCosts" :key="participant.id" class="settlement-participant">
        <span>{{ participant.name }}</span>
        <strong>{{ formatWon(participant.cost) }}</strong>
        <small>
          {{ participant.share }}점 · {{ participant.percent.toFixed(1) }}% · 핸디 +{{ participant.handicap }}
        </small>
      </article>
    </div>

    <p class="settlement-summary">{{ settlementSummary }}</p>
  </section>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.settlement-panel {
  @include panel-surface;
  padding: 16px;
}

.settlement-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;

  .button {
    min-height: 38px;
    padding: 0 12px;
  }
}

.button {
  @include button-base;

  &--neutral {
    color: var(--text);
    border-color: rgba(34, 58, 50, 0.16);
    background: linear-gradient(180deg, #ffffff, #eef5f1);
  }
}

.settlement-grid {
  display: grid;
  grid-template-columns: minmax(220px, 1.25fr) repeat(5, minmax(110px, 1fr));
  gap: 10px;
}

.settlement-card {
  display: grid;
  gap: 5px;
  min-height: 88px;
  padding: 14px;
  border: 1px solid rgba(34, 58, 50, 0.11);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);

  span,
  small {
    color: var(--muted);
    font-size: 0.84rem;
    font-weight: 700;
  }

  strong {
    color: var(--text);
    font-size: 1.18rem;
    font-weight: 800;
    line-height: 1.18;
  }

  &--wide strong {
    word-break: keep-all;
  }
}

.settlement-participants {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.settlement-participant {
  display: grid;
  gap: 5px;
  min-height: 84px;
  padding: 13px;
  border: 1px solid rgba(34, 58, 50, 0.11);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);

  span,
  small {
    color: var(--muted);
    font-size: 0.84rem;
    font-weight: 700;
  }

  strong {
    color: var(--text);
    font-size: 1.16rem;
    font-weight: 800;
  }
}

.settlement-summary {
  margin: 12px 0 0;
  padding: 12px;
  border: 1px solid rgba(7, 137, 135, 0.14);
  border-radius: 8px;
  color: #1d4841;
  font-size: 0.9rem;
  font-weight: 700;
  background: rgba(221, 246, 243, 0.52);
}

@media (max-width: 960px) {
  .settlement-grid {
    grid-template-columns: 1fr 1fr;
  }

  .settlement-card--wide {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .settlement-grid {
    grid-template-columns: 1fr;
  }

  .settlement-actions {
    justify-content: stretch;
    width: 100%;

    .button {
      flex: 1 1 0;
    }
  }

  .settlement-summary {
    font-size: 0.84rem;
  }
}

@media (min-width: 1024px) {
  .settlement-grid {
    gap: 12px;
  }

  .settlement-card {
    min-height: 104px;
    padding: 16px;
  }

  .settlement-participants {
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 12px;
  }
}
</style>
