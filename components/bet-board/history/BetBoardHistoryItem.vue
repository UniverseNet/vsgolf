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
