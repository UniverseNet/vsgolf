import type { ParticipantWithCost, RoundScoreDetail, Session } from '~/types/bet-board'

export const currencyFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 0,
})

export const getNumericInputText = (value: string | number) => String(value).replace(/\D/g, '')

export const formatPriceInput = (value: string | number) => {
  const numericText = getNumericInputText(value)

  if (!numericText) {
    return ''
  }

  return currencyFormatter.format(Number(numericText))
}

export const formatWon = (amount: number) => `${currencyFormatter.format(Math.round(amount))}원`

export const formatDateText = (dateValue: string) => {
  if (!dateValue) {
    return '날짜 미입력'
  }

  const [year, month, date] = dateValue.split('-')

  if (!year || !month || !date) {
    return dateValue
  }

  return `${year}.${month}.${date}`
}

export const getSessionMetaText = (session: Session) => formatDateText(session.date)

export const formatRoundCourseText = (courseName?: string) => courseName?.trim() || ''

export const getShareRatioText = (participants: ParticipantWithCost[]) => {
  if (participants.length === 0) {
    return '-'
  }

  return participants.map((participant) => `${participant.name} ${participant.share}`).join(' : ')
}

export const getLeaderText = (participants: ParticipantWithCost[]) => {
  if (participants.length === 0) {
    return '참가자 없음'
  }

  const highestShare = Math.max(...participants.map((participant) => participant.share))
  const leaders = participants.filter((participant) => participant.share === highestShare)

  return leaders.map((participant) => participant.name).join(', ')
}

export const getLeadingParticipant = (participants: ParticipantWithCost[]): ParticipantWithCost | null => {
  if (participants.length === 0) {
    return null
  }

  return participants.reduce(
    (leadingParticipant, participant) =>
      participant.share > leadingParticipant.share ? participant : leadingParticipant,
    participants[0],
  )
}

export const getLowestBurdenText = (participants: ParticipantWithCost[]) => {
  if (participants.length === 0) {
    return '참가자 없음'
  }

  const lowestShare = Math.min(...participants.map((participant) => participant.share))
  const lowestBurdenParticipants = participants.filter((participant) => participant.share === lowestShare)

  return lowestBurdenParticipants.map((participant) => participant.name).join(', ')
}

export const getLowestBurdenParticipant = (participants: ParticipantWithCost[]): ParticipantWithCost | null => {
  if (participants.length === 0) {
    return null
  }

  return participants.reduce(
    (lowestBurdenParticipant, participant) =>
      participant.share < lowestBurdenParticipant.share ? participant : lowestBurdenParticipant,
    participants[0],
  )
}

export const getHandicapDeltaText = (participant: ParticipantWithCost) => {
  const delta = participant.handicap - participant.initialHandicap

  if (delta === 0) {
    return '시작 기준'
  }

  return delta > 0 ? `시작보다 +${delta}` : `시작보다 ${delta}`
}

export const getHistoryScoreText = (
  scores: Array<Pick<RoundScoreDetail, 'participantName' | 'strokes' | 'adjustedStrokes'>>,
) =>
  scores
    .map((score) => {
      if (typeof score.adjustedStrokes !== 'number') {
        return `${score.participantName} ${score.strokes}타`
      }

      const adjustedText = Number.isInteger(score.adjustedStrokes)
        ? score.adjustedStrokes
        : score.adjustedStrokes.toFixed(1)

      return `${score.participantName} ${score.strokes}타(보정 ${adjustedText})`
    })
    .join(' · ')

export const getHistoryAdjustmentText = (scores: RoundScoreDetail[]) => {
  const changedScores = scores.filter((score) => typeof score.shareDelta === 'number' && score.shareDelta !== 0)

  if (changedScores.length === 0) {
    return '부담 변화 없음'
  }

  return changedScores
    .map((score) => {
      const deltaText = score.shareDelta! > 0 ? `+${score.shareDelta}` : String(score.shareDelta)
      const handicapText =
        typeof score.handicapDelta === 'number' && score.handicapDelta !== 0
          ? ` · 핸디 ${score.handicapDelta > 0 ? `+${score.handicapDelta}` : score.handicapDelta}`
          : ''

      return `${score.participantName} ${deltaText}점${handicapText}`
    })
    .join(' · ')
}

export const getFundRankAllocationText = (rankAllocations: number[]) => {
  if (rankAllocations.length === 0) {
    return '-'
  }

  return rankAllocations.map((amount, index) => `${index + 1}등 ${formatWon(amount)}`).join(' · ')
}

export const getHistoryFundText = (scores: RoundScoreDetail[]) => {
  const fundedScores = scores.filter((score) => typeof score.fundAmountDelta === 'number')

  if (fundedScores.length === 0) {
    return '적립 변화 없음'
  }

  return [...fundedScores]
    .sort((leftScore, rightScore) => (leftScore.fundRank ?? 0) - (rightScore.fundRank ?? 0))
    .map((score) => `${score.fundRank ?? '-'}등 ${score.participantName} +${formatWon(score.fundAmountDelta ?? 0)}`)
    .join(' · ')
}
