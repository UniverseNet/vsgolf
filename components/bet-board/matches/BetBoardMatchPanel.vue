<script setup lang="ts">
import type { Match } from '~/types/bet-board'

const {
  appState,
  matchList,
  pendingDeleteMatchId,
  createMatch,
  switchMatch,
  deleteMatch,
  getMatchSummaryText,
  formatDateText,
  MAX_MATCHES,
} = useBetBoardContext()

const isActiveMatch = (match: Match) => match.id === appState.value.activeMatchId

const deleteLabel = (matchId: string) =>
  pendingDeleteMatchId.value === matchId ? '삭제 확인' : '삭제'
</script>

<template>
  <section class="match-panel" aria-label="경기 목록">
    <div class="match-panel__header">
      <div>
        <p class="match-panel__eyebrow">Matches</p>
        <h2>내 경기</h2>
      </div>
      <output class="match-panel__count">{{ appState.matches.length }} / {{ MAX_MATCHES }}</output>
    </div>

    <div class="match-list" aria-label="저장된 경기">
      <article
        v-for="match in matchList"
        :key="match.id"
        class="match-card"
        :class="{ 'match-card--active': isActiveMatch(match) }"
      >
        <button class="match-card__main" type="button" @click="switchMatch(match.id)">
          <strong>{{ match.title }}</strong>
          <span>{{ formatDateText(match.date) }} · {{ getMatchSummaryText(match) }}</span>
        </button>
        <button
          class="match-card__delete"
          type="button"
          :disabled="appState.matches.length <= 1"
          @click="deleteMatch(match.id)"
        >
          {{ deleteLabel(match.id) }}
        </button>
      </article>
    </div>

    <button class="button button--neutral match-panel__create" type="button" @click="createMatch">
      새 경기 만들기
    </button>
  </section>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.match-panel {
  @include panel-surface;
  margin-top: 16px;
  padding: 18px;
  @include panel-rise(40ms);
}

.match-panel__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    font-size: 1.06rem;
    font-weight: 800;
    line-height: 1.15;
  }
}

.match-panel__eyebrow {
  @include eyebrow-text;
  color: var(--teal);
}

.match-panel__count {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 5px 10px;
  border: 1px solid rgba(7, 137, 135, 0.18);
  border-radius: 8px;
  color: #17443d;
  font-size: 0.86rem;
  font-weight: 800;
  background: rgba(221, 246, 243, 0.72);
}

.match-list {
  display: grid;
  gap: 8px;
  max-height: 280px;
  overflow: auto;
}

.match-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 10px;
  border: 1px solid rgba(34, 58, 50, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms var(--ease-out);

  &--active {
    border-color: rgba(7, 137, 135, 0.28);
    background: linear-gradient(135deg, rgba(221, 246, 243, 0.82), rgba(255, 255, 255, 0.78));
    box-shadow: 0 10px 24px rgba(16, 26, 23, 0.08);
  }
}

.match-card__main {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 0;
  border: 0;
  color: inherit;
  text-align: left;
  background: transparent;

  strong {
    overflow: hidden;
    font-size: 0.96rem;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 700;
    line-height: 1.35;
  }
}

.match-card__delete {
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid rgba(211, 95, 77, 0.18);
  border-radius: 8px;
  color: #7a2018;
  font-size: 0.78rem;
  font-weight: 800;
  background: rgba(255, 231, 226, 0.62);
}

.button {
  @include button-base;

  &--neutral {
    color: var(--text);
    border-color: rgba(34, 58, 50, 0.16);
    background: linear-gradient(180deg, #ffffff, #eef5f1);
  }
}

.match-panel__create {
  width: 100%;
  margin-top: 12px;
}

@media (max-width: 720px) {
  .match-card {
    grid-template-columns: 1fr;
  }

  .match-card__delete {
    justify-self: start;
  }
}
</style>
