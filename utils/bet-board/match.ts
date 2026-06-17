import type {
  MatchState,
  PartialRoundPolicy,
  Participant,
  ParticipantState,
  ParticipantWithCost,
  RoundCompletionStatus,
  RoundEntry,
  RoundRule,
  RoundScoreDetail,
  RoundScoreSummary,
  ScoreEntry,
  Session,
} from '~/types/bet-board'
import {
  DEFAULT_PARTICIPANT_SHARE,
  FIELD_AVERAGE_MAJOR_THRESHOLD,
  FIELD_AVERAGE_MINOR_THRESHOLD,
  HANDICAP_BASE_MAX,
  HANDICAP_MIN,
  MIN_PARTICIPANTS,
  PARTIAL_ROUND_POLICY_EXCLUDE,
  PARTICIPANT_COLORS,
  ROUND_COMPLETION_STATUS_COMPLETED,
  ROUND_COMPLETION_STATUS_PARTIAL,
  ROUND_RULE_FIELD_AVERAGE,
  ROUND_RULE_STROKE_EXTREMES,
  TOTAL_ROUND_HOLES,
} from './constants'
import { formatWon } from './format'
import {
  clamp,
  normalizeHolesPlayed,
  normalizePartialRoundPolicy,
  normalizeRoundCompletionStatus,
  normalizeStroke,
} from './normalize'

type RoundParticipantInput = Pick<Participant, 'id' | 'name' | 'initialHandicap'> &
  Partial<Pick<ParticipantState, 'handicap' | 'share'>>

interface RoundCalculationOptions {
  holesPlayed?: number | null
  completionStatus?: RoundCompletionStatus
  partialRoundPolicy?: PartialRoundPolicy
}

export const getStrokeRoundOutcome = (scores: ScoreEntry[]) => {
  if (!Array.isArray(scores) || scores.length < MIN_PARTICIPANTS) {
    return {
      isDraw: true,
      loserId: '',
      winnerId: '',
    }
  }

  const lowestStroke = Math.min(...scores.map((score) => score.strokes))
  const highestStroke = Math.max(...scores.map((score) => score.strokes))
  const winners = scores.filter((score) => score.strokes === lowestStroke)
  const losers = scores.filter((score) => score.strokes === highestStroke)
  const isDraw = lowestStroke === highestStroke || winners.length !== 1 || losers.length !== 1

  return {
    isDraw,
    loserId: isDraw ? '' : losers[0].participantId,
    winnerId: isDraw ? '' : winners[0].participantId,
  }
}

const getRoundHoleRatio = (holesPlayed: number | null | undefined = TOTAL_ROUND_HOLES) =>
  clamp(holesPlayed ?? TOTAL_ROUND_HOLES, 1, TOTAL_ROUND_HOLES) / TOTAL_ROUND_HOLES

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

const getFieldAverageRoundDetails = (
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

const getRoundRule = (rule?: RoundRule) =>
  rule === ROUND_RULE_FIELD_AVERAGE ? ROUND_RULE_FIELD_AVERAGE : ROUND_RULE_STROKE_EXTREMES

const getRoundCompletion = (entry: RoundCalculationOptions) => {
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

const getSettlementApplied = (isSettlementExcluded: boolean) => !isSettlementExcluded

export const buildMatchState = (board: { participants: Participant[]; history: RoundEntry[] }): MatchState => {
  const participantStates = board.participants.map((participant, index) => ({
    ...participant,
    colorIndex: index,
    share: DEFAULT_PARTICIPANT_SHARE,
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
    const courseName = entry.courseName?.trim()
    const roundCompletion = getRoundCompletion(entry)

    if (isScoredRound && roundCompletion.isSettlementExcluded) {
      history.push({
        round: history.length + 1,
        isDraw: true,
        rule: roundRule,
        ...(courseName ? { courseName } : {}),
        holesPlayed: roundCompletion.holesPlayed,
        completionStatus: roundCompletion.completionStatus,
        ...(roundCompletion.partialRoundPolicy
          ? { partialRoundPolicy: roundCompletion.partialRoundPolicy }
          : {}),
        isSettlementExcluded: true,
        isSettlementApplied: false,
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
      const scoreDetails = averageRound.details.map((score) => {
        const participant = participantStateMap.get(score.participantId)

        if (!participant) {
          return score
        }

        const requestedShareDelta = score.shareDelta ?? 0
        const requestedHandicapDelta = score.handicapDelta ?? 0
        const shareAfter = Math.max(0, participant.share + requestedShareDelta)
        const handicapAfter = Math.max(HANDICAP_MIN, participant.handicap + requestedHandicapDelta)
        const shareDelta = shareAfter - participant.share
        const handicapDelta = handicapAfter - participant.handicap

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
        isDraw: scoreDetails.every((score) => (score.shareDelta ?? 0) === 0),
        rule: ROUND_RULE_FIELD_AVERAGE,
        ...(courseName ? { courseName } : {}),
        holesPlayed: roundCompletion.holesPlayed,
        completionStatus: roundCompletion.completionStatus,
        ...(roundCompletion.partialRoundPolicy
          ? { partialRoundPolicy: roundCompletion.partialRoundPolicy }
          : {}),
        isSettlementExcluded: false,
        isSettlementApplied: true,
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
      ...(courseName ? { courseName } : {}),
      holesPlayed: roundCompletion.holesPlayed,
      completionStatus: roundCompletion.completionStatus,
      ...(roundCompletion.partialRoundPolicy ? { partialRoundPolicy: roundCompletion.partialRoundPolicy } : {}),
      isSettlementExcluded: false,
      isSettlementApplied: getSettlementApplied(false),
      loserId: loser?.id ?? '',
      loserName: loser?.name ?? '',
      loserShare: loser?.share ?? 0,
      loserHandicap: loser?.handicap ?? 0,
      scores,
      winnerId: winner?.id ?? '',
      winnerName: winner?.name ?? '',
      winnerShare: winner?.share ?? 0,
      winnerHandicap: winner?.handicap ?? 0,
    })
  })

  const totalShare = participantStates.reduce((total, participant) => total + participant.share, 0)
  const settlementRoundCount = history.filter((entry) => entry.isSettlementApplied).length
  const partialRoundCount = history.filter(
    (entry) => entry.completionStatus === ROUND_COMPLETION_STATUS_PARTIAL,
  ).length
  const excludedRoundCount = history.filter((entry) => entry.isSettlementExcluded).length

  return {
    participants: participantStates,
    history,
    totalShare,
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

  const averageRound = getFieldAverageRoundDetails(participants, completedScores, {
    holesPlayed,
    completionStatus: isPartialRound ? ROUND_COMPLETION_STATUS_PARTIAL : ROUND_COMPLETION_STATUS_COMPLETED,
    partialRoundPolicy,
  })
  const changedScores = averageRound.details.filter((score) => (score.shareDelta ?? 0) !== 0)
  const completionText = isPartialRound ? `${holesPlayed}홀 부분 반영 · ` : ''
  const averageText = `${completionText}평균 보정 ${formatStrokeValue(averageRound.averageAdjustedStrokes)}타`
  const adjustmentText = changedScores
    .map((score) => `${score.participantName} ${formatPointDelta(score.shareDelta ?? 0)}점`)
    .join(' · ')

  if (averageRound.isDraw) {
    return {
      isComplete: true,
      isDraw: true,
      rule: ROUND_RULE_FIELD_AVERAGE,
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

export const buildSettlementSummary = ({
  participants,
  dinnerPrice,
  roundCount,
  settlementRoundCount,
  excludedRoundCount = 0,
  session,
}: {
  participants: ParticipantWithCost[]
  dinnerPrice: number
  roundCount: number
  settlementRoundCount?: number
  excludedRoundCount?: number
  session: Session
}) => {
  const settlementRoundText =
    typeof settlementRoundCount === 'number'
      ? `정산 반영 ${settlementRoundCount}라운드${excludedRoundCount > 0 ? `, 제외 ${excludedRoundCount}라운드` : ''}`
      : `${roundCount}라운드`

  return `저녁내기 결과: ${session.title} / 참가자 ${participants.length}명 / 기록 ${roundCount}라운드 / ${settlementRoundText} / ${formatWon(
    dinnerPrice,
  )} 기준 / ${participants.map((participant) => `${participant.name} ${participant.share}점 ${formatWon(participant.cost)}`).join(', ')}`
}
