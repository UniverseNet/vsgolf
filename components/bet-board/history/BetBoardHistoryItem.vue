<script setup lang="ts">
import type { ScoredRoundHistoryEntry } from '~/types/bet-board'
import { formatRoundCourseText } from '~/utils/bet-board/format'

const props = defineProps<{
  entry: ScoredRoundHistoryEntry
  isLatest: boolean
}>()

const emit = defineEmits<{
  swap: [round: number]
  delete: [round: number]
}>()

const { getHistoryScoreText } = useBetBoardContext()

const hasScores = computed(() => props.entry.scores.length > 0)

const resultText = computed(() => {
  if (hasScores.value) {
    return props.entry.isDraw ? '동점 라운드' : `${props.entry.winnerName} 최저타`
  }

  return `${props.entry.winnerName} 승리`
})

const courseText = computed(() => formatRoundCourseText(props.entry.courseName))

const detailText = computed(() => {
  const coursePrefix = courseText.value ? `${courseText.value} · ` : ''

  if (hasScores.value) {
    return `${coursePrefix}${getHistoryScoreText(props.entry.scores)}`
  }

  return courseText.value
    ? `${courseText.value} · ${props.entry.loserName} 부담 +1점, ${props.entry.winnerName} 부담 -1점`
    : `${props.entry.loserName} 부담 +1점, ${props.entry.winnerName} 부담 -1점`
})

const stateText = computed(() => {
  if (hasScores.value) {
    return props.entry.isDraw
      ? '부담 변화 없음'
      : `${props.entry.winnerName} -1점 · ${props.entry.loserName} +1점`
  }

  return `${props.entry.winnerName} ${props.entry.winnerShare}점 · ${props.entry.loserName} ${props.entry.loserShare}점`
})
</script>

<template>
  <li class="history-item" :class="{ 'history-item--latest': isLatest }">
    <span class="history-item__round">{{ entry.round }}</span>
    <div class="history-item__main">
      <strong class="history-item__result">{{ resultText }}</strong>
      <span class="history-item__detail">{{ detailText }}</span>
    </div>
    <span class="history-item__state">{{ stateText }}</span>
    <div class="history-item__actions">
      <button
        v-if="!hasScores"
        class="history-item__button"
        type="button"
        @click="emit('swap', entry.round)"
      >
        승패 교체
      </button>
      <button
        class="history-item__button history-item__button--danger"
        type="button"
        @click="emit('delete', entry.round)"
      >
        삭제
      </button>
    </div>
  </li>
</template>

<style lang="scss" scoped>
@use '~/assets/css/mixins' as *;

.history-item {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  min-height: 58px;
  padding: 12px;
  border: 1px solid rgba(34, 58, 50, 0.12);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(241, 247, 243, 0.76));
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms var(--ease-out);

  &:hover {
    transform: translateX(2px);
    border-color: rgba(7, 137, 135, 0.2);
    box-shadow: 0 10px 24px rgba(16, 26, 23, 0.08);
  }

  &--latest {
    animation: history-enter 340ms var(--ease-out) both;
  }
}

.history-item__round {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: #ffffff;
  font-weight: 800;
  background: linear-gradient(135deg, var(--teal), var(--brass));
}

.history-item__main {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.history-item__result {
  font-weight: 800;
}

.history-item__detail,
.history-item__state {
  color: var(--muted);
  font-size: 0.86rem;
  font-weight: 700;
}

.history-item__state {
  text-align: right;
  white-space: nowrap;
  transform-origin: center;
}

.history-item__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.history-item__button {
  min-height: 30px;
  padding: 0 9px;
  border: 1px solid rgba(34, 58, 50, 0.14);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.78rem;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.72);

  &--danger {
    color: #7a2018;
    border-color: rgba(211, 95, 77, 0.2);
    background: rgba(255, 231, 226, 0.62);
  }
}

@media (max-width: 720px) {
  .history-item {
    grid-template-columns: 36px minmax(0, 1fr);
  }

  .history-item__state {
    grid-column: 2;
    text-align: left;
    white-space: normal;
  }

  .history-item__actions {
    grid-column: 2;
    justify-content: flex-start;
  }
}
</style>
