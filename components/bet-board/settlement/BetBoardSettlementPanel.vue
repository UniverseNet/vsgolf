<script setup lang="ts">
const {
  appState,
  participantsWithCosts,
  shareRatioText,
  settlementSummary,
  lowestBurdenParticipant,
  leadingParticipant,
  dinnerPrice,
  copySettlementSummary,
  saveCurrentSession,
  getSavedSessionTopParticipant,
  formatWon,
  formatDateText,
  getSessionMetaText,
} = useBetBoardContext()
</script>

<template>
  <section class="settlement-panel" aria-label="최종 정산 요약">
    <BetBoardSectionHeading eyebrow="Settlement" title="최종 정산">
      <template #actions>
        <div class="settlement-actions">
          <button class="button button--neutral" type="button" @click="copySettlementSummary">
            요약 복사
          </button>
          <button class="button button--neutral" type="button" @click="saveCurrentSession">
            세션 저장
          </button>
        </div>
      </template>
    </BetBoardSectionHeading>

    <div class="settlement-grid">
      <article class="settlement-card settlement-card--wide">
        <span>현재 세션</span>
        <strong>{{ appState.currentSession.title }}</strong>
        <small>{{ getSessionMetaText(appState.currentSession) }}</small>
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

    <div class="saved-sessions" aria-label="저장된 세션">
      <div class="saved-sessions__header">
        <strong>최근 저장 세션</strong>
        <span>{{ appState.savedSessions.length }}개</span>
      </div>
      <ol class="saved-session-list">
        <li v-for="session in appState.savedSessions" :key="session.id" class="saved-session-item">
          <div class="saved-session-item__main">
            <strong>{{ session.title }} · {{ session.participantCount }}명</strong>
            <span>
              {{ formatDateText(session.date) }} · {{ session.historyLength }}라운드 · 최다 부담
              {{ getSavedSessionTopParticipant(session)?.name ?? '-' }}
            </span>
          </div>
          <span class="saved-session-item__amount">{{ formatWon(session.dinnerPrice) }}</span>
        </li>
      </ol>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.settlement-panel {
  @include panel-surface;
  margin-top: 16px;
  padding: 18px;
  @include panel-rise(230ms);
}

.settlement-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;

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
  grid-template-columns: minmax(220px, 1.25fr) repeat(4, minmax(120px, 1fr));
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

.saved-sessions {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(34, 58, 50, 0.1);
}

.saved-sessions__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--text);
  font-size: 0.94rem;

  span {
    color: var(--muted);
    font-weight: 700;
  }
}

.saved-session-list {
  display: grid;
  gap: 8px;
  max-height: 210px;
  margin: 10px 0 0;
  padding: 0;
  overflow: auto;
  list-style: none;

  &:empty::before {
    display: grid;
    place-items: center;
    min-height: 54px;
    border: 1px dashed var(--border);
    border-radius: 8px;
    color: var(--muted);
    font-size: 0.88rem;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.42);
    content: '저장된 세션이 없습니다';
  }
}

.saved-session-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 10px 12px;
  border: 1px solid rgba(34, 58, 50, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
}

.saved-session-item__main {
  display: grid;
  gap: 2px;
  min-width: 0;

  strong {
    overflow: hidden;
    font-size: 0.94rem;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: var(--muted);
    font-size: 0.84rem;
    font-weight: 700;
  }
}

.saved-session-item__amount {
  color: var(--text);
  font-size: 0.84rem;
  font-weight: 700;
  white-space: nowrap;
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

  .saved-session-item {
    grid-template-columns: 1fr;
  }

  .saved-session-item__amount {
    justify-self: start;
  }
}
</style>
