import type { ScoreEntry } from '~/types/bet-board'
import { MIN_PARTICIPANTS } from './constants'

/**
 * 실제 타수 기준으로 최저타 승자와 최고타 부담자를 판정합니다.
 */
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
