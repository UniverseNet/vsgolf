import type {
  MatchState,
  Participant,
  ParticipantState,
  ParticipantWithCost,
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
  PARTICIPANT_COLORS,
  ROUND_RULE_FIELD_AVERAGE,
  ROUND_RULE_STROKE_EXTREMES,
} from './constants'
import { formatWon } from './format'
import { clamp, normalizeStroke } from './normalize'

type RoundParticipantInput = Pick<Participant, 'id' | 'name' | 'initialHandicap'> &
  Partial<Pick<ParticipantState, 'handicap' | 'share'>>

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

export const getFieldAverageAdjustment = (adjustedStrokes: number, averageAdjustedStrokes: number) => {
  const differenceFromAverage = adjustedStrokes - averageAdjustedStrokes

  if (differenceFromAverage <= -FIELD_AVERAGE_MAJOR_THRESHOLD) {
    return -2
  }

  if (differenceFromAverage <= -FIELD_AVERAGE_MINOR_THRESHOLD) {
    return -1
  }

  if (differenceFromAverage >= FIELD_AVERAGE_MAJOR_THRESHOLD) {
    return 2
  }

  if (differenceFromAverage >= FIELD_AVERAGE_MINOR_THRESHOLD) {
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

  const participantMap = new Map(participants.map((participant) => [participant.id, participant]))
  const scoreDetails = completedScores
    .map((score) => {
      const participant = participantMap.get(score.participantId)

      if (!participant) {
        return null
      }

      const handicapBefore = getScoreParticipantHandicap(participant)
      const adjustedStrokes = score.strokes - handicapBefore

      return {
        participantId: participant.id,
        participantName: participant.name,
        strokes: score.strokes,
        handicapBefore,
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
    const requestedDelta = getFieldAverageAdjustment(adjustedStrokes, averageAdjustedStrokes)
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

    if (isScoredRound && roundRule === ROUND_RULE_FIELD_AVERAGE) {
      const averageRound = getFieldAverageRoundDetails(participantStates, scores)
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

  return {
    participants: participantStates,
    history,
    totalShare,
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
): RoundScoreSummary => {
  if (participants.length < MIN_PARTICIPANTS) {
    return {
      isComplete: false,
      message: `참가자 ${MIN_PARTICIPANTS}명 이상 필요`,
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
  const averageRound = getFieldAverageRoundDetails(participants, completedScores)
  const changedScores = averageRound.details.filter((score) => (score.shareDelta ?? 0) !== 0)
  const averageText = `평균 보정 ${formatStrokeValue(averageRound.averageAdjustedStrokes)}타`
  const adjustmentText = changedScores
    .map((score) => `${score.participantName} ${formatPointDelta(score.shareDelta ?? 0)}점`)
    .join(' · ')

  if (averageRound.isDraw) {
    return {
      isComplete: true,
      isDraw: true,
      rule: ROUND_RULE_FIELD_AVERAGE,
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
  session,
}: {
  participants: ParticipantWithCost[]
  dinnerPrice: number
  roundCount: number
  session: Session
}) =>
  `저녁내기 결과: ${session.title} / 참가자 ${participants.length}명 / ${roundCount}라운드 / ${formatWon(
    dinnerPrice,
  )} 기준 / ${participants.map((participant) => `${participant.name} ${participant.share}점 ${formatWon(participant.cost)}`).join(', ')}`
