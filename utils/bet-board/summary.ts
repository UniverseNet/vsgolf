import type {
  Match,
  MyParticipantSummary,
  ParticipantRoundChange,
  ParticipantState,
  ParticipantWithCost,
  ScoredRoundHistoryEntry,
} from '~/types/bet-board'
import {
  DEFAULT_PARTICIPANT_SHARE,
  ROUND_COMPLETION_STATUS_PARTIAL,
  SETTLEMENT_MODE_RANK_FUND,
} from './constants'
import {
  formatWon,
  getLeaderText,
  getLeadingParticipant,
  getLowestBurdenParticipant,
  getLowestBurdenText,
} from './format'
import { buildMatchState, getParticipantsWithCosts } from './match'

interface ParticipantShareState {
  id: string
  share: number
}

/**
 * 부담 점수 배열에서 특정 참가자의 정산 금액을 계산합니다.
 */
export const calculateParticipantCostFromShares = (
  dinnerPrice: number,
  participantId: string,
  shares: ParticipantShareState[],
) => {
  const totalShare = shares.reduce((total, participant) => total + participant.share, 0) || 1
  let allocatedCost = 0

  return shares.reduce((participantCost, participant, index) => {
    const isLastParticipant = index === shares.length - 1
    const cost = isLastParticipant
      ? Math.max(0, dinnerPrice - allocatedCost)
      : Math.round(dinnerPrice * (participant.share / totalShare))

    allocatedCost += cost

    return participant.id === participantId ? cost : participantCost
  }, 0)
}

/**
 * 히스토리 항목 하나에서 특정 참가자의 점수·핸디·금액 변화를 추출합니다.
 */
export const getRoundParticipantChange = ({
  dinnerPrice,
  entry,
  participantId,
  participants,
}: {
  dinnerPrice: number
  entry: ScoredRoundHistoryEntry
  participantId: string
  participants: ParticipantWithCost[]
}): ParticipantRoundChange => {
  const score = entry.scores.find((roundScore) => roundScore.participantId === participantId)
  const hasDetailedShares = entry.scores.every(
    (roundScore) => typeof roundScore.shareAfter === 'number',
  )
  const label =
    entry.completionStatus === ROUND_COMPLETION_STATUS_PARTIAL
      ? `${entry.holesPlayed}홀 부분 반영`
      : `${entry.round}R 반영`

  if (score && entry.settlementMode === SETTLEMENT_MODE_RANK_FUND) {
    return {
      round: entry.round,
      label,
      rank: score.fundRank,
      strokes: score.strokes,
      adjustedStrokes: score.adjustedStrokes,
      shareDelta: 0,
      handicapDelta: score.handicapDelta ?? 0,
      costDelta: score.fundAmountDelta ?? 0,
    }
  }

  if (score && hasDetailedShares) {
    const beforeShares = entry.scores.map((roundScore) => ({
      id: roundScore.participantId,
      share: Math.max(
        0,
        (roundScore.shareAfter ?? DEFAULT_PARTICIPANT_SHARE) - (roundScore.shareDelta ?? 0),
      ),
    }))
    const afterShares = entry.scores.map((roundScore) => ({
      id: roundScore.participantId,
      share: roundScore.shareAfter ?? DEFAULT_PARTICIPANT_SHARE,
    }))

    return {
      round: entry.round,
      label,
      strokes: score.strokes,
      adjustedStrokes: score.adjustedStrokes,
      shareDelta: score.shareDelta ?? 0,
      handicapDelta: score.handicapDelta ?? 0,
      costDelta:
        calculateParticipantCostFromShares(dinnerPrice, participantId, afterShares) -
        calculateParticipantCostFromShares(dinnerPrice, participantId, beforeShares),
    }
  }

  const afterShares = participants.map((participant) => ({
    id: participant.id,
    share: participant.share,
  }))
  const beforeShares = afterShares.map((participant) => {
    if (participant.id === entry.winnerId) {
      return { ...participant, share: participant.share + 1 }
    }

    if (participant.id === entry.loserId) {
      return { ...participant, share: Math.max(0, participant.share - 1) }
    }

    return participant
  })
  const shareDelta = participantId === entry.winnerId ? -1 : participantId === entry.loserId ? 1 : 0

  return {
    round: entry.round,
    label,
    strokes: score?.strokes,
    adjustedStrokes: score?.adjustedStrokes,
    shareDelta,
    handicapDelta: shareDelta,
    costDelta:
      calculateParticipantCostFromShares(dinnerPrice, participantId, afterShares) -
      calculateParticipantCostFromShares(dinnerPrice, participantId, beforeShares),
  }
}

/**
 * 내 기준 참가자의 현재 부담·핸디·직전 반영 요약을 생성합니다.
 */
export const getMyParticipantSummary = ({
  dinnerPrice,
  isRankFundMode,
  matchParticipants,
  participant,
  participants,
  reversedHistory,
}: {
  dinnerPrice: number
  isRankFundMode: boolean
  matchParticipants: ParticipantState[]
  participant: ParticipantWithCost | null
  participants: ParticipantWithCost[]
  reversedHistory: ScoredRoundHistoryEntry[]
}): MyParticipantSummary | null => {
  if (!participant) {
    return null
  }

  const initialShares = matchParticipants.map((matchParticipant) => ({
    id: matchParticipant.id,
    share: DEFAULT_PARTICIPANT_SHARE,
  }))
  const latestSettlementRound = reversedHistory.find((entry) => entry.isSettlementApplied)
  const initialCost = isRankFundMode
    ? 0
    : calculateParticipantCostFromShares(dinnerPrice, participant.id, initialShares)

  return {
    participant,
    initialCost,
    costDelta: participant.cost - initialCost,
    shareDelta: participant.share - DEFAULT_PARTICIPANT_SHARE,
    handicapDelta: participant.handicap - participant.initialHandicap,
    latestChange: latestSettlementRound
      ? getRoundParticipantChange({
          dinnerPrice,
          entry: latestSettlementRound,
          participantId: participant.id,
          participants,
        })
      : null,
  }
}

/**
 * 정산 방식에 맞춰 선두 참가자를 반환합니다.
 */
export const getLeadingParticipantBySettlementMode = (
  participants: ParticipantWithCost[],
  isRankFundMode: boolean,
) => {
  if (!isRankFundMode) {
    return getLeadingParticipant(participants)
  }

  return participants.reduce<ParticipantWithCost | null>(
    (leadingParticipant, participant) =>
      !leadingParticipant || participant.cost > leadingParticipant.cost ? participant : leadingParticipant,
    null,
  )
}

/**
 * 정산 방식에 맞춰 부담이 가장 낮은 참가자를 반환합니다.
 */
export const getLowestBurdenParticipantBySettlementMode = (
  participants: ParticipantWithCost[],
  isRankFundMode: boolean,
) => {
  if (!isRankFundMode) {
    return getLowestBurdenParticipant(participants)
  }

  return participants.reduce<ParticipantWithCost | null>(
    (lowestParticipant, participant) =>
      !lowestParticipant || participant.cost < lowestParticipant.cost ? participant : lowestParticipant,
    null,
  )
}

/**
 * 정산 방식에 맞춰 선두 참가자 이름 목록을 반환합니다.
 */
export const getLeaderTextBySettlementMode = (
  participants: ParticipantWithCost[],
  isRankFundMode: boolean,
) => {
  if (!isRankFundMode) {
    return getLeaderText(participants)
  }

  if (participants.length === 0) {
    return '참가자 없음'
  }

  const highestCost = Math.max(...participants.map((participant) => participant.cost))

  return participants
    .filter((participant) => participant.cost === highestCost)
    .map((participant) => participant.name)
    .join(', ')
}

/**
 * 정산 방식에 맞춰 부담이 가장 낮은 참가자 이름 목록을 반환합니다.
 */
export const getLowestBurdenTextBySettlementMode = (
  participants: ParticipantWithCost[],
  isRankFundMode: boolean,
) => {
  if (!isRankFundMode) {
    return getLowestBurdenText(participants)
  }

  if (participants.length === 0) {
    return '참가자 없음'
  }

  const lowestCost = Math.min(...participants.map((participant) => participant.cost))

  return participants
    .filter((participant) => participant.cost === lowestCost)
    .map((participant) => participant.name)
    .join(', ')
}

/**
 * 현재 내기의 시작 핸디 평균을 계산합니다.
 */
export const getAverageInitialHandicap = (match: Match | null | undefined) => {
  const participantCount = match?.participants.length ?? 0

  if (!match || participantCount === 0) {
    return 0
  }

  const total = match.participants.reduce((sum, participant) => sum + participant.initialHandicap, 0)

  return total / participantCount
}

/**
 * 내기 목록에서 사용할 한 줄 요약 문구를 생성합니다.
 */
export const getMatchSummaryText = (match: Match) => {
  const board = buildMatchState(match)
  const participants = getParticipantsWithCosts(board, match.dinnerPrice)
  const myParticipant =
    participants.find((participant) => participant.id === match.myParticipantId) ?? participants[0]
  const myParticipantText = myParticipant
    ? `내 기준 ${myParticipant.name} ${formatWon(myParticipant.cost)}`
    : '내 기준 -'
  const settlementText =
    board.settlementMode === SETTLEMENT_MODE_RANK_FUND
      ? `적립 ${formatWon(board.totalFundAmount)}`
      : `정산 ${board.settlementRoundCount}R`

  return [
    `${match.participants.length}명`,
    `기록 ${board.recordedRoundCount}R`,
    settlementText,
    myParticipantText,
  ].join(' · ')
}
