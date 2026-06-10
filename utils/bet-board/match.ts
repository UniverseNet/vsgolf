import type {
  AppState,
  MatchState,
  Participant,
  ParticipantWithCost,
  RoundScoreSummary,
  ScoreEntry,
  Session,
} from '~/types/bet-board'
import {
  DEFAULT_PARTICIPANT_SHARE,
  HANDICAP_BASE_MAX,
  HANDICAP_MIN,
  MIN_PARTICIPANTS,
  PARTICIPANT_COLORS,
} from './constants'
import { formatWon } from './format'
import { clamp, normalizeStroke } from './normalize'

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

export const buildMatchState = (appState: AppState): MatchState => {
  const participantStates = appState.participants.map((participant, index) => ({
    ...participant,
    colorIndex: index,
    share: DEFAULT_PARTICIPANT_SHARE,
    handicap: participant.initialHandicap,
    wins: 0,
    losses: 0,
  }))
  const participantStateMap = new Map(participantStates.map((participant) => [participant.id, participant]))
  const history: MatchState['history'] = []

  appState.history.forEach((entry) => {
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
    const winner = entry.winnerId ? participantStateMap.get(entry.winnerId) : null
    const loser = entry.loserId ? participantStateMap.get(entry.loserId) : null
    const isScoredRound = scores.length > 0
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

    const courseName = entry.courseName?.trim()

    history.push({
      round: history.length + 1,
      isDraw,
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
  participants: Participant[],
  roundScoreInputs: Map<string, string>,
): RoundScoreSummary => {
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
  const outcome = getStrokeRoundOutcome(completedScores)
  const winner = scores.find((score) => score.participantId === outcome.winnerId)
  const loser = scores.find((score) => score.participantId === outcome.loserId)

  if (outcome.isDraw) {
    return {
      isComplete: true,
      isDraw: true,
      loserId: '',
      message: '동점 라운드 · 부담 변화 없음',
      scores: completedScores,
      winnerId: '',
    }
  }

  return {
    ...outcome,
    isComplete: true,
    message: `${winner!.participantName} ${winner!.strokes}타 -1 · ${loser!.participantName} ${loser!.strokes}타 +1`,
    scores: completedScores,
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
