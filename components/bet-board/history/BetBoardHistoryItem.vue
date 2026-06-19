<script setup lang="ts">
import type { ScoredRoundHistoryEntry } from '~/types/bet-board'
import {
  ROUND_COMPLETION_STATUS_PARTIAL,
  ROUND_RULE_FIELD_AVERAGE,
  SETTLEMENT_MODE_RANK_FUND,
  TOTAL_ROUND_HOLES,
} from '~/utils/bet-board/constants'
import { formatRoundCourseText, formatWon } from '~/utils/bet-board/format'

const props = defineProps<{
  entry: ScoredRoundHistoryEntry
  isLatest: boolean
}>()

const emit = defineEmits<{
  swap: [round: number]
  delete: [round: number]
}>()

const { dinnerPrice, getHistoryScoreText, getHistoryAdjustmentText, getHistoryFundText } = useBetBoardContext()

const hasScores = computed(() => props.entry.scores.length > 0)
const isFieldAverageRule = computed(() => props.entry.rule === ROUND_RULE_FIELD_AVERAGE)
const isRankFundEntry = computed(() => props.entry.settlementMode === SETTLEMENT_MODE_RANK_FUND)
const isPartialRound = computed(() => props.entry.completionStatus === ROUND_COMPLETION_STATUS_PARTIAL)
const isSettlementExcluded = computed(() => props.entry.isSettlementExcluded)
const holesText = computed(() => `${props.entry.holesPlayed || TOTAL_ROUND_HOLES}홀`)
const isExpanded = ref(props.isLatest)

watch(
  () => props.isLatest,
  (isLatest) => {
    if (isLatest) {
      isExpanded.value = true
    }
  },
)

const resultText = computed(() => {
  if (isSettlementExcluded.value) {
    return `${holesText.value} 중도 종료`
  }

  if (hasScores.value && isFieldAverageRule.value) {
    if (isRankFundEntry.value) {
      return props.entry.isDraw ? '공동 순위 적립' : '순위 적립'
    }

    if (isPartialRound.value) {
      return props.entry.isDraw ? `${holesText.value} 평균권` : `${holesText.value} 부분 반영`
    }

    return props.entry.isDraw ? '평균권 라운드' : '평균 기준 조정'
  }

  if (hasScores.value) {
    return props.entry.isDraw ? '동점 라운드' : `${props.entry.winnerName} 최저타`
  }

  return `${props.entry.winnerName} 승리`
})

const courseText = computed(() => formatRoundCourseText(props.entry.courseName))

const detailText = computed(() => {
  const coursePrefix = courseText.value ? `${courseText.value} · ` : ''
  const partialPrefix = isPartialRound.value ? `${holesText.value} 진행 · ` : ''

  if (isSettlementExcluded.value) {
    return `${coursePrefix}${partialPrefix}${getHistoryScoreText(props.entry.scores)}`
  }

  if (hasScores.value && isFieldAverageRule.value) {
    const averageText =
      typeof props.entry.averageAdjustedStrokes === 'number'
        ? `평균 보정 ${props.entry.averageAdjustedStrokes.toFixed(1)}타 · `
        : ''

    return `${coursePrefix}${partialPrefix}${averageText}${getHistoryScoreText(props.entry.scores)}`
  }

  if (hasScores.value) {
    return `${coursePrefix}${partialPrefix}${getHistoryScoreText(props.entry.scores)}`
  }

  return courseText.value
    ? `${courseText.value} · ${props.entry.loserName} 부담 +1점, ${props.entry.winnerName} 부담 -1점`
    : `${props.entry.loserName} 부담 +1점, ${props.entry.winnerName} 부담 -1점`
})

const stateText = computed(() => {
  if (isSettlementExcluded.value) {
    return '정산 제외 · 부담/핸디 유지'
  }

  if (hasScores.value && isFieldAverageRule.value) {
    if (isRankFundEntry.value) {
      return getHistoryFundText(props.entry.scores)
    }

    return getHistoryAdjustmentText(props.entry.scores)
  }

  if (hasScores.value) {
    return props.entry.isDraw
      ? '부담 변화 없음'
      : `${props.entry.winnerName} -1점 · ${props.entry.loserName} +1점`
  }

  return `${props.entry.winnerName} ${props.entry.winnerShare}점 · ${props.entry.loserName} ${props.entry.loserShare}점`
})

const formatDecimal = (value?: number) => {
  if (typeof value !== 'number') {
    return '-'
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

const formatSignedDecimal = (value?: number, unit = '') => {
  if (typeof value !== 'number') {
    return '-'
  }

  const formattedValue = formatDecimal(Math.abs(value))

  if (value === 0) {
    return `0${unit}`
  }

  return `${value > 0 ? '+' : '-'}${formattedValue}${unit}`
}

const formatSignedWon = (value: number | null) => {
  if (value === null) {
    return '-'
  }

  if (value === 0) {
    return '0원'
  }

  return value > 0 ? `+${formatWon(value)}` : `-${formatWon(Math.abs(value))}`
}

const getParticipantCostFromShares = (
  participantId: string,
  shares: Array<{ id: string; share: number }>,
) => {
  const totalShare = shares.reduce((sum, participant) => sum + participant.share, 0) || 1
  let allocatedCost = 0

  return shares.reduce((participantCost, participant, index) => {
    const isLastParticipant = index === shares.length - 1
    const cost = isLastParticipant
      ? Math.max(0, dinnerPrice.value - allocatedCost)
      : Math.round(dinnerPrice.value * (participant.share / totalShare))

    allocatedCost += cost

    return participant.id === participantId ? cost : participantCost
  }, 0)
}

const scoreCostDeltaMap = computed(() => {
  const canCalculateCost =
    props.entry.isSettlementApplied &&
    props.entry.scores.length > 0 &&
    props.entry.scores.every(
      (score) => typeof score.shareAfter === 'number' && typeof score.shareDelta === 'number',
    )

  if (!canCalculateCost) {
    return new Map<string, number | null>()
  }

  const beforeShares = props.entry.scores.map((score) => ({
    id: score.participantId,
    share: Math.max(0, (score.shareAfter ?? 0) - (score.shareDelta ?? 0)),
  }))
  const afterShares = props.entry.scores.map((score) => ({
    id: score.participantId,
    share: score.shareAfter ?? 0,
  }))

  return new Map(
    props.entry.scores.map((score) => [
      score.participantId,
      getParticipantCostFromShares(score.participantId, afterShares) -
        getParticipantCostFromShares(score.participantId, beforeShares),
    ]),
  )
})

const scoreRecordRows = computed(() =>
  props.entry.scores.map((score) => {
    const fundAmountDelta =
      isRankFundEntry.value && typeof score.fundAmountDelta === 'number' ? score.fundAmountDelta : null
    const costDelta = fundAmountDelta ?? (scoreCostDeltaMap.value.has(score.participantId)
      ? scoreCostDeltaMap.value.get(score.participantId) ?? null
      : null)

    return {
      id: score.participantId,
      name: score.participantName,
      strokesText: `${score.strokes}타`,
      handicapAppliedText:
        typeof score.handicapApplied === 'number' ? `+${formatDecimal(score.handicapApplied)}` : '-',
      adjustedStrokesText:
        typeof score.adjustedStrokes === 'number' ? `${formatDecimal(score.adjustedStrokes)}타` : '-',
      differenceText: formatSignedDecimal(score.differenceFromAverage, '타'),
      shareChangeText:
        isRankFundEntry.value
          ? score.fundRank
            ? `${score.fundRank}등`
            : '-'
          : typeof score.shareDelta === 'number'
          ? `${formatSignedDecimal(score.shareDelta, '점')} → ${score.shareAfter ?? '-'}점`
          : isSettlementExcluded.value
            ? '0점'
            : '-',
      handicapChangeText:
        typeof score.handicapDelta === 'number'
          ? `${formatSignedDecimal(score.handicapDelta)} → +${score.handicapAfter ?? '-'}`
          : isSettlementExcluded.value
            ? '0'
            : '-',
      costChangeText:
        isRankFundEntry.value && fundAmountDelta !== null
          ? `${formatSignedWon(fundAmountDelta)} → ${formatWon(score.fundAmountAfter ?? 0)}`
          : formatSignedWon(costDelta),
      shareDelta: score.shareDelta ?? 0,
      costDelta: costDelta ?? 0,
    }
  }),
)

const recordMetaItems = computed(() => {
  const items = [
    holesText.value,
    isRankFundEntry.value ? '순위 적립' : isFieldAverageRule.value ? '평균 기준' : '최저/최고타',
    isSettlementExcluded.value ? '정산 제외' : '정산 반영',
  ]

  if (courseText.value) {
    items.unshift(courseText.value)
  }

  if (typeof props.entry.averageAdjustedStrokes === 'number') {
    items.push(`평균 보정 ${formatDecimal(props.entry.averageAdjustedStrokes)}타`)
  }

  return items
})

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <li
    class="history-item"
    :class="{
      'history-item--latest': isLatest,
      'history-item--excluded': isSettlementExcluded,
    }"
  >
    <span class="history-item__round">{{ entry.round }}</span>
    <div class="history-item__main">
      <strong class="history-item__result">{{ resultText }}</strong>
      <span class="history-item__detail">{{ detailText }}</span>
    </div>
    <span class="history-item__state">{{ stateText }}</span>
    <div class="history-item__actions">
      <button
        v-if="hasScores"
        class="history-item__button"
        type="button"
        :aria-expanded="isExpanded"
        @click="toggleExpanded"
      >
        {{ isExpanded ? '기록 닫기' : '기록 보기' }}
      </button>
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

    <div v-if="hasScores && isExpanded" class="round-record" aria-label="라운드 상세 기록">
      <div class="round-record__meta">
        <span v-for="metaItem in recordMetaItems" :key="metaItem">{{ metaItem }}</span>
      </div>

      <div class="round-record__table-wrap">
        <table class="round-record__table">
          <thead>
            <tr>
              <th scope="col">참가자</th>
              <th scope="col">입력</th>
              <th scope="col">핸디</th>
              <th scope="col">보정</th>
              <th scope="col">평균차</th>
              <th scope="col">{{ isRankFundEntry ? '순위' : '부담' }}</th>
              <th scope="col">핸디 변화</th>
              <th scope="col">금액 변화</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in scoreRecordRows" :key="row.id">
              <th scope="row">{{ row.name }}</th>
              <td>{{ row.strokesText }}</td>
              <td>{{ row.handicapAppliedText }}</td>
              <td>{{ row.adjustedStrokesText }}</td>
              <td>{{ row.differenceText }}</td>
              <td
                class="round-record__delta"
                :class="{
                  'round-record__delta--up': row.shareDelta > 0,
                  'round-record__delta--down': row.shareDelta < 0,
                }"
              >
                {{ row.shareChangeText }}
              </td>
              <td>{{ row.handicapChangeText }}</td>
              <td
                class="round-record__delta"
                :class="{
                  'round-record__delta--up': row.costDelta > 0,
                  'round-record__delta--down': row.costDelta < 0,
                }"
              >
                {{ row.costChangeText }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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

  &--excluded {
    border-color: rgba(199, 147, 53, 0.22);
    background: linear-gradient(135deg, var(--brass-soft), rgba(255, 255, 255, 0.78));

    .history-item__round {
      background: linear-gradient(135deg, var(--brass), var(--coral));
    }
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

.round-record {
  grid-column: 1 / -1;
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(7, 137, 135, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
}

.round-record__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  span {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 9px;
    border: 1px solid rgba(34, 58, 50, 0.1);
    border-radius: var(--radius-full);
    color: var(--muted);
    font-size: 0.76rem;
    font-weight: 800;
    background: var(--surface-muted);
    white-space: nowrap;
  }
}

.round-record__table-wrap {
  overflow-x: auto;
}

.round-record__table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;

  th,
  td {
    padding: 9px 10px;
    border-bottom: 1px solid rgba(34, 58, 50, 0.08);
    font-size: 0.8rem;
    font-weight: 700;
    text-align: right;
    white-space: nowrap;
  }

  thead th {
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 800;
    background: rgba(237, 245, 241, 0.84);
  }

  th:first-child,
  td:first-child {
    text-align: left;
  }

  tbody th {
    color: var(--text);
    font-weight: 900;
  }

  tbody tr:last-child th,
  tbody tr:last-child td {
    border-bottom: 0;
  }
}

.round-record__delta {
  color: var(--muted);

  &--up {
    color: #9b3025;
  }

  &--down {
    color: #087869;
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

  .round-record {
    grid-column: 1 / -1;
    padding: 10px;
  }
}
</style>
