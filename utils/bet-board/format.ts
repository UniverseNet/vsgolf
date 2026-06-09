import type { ParticipantWithCost, Session } from '~/types/bet-board'

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

export const getShareRatioText = (participants: ParticipantWithCost[]) =>
  participants.map((participant) => `${participant.name} ${participant.share}`).join(' : ')

export const getLeaderText = (participants: ParticipantWithCost[]) => {
  const highestShare = Math.max(...participants.map((participant) => participant.share))
  const leaders = participants.filter((participant) => participant.share === highestShare)

  return leaders.map((participant) => participant.name).join(', ')
}

export const getLeadingParticipant = (participants: ParticipantWithCost[]) =>
  participants.reduce(
    (leadingParticipant, participant) =>
      participant.share > leadingParticipant.share ? participant : leadingParticipant,
    participants[0],
  )

export const getHandicapDeltaText = (participant: ParticipantWithCost) => {
  const delta = participant.handicap - participant.initialHandicap

  if (delta === 0) {
    return '시작 기준'
  }

  return delta > 0 ? `시작보다 +${delta}` : `시작보다 ${delta}`
}

export const getHistoryScoreText = (
  scores: Array<{ participantName: string; strokes: number }>,
) => scores.map((score) => `${score.participantName} ${score.strokes}타`).join(' · ')
