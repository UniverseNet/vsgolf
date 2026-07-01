import type {
  FundRule,
  PartialRoundPolicy,
  Participant,
  RoundCompletionStatus,
  RoundEntry,
  ScoreEntry,
  Session,
} from '~/types/bet-board'
import {
  DEFAULT_DINNER_PRICE,
  DEFAULT_FUND_RANK_ALLOCATIONS,
  DEFAULT_FUND_ROUND_AMOUNT,
  DEFAULT_INITIAL_HANDICAP,
  DEFAULT_OPPONENT_NAME,
  DEFAULT_SESSION_TITLE,
  HANDICAP_INPUT_MAX,
  HANDICAP_MIN,
  PARTIAL_ROUND_POLICY_EXCLUDE,
  PARTIAL_ROUND_POLICY_PRORATE,
  ROUND_COMPLETION_STATUS_COMPLETED,
  ROUND_COMPLETION_STATUS_PARTIAL,
  ROUND_RULE_FIELD_AVERAGE,
  ROUND_RULE_STROKE_EXTREMES,
  SETTLEMENT_MODE_RANK_FUND,
  SETTLEMENT_MODE_SHARE_RATIO,
  TOTAL_ROUND_HOLES,
} from './constants'

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const createParticipantId = () => `participant-${Date.now()}-${Math.random().toString(16).slice(2)}`

export const createSessionId = () => `session-${Date.now()}-${Math.random().toString(16).slice(2)}`

export const getTodayDateValue = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const date = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${date}`
}

export const normalizeParticipantName = (name: unknown, fallbackName = DEFAULT_OPPONENT_NAME) => {
  if (typeof name !== 'string') {
    return fallbackName
  }

  const trimmedName = name.trim()

  return trimmedName || fallbackName
}

export const normalizeSessionTitle = (title: unknown) => normalizeParticipantName(title, DEFAULT_SESSION_TITLE)

export const normalizeCourseName = (name: unknown) => {
  if (typeof name !== 'string') {
    return ''
  }

  return name.trim().slice(0, 24)
}

export const normalizeDinnerPrice = (price: unknown) => {
  const numericPrice = Number(price)

  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    return DEFAULT_DINNER_PRICE
  }

  return Math.round(numericPrice)
}

export const normalizeHandicap = (handicap: unknown) => {
  const numericHandicap = Number(handicap)

  if (!Number.isFinite(numericHandicap)) {
    return DEFAULT_INITIAL_HANDICAP
  }

  return clamp(Math.round(numericHandicap), HANDICAP_MIN, HANDICAP_INPUT_MAX)
}

export const normalizeShare = (share: unknown) => {
  const numericShare = Number(share)

  if (!Number.isFinite(numericShare) || numericShare < 0) {
    return 5
  }

  return Math.round(numericShare)
}

export const normalizeFundAmount = (amount: unknown, fallback = DEFAULT_FUND_ROUND_AMOUNT) => {
  const numericAmount = Number(amount)

  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    return fallback
  }

  return Math.round(numericAmount)
}

export const normalizeSettlementMode = (mode: unknown) =>
  mode === SETTLEMENT_MODE_RANK_FUND ? SETTLEMENT_MODE_RANK_FUND : SETTLEMENT_MODE_SHARE_RATIO

/**
 * 참가자 수와 라운드 적립금에 맞는 기본 순위별 적립액을 생성합니다.
 */
export const createDefaultFundRankAllocations = (
  roundAmount: number = DEFAULT_FUND_ROUND_AMOUNT,
  participantCount: number = DEFAULT_FUND_RANK_ALLOCATIONS.length,
): number[] => {
  const normalizedParticipantCount = Math.max(0, Math.round(Number(participantCount) || 0))
  const normalizedRoundAmount = normalizeFundAmount(roundAmount)

  if (normalizedParticipantCount === 0) {
    return []
  }

  if (
    normalizedParticipantCount === DEFAULT_FUND_RANK_ALLOCATIONS.length &&
    normalizedRoundAmount === DEFAULT_FUND_ROUND_AMOUNT
  ) {
    return [...DEFAULT_FUND_RANK_ALLOCATIONS]
  }

  const weights =
    normalizedParticipantCount === DEFAULT_FUND_RANK_ALLOCATIONS.length
      ? [...DEFAULT_FUND_RANK_ALLOCATIONS]
      : Array.from({ length: normalizedParticipantCount }, (_, index) => index + 1)
  const totalWeight = weights.reduce((total, weight) => total + weight, 0) || 1
  let allocatedAmount = 0

  return weights.map((weight, index) => {
    if (index === weights.length - 1) {
      return Math.max(0, normalizedRoundAmount - allocatedAmount)
    }

    const amount = Math.max(0, Math.round((normalizedRoundAmount * weight) / totalWeight))
    allocatedAmount += amount

    return amount
  })
}

/**
 * 저장된 적립 룰을 현재 참가자 수 기준으로 안전하게 보정합니다.
 */
export const normalizeFundRule = (
  rule: unknown,
  participantCount: number = DEFAULT_FUND_RANK_ALLOCATIONS.length,
): FundRule => {
  const storedRule = rule && typeof rule === 'object' ? (rule as Partial<FundRule>) : {}
  const roundAmount = normalizeFundAmount(storedRule.roundAmount)
  const fallbackRankAllocations = createDefaultFundRankAllocations(roundAmount, participantCount)
  const normalizedRankAllocations = Array.isArray(storedRule.rankAllocations)
    ? fallbackRankAllocations.map((fallbackAmount, index) =>
        normalizeFundAmount(storedRule.rankAllocations?.[index], fallbackAmount),
      )
    : fallbackRankAllocations

  return {
    roundAmount,
    rankAllocations: normalizedRankAllocations,
  }
}

export const normalizeStroke = (stroke: unknown): number | null => {
  const numericStroke = Number(stroke)

  if (!Number.isFinite(numericStroke)) {
    return null
  }

  const roundedStroke = Math.round(numericStroke)

  if (roundedStroke < 1 || roundedStroke > 200) {
    return null
  }

  return roundedStroke
}

export const normalizeRoundRule = (rule: unknown) =>
  rule === ROUND_RULE_FIELD_AVERAGE ? ROUND_RULE_FIELD_AVERAGE : ROUND_RULE_STROKE_EXTREMES

export const normalizeHolesPlayed = (holesPlayed: unknown, fallback = TOTAL_ROUND_HOLES) => {
  const numericHolesPlayed = Number(holesPlayed)

  if (!Number.isFinite(numericHolesPlayed)) {
    return fallback
  }

  return clamp(Math.round(numericHolesPlayed), 1, TOTAL_ROUND_HOLES)
}

export const normalizeRoundCompletionStatus = (
  status: unknown,
  holesPlayed = TOTAL_ROUND_HOLES,
): RoundCompletionStatus =>
  status === ROUND_COMPLETION_STATUS_PARTIAL && holesPlayed < TOTAL_ROUND_HOLES
    ? ROUND_COMPLETION_STATUS_PARTIAL
    : ROUND_COMPLETION_STATUS_COMPLETED

export const normalizePartialRoundPolicy = (policy: unknown): PartialRoundPolicy =>
  policy === PARTIAL_ROUND_POLICY_EXCLUDE ? PARTIAL_ROUND_POLICY_EXCLUDE : PARTIAL_ROUND_POLICY_PRORATE

export const normalizeScoreEntries = (scores: unknown, participantIds: Set<string>): ScoreEntry[] => {
  if (!Array.isArray(scores)) {
    return []
  }

  const seenParticipantIds = new Set<string>()

  return scores.reduce<ScoreEntry[]>((normalizedScores, score) => {
    if (!score || typeof score !== 'object') {
      return normalizedScores
    }

    const entry = score as { participantId?: string; strokes?: unknown }
    const participantId = typeof entry.participantId === 'string' ? entry.participantId : ''
    const strokes = normalizeStroke(entry.strokes)

    if (!participantIds.has(participantId) || seenParticipantIds.has(participantId) || strokes === null) {
      return normalizedScores
    }

    seenParticipantIds.add(participantId)

    return [...normalizedScores, { participantId, strokes }]
  }, [])
}

export const createParticipant = ({
  id = createParticipantId(),
  name,
  initialHandicap,
}: {
  id?: string
  name?: unknown
  initialHandicap?: unknown
} = {}): Participant => ({
  id,
  name: normalizeParticipantName(name),
  initialHandicap: normalizeHandicap(initialHandicap),
})

export const createDefaultParticipants = (): Participant[] => []

export const createDefaultSession = (): Session => ({
  id: createSessionId(),
  title: DEFAULT_SESSION_TITLE,
  date: getTodayDateValue(),
  dinnerPrice: DEFAULT_DINNER_PRICE,
})

export interface CreateDefaultMatchOptions {
  title?: unknown
  date?: string
  dinnerPrice?: unknown
  settlementMode?: unknown
  fundRule?: unknown
  myParticipantId?: unknown
  participants?: Participant[]
  history?: RoundEntry[]
}
