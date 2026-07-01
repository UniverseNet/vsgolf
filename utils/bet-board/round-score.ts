import type {
  FundRule,
  PartialRoundPolicy,
  Participant,
  ParticipantState,
  RoundCompletionStatus,
  RoundRule,
  RoundScoreDetail,
  RoundScoreSummary,
  ScoreEntry,
} from '~/types/bet-board'
import {
  DEFAULT_PARTICIPANT_SHARE,
  FIELD_AVERAGE_MAJOR_THRESHOLD,
  FIELD_AVERAGE_MINOR_THRESHOLD,
  HANDICAP_MIN,
  MIN_PARTICIPANTS,
  PARTIAL_ROUND_POLICY_EXCLUDE,
  ROUND_COMPLETION_STATUS_COMPLETED,
  ROUND_COMPLETION_STATUS_PARTIAL,
  ROUND_RULE_FIELD_AVERAGE,
  ROUND_RULE_STROKE_EXTREMES,
  SETTLEMENT_MODE_RANK_FUND,
  TOTAL_ROUND_HOLES,
} from './constants'
import { formatWon } from './format'
import {
  clamp,
  normalizeFundRule,
  normalizeHolesPlayed,
  normalizePartialRoundPolicy,
  normalizeRoundCompletionStatus,
  normalizeSettlementMode,
  normalizeStroke,
} from './normalize-value'

export type RoundParticipantInput = Pick<Participant, 'id' | 'name' | 'initialHandicap'> &
  Partial<Pick<ParticipantState, 'handicap' | 'share'>>

export interface RoundCalculationOptions {
  holesPlayed?: number | null
  completionStatus?: RoundCompletionStatus
  partialRoundPolicy?: PartialRoundPolicy
  settlementMode?: unknown
  fundRule?: unknown
}

const getRoundHoleRatio = (holesPlayed: number | null | undefined = TOTAL_ROUND_HOLES) =>
  clamp(holesPlayed ?? TOTAL_ROUND_HOLES, 1, TOTAL_ROUND_HOLES) / TOTAL_ROUND_HOLES

/**
 * 필드 평균 대비 타수 차이를 핸디/지분 변화량으로 환산합니다.
 */
export const getFieldAverageAdjustment = (
  adjustedStrokes: number,
  averageAdjustedStrokes: number,
  holeRatio = 1,
) => {
  const differenceFromAverage = adjustedStrokes - averageAdjustedStrokes
  const minorThreshold = FIELD_AVERAGE_MINOR_THRESHOLD * holeRatio
  const majorThreshold = FIELD_AVERAGE_MAJOR_THRESHOLD * holeRatio

  if (differenceFromAverage <= -majorThreshold) {
    return -2
  }

  if (differenceFromAverage <= -minorThreshold) {
    return -1
  }

  if (differenceFromAverage >= majorThreshold) {
    return 2
  }

  if (differenceFromAverage >= minorThreshold) {
    return 1
  }

  return 0
}

const formatStrokeValue = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1)

const formatPointDelta = (value: number) => (value > 0 ? `+${value}` : String(value))

const getScoreParticipantHandicap = (participant: RoundParticipantInput) =>
  typeof participant.handicap === 'number' ? participant.handicap : participant.initialHandicap

/**
 * 라운드별 실제 타수를 필드 평균 방식의 보정 결과로 계산합니다.
 */
export const getFieldAverageRoundDetails = (
  participants: RoundParticipantInput[],
  completedScores: ScoreEntry[],
  options: RoundCalculationOptions = {},
): {
  averageAdjustedStrokes: number
  details: RoundScoreDetail[]
  isDraw: boolean
  loserId: string
  winnerId: string
} => {
  if (participants.length < MIN_PARTICIPANTS || completedScores.length < MIN_PARTICIPANTS) {
    return {
      averageAdjustedStrokes: 0,
      details: [],
      isDraw: true,
      loserId: '',
      winnerId: '',
    }
  }

  const holeRatio = getRoundHoleRatio(options.holesPlayed)
  const participantMap = new Map(participants.map((participant) => [participant.id, participant]))
  const scoreDetails = completedScores
    .map((score): RoundScoreDetail | null => {
      const participant = participantMap.get(score.participantId)

      if (!participant) {
        return null
      }

      const handicapBefore = getScoreParticipantHandicap(participant)
      const handicapApplied = handicapBefore * holeRatio
      const adjustedStrokes = score.strokes - handicapApplied

      return {
        participantId: participant.id,
        participantName: participant.name,
        strokes: score.strokes,
        handicapBefore,
        handicapApplied,
        adjustedStrokes,
      }
    })
    .filter((score): score is RoundScoreDetail => score !== null)

  const averageAdjustedStrokes =
    scoreDetails.reduce((total, score) => total + (score.adjustedStrokes ?? score.strokes), 0) /
    (scoreDetails.length || 1)
  const details = scoreDetails.map((score) => {
    const adjustedStrokes = score.adjustedStrokes ?? score.strokes
    const differenceFromAverage = adjustedStrokes - averageAdjustedStrokes
    const requestedDelta = getFieldAverageAdjustment(adjustedStrokes, averageAdjustedStrokes, holeRatio)
    const participant = participantMap.get(score.participantId)
    const shareBefore = participant?.share ?? DEFAULT_PARTICIPANT_SHARE
    const handicapBefore = score.handicapBefore ?? HANDICAP_MIN
    const shareAfter = Math.max(0, shareBefore + requestedDelta)
    const handicapAfter = Math.max(HANDICAP_MIN, handicapBefore + requestedDelta)

    return {
      ...score,
      differenceFromAverage,
      shareDelta: shareAfter - shareBefore,
      shareAfter,
      handicapDelta: handicapAfter - handicapBefore,
      handicapAfter,
    }
  })
  const lowestAdjustedStroke = Math.min(...details.map((score) => score.adjustedStrokes ?? score.strokes))
  const highestAdjustedStroke = Math.max(...details.map((score) => score.adjustedStrokes ?? score.strokes))
  const winners = details.filter((score) => (score.adjustedStrokes ?? score.strokes) === lowestAdjustedStroke)
  const losers = details.filter((score) => (score.adjustedStrokes ?? score.strokes) === highestAdjustedStroke)

  return {
    averageAdjustedStrokes,
    details,
    isDraw: details.every((score) => (score.shareDelta ?? 0) === 0),
    loserId: losers.length === 1 ? losers[0].participantId : '',
    winnerId: winners.length === 1 ? winners[0].participantId : '',
  }
}

/**
 * 저장된 라운드 규칙 값을 현재 지원하는 규칙으로 보정합니다.
 */
export const getRoundRule = (rule?: RoundRule) =>
  rule === ROUND_RULE_FIELD_AVERAGE ? ROUND_RULE_FIELD_AVERAGE : ROUND_RULE_STROKE_EXTREMES

/**
 * 적립 순위 비교에 사용할 보정 타수 값을 반환합니다.
 */
export const getScoreRankValue = (score: RoundScoreDetail) => score.adjustedStrokes ?? score.strokes

/**
 * 적립내기 순위와 동률 금액 배분을 라운드 점수 상세에 반영합니다.
 */
export const getFundRoundDetails = (details: RoundScoreDetail[], fundRule: FundRule): RoundScoreDetail[] => {
  if (details.length === 0) {
    return []
  }

  const sortedDetails = [...details].sort((leftScore, rightScore) => {
    const rankDifference = getScoreRankValue(leftScore) - getScoreRankValue(rightScore)

    if (rankDifference !== 0) {
      return rankDifference
    }

    return leftScore.participantName.localeCompare(rightScore.participantName, 'ko')
  })
  const fundDetails = new Map<string, Pick<RoundScoreDetail, 'fundRank' | 'fundAmountDelta'>>()
  let rankIndex = 0

  while (rankIndex < sortedDetails.length) {
    const rankValue = getScoreRankValue(sortedDetails[rankIndex])
    const sameRankScores = sortedDetails.slice(rankIndex).filter((score) => getScoreRankValue(score) === rankValue)
    const nextRankIndex = rankIndex + sameRankScores.length
    const rankAmountTotal = fundRule.rankAllocations
      .slice(rankIndex, nextRankIndex)
      .reduce((total, amount) => total + amount, 0)
    let allocatedAmount = 0

    sameRankScores.forEach((score, index) => {
      const isLastSameRankScore = index === sameRankScores.length - 1
      const fundAmountDelta = isLastSameRankScore
        ? Math.max(0, rankAmountTotal - allocatedAmount)
        : Math.max(0, Math.round(rankAmountTotal / sameRankScores.length))

      allocatedAmount += fundAmountDelta
      fundDetails.set(score.participantId, {
        fundRank: rankIndex + 1,
        fundAmountDelta,
      })
    })

    rankIndex = nextRankIndex
  }

  return details.map((score) => ({
    ...score,
    ...fundDetails.get(score.participantId),
  }))
}

/**
 * 라운드 종료 상태와 정산 제외 여부를 저장 가능한 형태로 보정합니다.
 */
export const getRoundCompletion = (entry: RoundCalculationOptions) => {
  const holesPlayed = normalizeHolesPlayed(entry.holesPlayed)
  const completionStatus = normalizeRoundCompletionStatus(entry.completionStatus, holesPlayed)
  const partialRoundPolicy =
    completionStatus === ROUND_COMPLETION_STATUS_PARTIAL
      ? normalizePartialRoundPolicy(entry.partialRoundPolicy)
      : undefined

  return {
    holesPlayed: completionStatus === ROUND_COMPLETION_STATUS_PARTIAL ? holesPlayed : TOTAL_ROUND_HOLES,
    completionStatus,
    partialRoundPolicy,
    isSettlementExcluded:
      completionStatus === ROUND_COMPLETION_STATUS_PARTIAL &&
      partialRoundPolicy === PARTIAL_ROUND_POLICY_EXCLUDE,
  }
}

/**
 * 입력 중인 타수 목록을 라운드 기록으로 저장 가능한 요약 상태로 변환합니다.
 */
export const getRoundScoreSummary = (
  participants: RoundParticipantInput[],
  roundScoreInputs: Map<string, string>,
  options: RoundCalculationOptions = {},
): RoundScoreSummary => {
  if (participants.length < MIN_PARTICIPANTS) {
    return {
      isComplete: false,
      message: `참가자 ${MIN_PARTICIPANTS}명 이상 필요`,
      scores: [],
    }
  }

  const isPartialRound = options.completionStatus === ROUND_COMPLETION_STATUS_PARTIAL
  const holesPlayed = isPartialRound ? Math.round(Number(options.holesPlayed)) : TOTAL_ROUND_HOLES
  const partialRoundPolicy = isPartialRound
    ? normalizePartialRoundPolicy(options.partialRoundPolicy)
    : undefined

  if (isPartialRound && (!Number.isFinite(holesPlayed) || holesPlayed < 1 || holesPlayed >= TOTAL_ROUND_HOLES)) {
    return {
      isComplete: false,
      message: `중도 종료는 1~${TOTAL_ROUND_HOLES - 1}홀만 입력할 수 있습니다`,
      scores: [],
    }
  }

  const scores = participants.map((participant) => ({
    participantId: participant.id,
    participantName: participant.name,
    strokes: normalizeStroke(roundScoreInputs.get(participant.id)),
  }))
  const missingScores = scores.filter((score) => score.strokes === null)

  if (missingScores.length > 0) {
    return {
      isComplete: false,
      message: `${missingScores[0].participantName} 타수 입력 필요`,
      scores: [],
    }
  }

  const completedScores = scores.map((score) => ({
    participantId: score.participantId,
    strokes: score.strokes as number,
  }))

  if (isPartialRound && partialRoundPolicy === PARTIAL_ROUND_POLICY_EXCLUDE) {
    return {
      isComplete: true,
      isDraw: true,
      rule: ROUND_RULE_FIELD_AVERAGE,
      settlementMode: normalizeSettlementMode(options.settlementMode),
      holesPlayed,
      completionStatus: ROUND_COMPLETION_STATUS_PARTIAL,
      partialRoundPolicy,
      isSettlementExcluded: true,
      loserId: '',
      message: `${holesPlayed}홀 중도 종료 · 정산 제외`,
      scores: completedScores,
      winnerId: '',
    }
  }

  const settlementMode = normalizeSettlementMode(options.settlementMode)
  const fundRule = normalizeFundRule(options.fundRule, participants.length)
  const averageRound = getFieldAverageRoundDetails(participants, completedScores, {
    holesPlayed,
    completionStatus: isPartialRound ? ROUND_COMPLETION_STATUS_PARTIAL : ROUND_COMPLETION_STATUS_COMPLETED,
    partialRoundPolicy,
  })
  const fundDetails =
    settlementMode === SETTLEMENT_MODE_RANK_FUND
      ? getFundRoundDetails(averageRound.details, fundRule)
      : averageRound.details
  const isFundDraw =
    settlementMode === SETTLEMENT_MODE_RANK_FUND &&
    new Set(fundDetails.map((score) => getScoreRankValue(score))).size <= 1
  const fundAdjustmentText = fundDetails
    .filter((score) => typeof score.fundRank === 'number')
    .sort((leftScore, rightScore) => (leftScore.fundRank ?? 0) - (rightScore.fundRank ?? 0))
    .map(
      (score) =>
        `${score.fundRank}등 ${score.participantName} ${formatWon(score.fundAmountDelta ?? 0)}`,
    )
    .join(' · ')
  const changedScores = averageRound.details.filter((score) => (score.shareDelta ?? 0) !== 0)
  const completionText = isPartialRound ? `${holesPlayed}홀 부분 반영 · ` : ''
  const averageText = `${completionText}평균 보정 ${formatStrokeValue(averageRound.averageAdjustedStrokes)}타`
  const adjustmentText = changedScores
    .map((score) => `${score.participantName} ${formatPointDelta(score.shareDelta ?? 0)}점`)
    .join(' · ')

  if (settlementMode === SETTLEMENT_MODE_RANK_FUND) {
    return {
      isComplete: true,
      isDraw: isFundDraw,
      rule: ROUND_RULE_FIELD_AVERAGE,
      settlementMode,
      holesPlayed,
      completionStatus: isPartialRound ? ROUND_COMPLETION_STATUS_PARTIAL : ROUND_COMPLETION_STATUS_COMPLETED,
      ...(partialRoundPolicy ? { partialRoundPolicy } : {}),
      isSettlementExcluded: false,
      adjustments: fundDetails,
      fundRoundAmount: fundRule.roundAmount,
      fundRule,
      averageAdjustedStrokes: averageRound.averageAdjustedStrokes,
      loserId: averageRound.loserId,
      message: `${averageText} · ${fundAdjustmentText || '적립 변화 없음'}`,
      scores: completedScores,
      winnerId: averageRound.winnerId,
    }
  }

  if (averageRound.isDraw) {
    return {
      isComplete: true,
      isDraw: true,
      rule: ROUND_RULE_FIELD_AVERAGE,
      settlementMode,
      holesPlayed,
      completionStatus: isPartialRound ? ROUND_COMPLETION_STATUS_PARTIAL : ROUND_COMPLETION_STATUS_COMPLETED,
      ...(partialRoundPolicy ? { partialRoundPolicy } : {}),
      isSettlementExcluded: false,
      adjustments: averageRound.details,
      averageAdjustedStrokes: averageRound.averageAdjustedStrokes,
      loserId: '',
      message: `${averageText} · 변화 없음`,
      scores: completedScores,
      winnerId: '',
    }
  }

  return {
    isComplete: true,
    isDraw: false,
    rule: ROUND_RULE_FIELD_AVERAGE,
    settlementMode,
    holesPlayed,
    completionStatus: isPartialRound ? ROUND_COMPLETION_STATUS_PARTIAL : ROUND_COMPLETION_STATUS_COMPLETED,
    ...(partialRoundPolicy ? { partialRoundPolicy } : {}),
    isSettlementExcluded: false,
    adjustments: averageRound.details,
    averageAdjustedStrokes: averageRound.averageAdjustedStrokes,
    loserId: averageRound.loserId,
    message: `${averageText} · ${adjustmentText}`,
    scores: completedScores,
    winnerId: averageRound.winnerId,
  }
}
