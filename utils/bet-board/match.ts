import type {
  MatchState,
  Participant,
  ParticipantWithCost,
  RoundEntry,
  RoundScoreDetail,
  Session,
} from '~/types/bet-board'
import {
  DEFAULT_PARTICIPANT_SHARE,
  HANDICAP_BASE_MAX,
  HANDICAP_MIN,
  PARTICIPANT_COLORS,
  ROUND_COMPLETION_STATUS_PARTIAL,
  ROUND_RULE_FIELD_AVERAGE,
  ROUND_RULE_STROKE_EXTREMES,
  SETTLEMENT_MODE_RANK_FUND,
  SETTLEMENT_MODE_SHARE_RATIO,
} from './constants'
import { formatWon } from './format'
import {
  getFieldAverageRoundDetails,
  getFundRoundDetails,
  getRoundCompletion,
  getRoundRule,
  getScoreRankValue,
} from './round-score'
import {
  clamp,
  normalizeFundRule,
  normalizeSettlementMode,
} from './normalize-value'

export { getFieldAverageAdjustment, getRoundScoreSummary } from './round-score'
export { getStrokeRoundOutcome } from './round-outcome'

const getSettlementApplied = (isSettlementExcluded: boolean) => !isSettlementExcluded

export const buildMatchState = (board: {
  participants: Participant[]
  history: RoundEntry[]
  settlementMode?: unknown
  fundRule?: unknown
}): MatchState => {
  const settlementMode = normalizeSettlementMode(board.settlementMode)
  const fundRule = normalizeFundRule(board.fundRule, board.participants.length)
  const participantStates = board.participants.map((participant, index) => ({
    ...participant,
    colorIndex: index,
    share: DEFAULT_PARTICIPANT_SHARE,
    fundAmount: 0,
    handicap: participant.initialHandicap,
    wins: 0,
    losses: 0,
  }))
  const participantStateMap = new Map(participantStates.map((participant) => [participant.id, participant]))
  const history: MatchState['history'] = []

  board.history.forEach((entry) => {
    const scores = Array.isArray(entry.scores)
      ? entry.scores
          .map((score) => {
            const participant = participantStateMap.get(score.participantId)

            if (!participant) {
              return null
            }

            return {
              participantId: participant.id,
              participantName: participant.name,
              strokes: score.strokes,
            }
          })
          .filter((score): score is NonNullable<typeof score> => score !== null)
      : []
    const isScoredRound = scores.length > 0
    const roundRule = getRoundRule(entry.rule)
    const roundFundRule = normalizeFundRule(entry.fundRule ?? fundRule, scores.length || board.participants.length)
    const courseName = entry.courseName?.trim()
    const roundCompletion = getRoundCompletion(entry)

    if (isScoredRound && roundCompletion.isSettlementExcluded) {
      history.push({
        round: history.length + 1,
        isDraw: true,
        rule: roundRule,
        settlementMode,
        ...(courseName ? { courseName } : {}),
        holesPlayed: roundCompletion.holesPlayed,
        completionStatus: roundCompletion.completionStatus,
        ...(roundCompletion.partialRoundPolicy
          ? { partialRoundPolicy: roundCompletion.partialRoundPolicy }
          : {}),
        isSettlementExcluded: true,
        isSettlementApplied: false,
        ...(settlementMode === SETTLEMENT_MODE_RANK_FUND ? { fundRoundAmount: roundFundRule.roundAmount } : {}),
        loserId: '',
        loserName: '',
        loserShare: 0,
        loserHandicap: 0,
        scores,
        winnerId: '',
        winnerName: '',
        winnerShare: 0,
        winnerHandicap: 0,
      })
      return
    }

    if (isScoredRound && roundRule === ROUND_RULE_FIELD_AVERAGE) {
      const averageRound = getFieldAverageRoundDetails(participantStates, scores, roundCompletion)
      const roundDetails =
        settlementMode === SETTLEMENT_MODE_RANK_FUND
          ? getFundRoundDetails(averageRound.details, roundFundRule)
          : averageRound.details
      const highestFundAmountDelta = Math.max(0, ...roundDetails.map((score) => score.fundAmountDelta ?? 0))
      const isFundDraw =
        settlementMode === SETTLEMENT_MODE_RANK_FUND &&
        new Set(roundDetails.map((score) => getScoreRankValue(score))).size <= 1
      const scoreDetails = roundDetails.map((score) => {
        const participant = participantStateMap.get(score.participantId)

        if (!participant) {
          return score
        }

        const requestedHandicapDelta = score.handicapDelta ?? 0
        const handicapAfter = Math.max(HANDICAP_MIN, participant.handicap + requestedHandicapDelta)
        const handicapDelta = handicapAfter - participant.handicap

        if (settlementMode === SETTLEMENT_MODE_RANK_FUND) {
          const fundAmountDelta = score.fundAmountDelta ?? 0

          participant.fundAmount += fundAmountDelta
          participant.handicap = handicapAfter

          if (!isFundDraw && score.fundRank === 1) {
            participant.wins += 1
          }

          if (!isFundDraw && fundAmountDelta > 0 && fundAmountDelta === highestFundAmountDelta) {
            participant.losses += 1
          }

          return {
            ...score,
            shareDelta: 0,
            shareAfter: participant.share,
            fundAmountDelta,
            fundAmountAfter: participant.fundAmount,
            handicapDelta,
            handicapAfter,
          }
        }

        const requestedShareDelta = score.shareDelta ?? 0
        const shareAfter = Math.max(0, participant.share + requestedShareDelta)
        const shareDelta = shareAfter - participant.share

        participant.share = shareAfter
        participant.handicap = handicapAfter

        if (shareDelta < 0) {
          participant.wins += 1
        }

        if (shareDelta > 0) {
          participant.losses += 1
        }

        return {
          ...score,
          shareDelta,
          shareAfter,
          handicapDelta,
          handicapAfter,
        }
      })
      const winner = averageRound.winnerId ? participantStateMap.get(averageRound.winnerId) : null
      const loser = averageRound.loserId ? participantStateMap.get(averageRound.loserId) : null

      history.push({
        round: history.length + 1,
        isDraw:
          settlementMode === SETTLEMENT_MODE_RANK_FUND
            ? isFundDraw
            : scoreDetails.every((score) => (score.shareDelta ?? 0) === 0),
        rule: ROUND_RULE_FIELD_AVERAGE,
        settlementMode,
        ...(courseName ? { courseName } : {}),
        holesPlayed: roundCompletion.holesPlayed,
        completionStatus: roundCompletion.completionStatus,
        ...(roundCompletion.partialRoundPolicy
          ? { partialRoundPolicy: roundCompletion.partialRoundPolicy }
          : {}),
        isSettlementExcluded: false,
        isSettlementApplied: true,
        ...(settlementMode === SETTLEMENT_MODE_RANK_FUND ? { fundRoundAmount: roundFundRule.roundAmount } : {}),
        averageAdjustedStrokes: averageRound.averageAdjustedStrokes,
        loserId: loser?.id ?? '',
        loserName: loser?.name ?? '',
        loserShare: loser?.share ?? 0,
        loserHandicap: loser?.handicap ?? 0,
        scores: scoreDetails,
        winnerId: winner?.id ?? '',
        winnerName: winner?.name ?? '',
        winnerShare: winner?.share ?? 0,
        winnerHandicap: winner?.handicap ?? 0,
      })
      return
    }

    const winner = entry.winnerId ? participantStateMap.get(entry.winnerId) : null
    const loser = entry.loserId ? participantStateMap.get(entry.loserId) : null
    const isDraw = isScoredRound && Boolean(entry.isDraw)

    if ((!winner || !loser || winner.id === loser.id) && !isDraw) {
      return
    }

    const scoreDetails: RoundScoreDetail[] = scores.map((score) => {
      const participant = participantStateMap.get(score.participantId)

      if (!participant || !isScoredRound) {
        return score
      }

      const shareBefore = participant.share
      const handicapBefore = participant.handicap
      const shareAfter =
        !isDraw && participant.id === winner?.id
          ? Math.max(0, shareBefore - 1)
          : !isDraw && participant.id === loser?.id
            ? shareBefore + 1
            : shareBefore
      const handicapAfter =
        !isDraw && participant.id === winner?.id
          ? Math.max(HANDICAP_MIN, handicapBefore - 1)
          : !isDraw && participant.id === loser?.id
            ? handicapBefore + 1
            : handicapBefore

      return {
        ...score,
        shareDelta: shareAfter - shareBefore,
        shareAfter,
        handicapBefore,
        handicapDelta: handicapAfter - handicapBefore,
        handicapAfter,
      }
    })

    if (winner && loser && !isDraw) {
      winner.share = Math.max(0, winner.share - 1)
      loser.share += 1
      winner.handicap = Math.max(HANDICAP_MIN, winner.handicap - 1)
      loser.handicap += 1
      winner.wins += 1
      loser.losses += 1
    }

    history.push({
      round: history.length + 1,
      isDraw,
      rule: ROUND_RULE_STROKE_EXTREMES,
      settlementMode,
      ...(courseName ? { courseName } : {}),
      holesPlayed: roundCompletion.holesPlayed,
      completionStatus: roundCompletion.completionStatus,
      ...(roundCompletion.partialRoundPolicy ? { partialRoundPolicy: roundCompletion.partialRoundPolicy } : {}),
      isSettlementExcluded: false,
      isSettlementApplied: getSettlementApplied(false),
      ...(settlementMode === SETTLEMENT_MODE_RANK_FUND ? { fundRoundAmount: roundFundRule.roundAmount } : {}),
      loserId: loser?.id ?? '',
      loserName: loser?.name ?? '',
      loserShare: loser?.share ?? 0,
      loserHandicap: loser?.handicap ?? 0,
      scores: scoreDetails,
      winnerId: winner?.id ?? '',
      winnerName: winner?.name ?? '',
      winnerShare: winner?.share ?? 0,
      winnerHandicap: winner?.handicap ?? 0,
    })
  })

  const totalShare = participantStates.reduce((total, participant) => total + participant.share, 0)
  const totalFundAmount = participantStates.reduce((total, participant) => total + participant.fundAmount, 0)
  const settlementRoundCount = history.filter((entry) => entry.isSettlementApplied).length
  const partialRoundCount = history.filter(
    (entry) => entry.completionStatus === ROUND_COMPLETION_STATUS_PARTIAL,
  ).length
  const excludedRoundCount = history.filter((entry) => entry.isSettlementExcluded).length

  return {
    participants: participantStates,
    history,
    settlementMode,
    fundRule,
    totalShare,
    totalFundAmount,
    recordedRoundCount: history.length,
    settlementRoundCount,
    partialRoundCount,
    excludedRoundCount,
  }
}

export const getParticipantsWithCosts = (
  matchState: MatchState,
  dinnerPrice: number,
): ParticipantWithCost[] => {
  if (matchState.settlementMode === SETTLEMENT_MODE_RANK_FUND) {
    const totalFundAmount = matchState.totalFundAmount || 0
    const targetAmount = Math.max(1, dinnerPrice)

    return matchState.participants.map((participant) => ({
      ...participant,
      cost: participant.fundAmount,
      percent: totalFundAmount > 0 ? (participant.fundAmount / totalFundAmount) * 100 : 0,
      targetPercent: (participant.fundAmount / targetAmount) * 100,
    }))
  }

  const totalShare = matchState.totalShare || 1
  let allocatedCost = 0

  return matchState.participants.map((participant, index) => {
    const isLastParticipant = index === matchState.participants.length - 1
    const cost = isLastParticipant
      ? Math.max(0, dinnerPrice - allocatedCost)
      : Math.round(dinnerPrice * (participant.share / totalShare))

    allocatedCost += cost

    return {
      ...participant,
      cost,
      percent: (participant.share / totalShare) * 100,
      targetPercent: dinnerPrice > 0 ? (cost / dinnerPrice) * 100 : 0,
    }
  })
}

export const getParticipantColor = (index: number) => {
  const [startColor, endColor] = PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length]

  return {
    startColor,
    endColor,
    gradient: `linear-gradient(90deg, ${startColor}, ${endColor})`,
  }
}

export const getHandicapMax = (participants: ParticipantWithCost[]) => {
  if (participants.length === 0) {
    return HANDICAP_BASE_MAX
  }

  return Math.max(
    HANDICAP_BASE_MAX,
    ...participants.map((participant) => participant.handicap + 2),
    ...participants.map((participant) => participant.initialHandicap + 2),
  )
}

export const getHandicapPercent = (participant: ParticipantWithCost, handicapMax: number) => {
  const clampedHandicap = clamp(participant.handicap, HANDICAP_MIN, handicapMax)

  return ((clampedHandicap - HANDICAP_MIN) / (handicapMax - HANDICAP_MIN)) * 100
}

export const buildSettlementSummary = ({
  participants,
  dinnerPrice,
  roundCount,
  settlementRoundCount,
  excludedRoundCount = 0,
  settlementMode = SETTLEMENT_MODE_SHARE_RATIO,
  totalFundAmount = 0,
  session,
}: {
  participants: ParticipantWithCost[]
  dinnerPrice: number
  roundCount: number
  settlementRoundCount?: number
  excludedRoundCount?: number
  settlementMode?: unknown
  totalFundAmount?: number
  session: Session
}) => {
  const settlementRoundText =
    typeof settlementRoundCount === 'number'
      ? `정산 반영 ${settlementRoundCount}라운드${excludedRoundCount > 0 ? `, 제외 ${excludedRoundCount}라운드` : ''}`
      : `${roundCount}라운드`
  const normalizedSettlementMode = normalizeSettlementMode(settlementMode)

  if (normalizedSettlementMode === SETTLEMENT_MODE_RANK_FUND) {
    return `적립내기 결과: ${session.title} / 참가자 ${participants.length}명 / 기록 ${roundCount}라운드 / ${settlementRoundText} / 목표 ${formatWon(
      dinnerPrice,
    )} / 현재 적립 ${formatWon(totalFundAmount)} / ${participants.map((participant) => `${participant.name} ${formatWon(participant.cost)}`).join(', ')}`
  }

  return `내기 결과: ${session.title} / 참가자 ${participants.length}명 / 기록 ${roundCount}라운드 / ${settlementRoundText} / ${formatWon(
    dinnerPrice,
  )} 기준 / ${participants.map((participant) => `${participant.name} ${participant.share}점 ${formatWon(participant.cost)}`).join(', ')}`
}
