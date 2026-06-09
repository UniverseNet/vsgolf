<script setup lang="ts">
const {
  appState,
  participantsWithCosts,
  shareRatioText,
  settlementSummary,
  myParticipant,
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
        <span>내 정산</span>
        <strong>{{ formatWon(myParticipant.cost) }}</strong>
      </article>
      <article class="settlement-card">
        <span>최다 부담</span>
        <strong>{{ leadingParticipant.name }}</strong>
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
