import type {
  AppState,
  Match,
  Participant,
  RoundEntry,
  SavedSession,
  ScoreEntry,
  Session,
} from '~/types/bet-board'
import {
  APP_VERSION,
  DEFAULT_DINNER_PRICE,
  DEFAULT_INITIAL_HANDICAP,
  DEFAULT_MY_NAME,
  DEFAULT_OPPONENT_NAME,
  DEFAULT_SESSION_TITLE,
  HANDICAP_INPUT_MAX,
  HANDICAP_MIN,
  MAX_MATCHES,
  MAX_SAVED_SESSIONS,
  MIN_PARTICIPANTS,
} from './constants'
import { getStrokeRoundOutcome } from './match'

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

const normalizeStoredSession = (session: unknown): Session => {
  if (!session || typeof session !== 'object') {
    return createDefaultSession()
  }

  const s = session as Partial<Session>

  return {
    id: typeof s.id === 'string' && s.id ? s.id : createSessionId(),
    title: normalizeSessionTitle(s.title),
    date: typeof s.date === 'string' && s.date ? s.date : getTodayDateValue(),
    dinnerPrice: normalizeDinnerPrice(s.dinnerPrice),
  }
}

const normalizeStoredParticipants = (storedParticipants: unknown): Participant[] => {
  if (!Array.isArray(storedParticipants)) {
    return []
  }

  const usedIds = new Set<string>()

  return storedParticipants.reduce<Participant[]>((normalizedParticipants, participant, index) => {
    if (!participant || typeof participant !== 'object') {
      return normalizedParticipants
    }

    const p = participant as Partial<Participant>
    const fallbackName = `${DEFAULT_OPPONENT_NAME} ${index + 1}`
    const rawId = typeof p.id === 'string' && p.id ? p.id : createParticipantId()
    const id = usedIds.has(rawId) ? createParticipantId() : rawId

    usedIds.add(id)

    return [
      ...normalizedParticipants,
      createParticipant({
        id,
        name: normalizeParticipantName(p.name, fallbackName),
        initialHandicap: p.initialHandicap,
      }),
    ]
  }, [])
}

const normalizeStoredResultHistory = (storedHistory: unknown) => {
  if (!Array.isArray(storedHistory)) {
    return []
  }

  return storedHistory.reduce<Array<{ round: number; result: 'win' | 'lose' }>>((normalizedHistory, entry) => {
    if (!entry || typeof entry !== 'object') {
      return normalizedHistory
    }

    const e = entry as { result?: string }

    if (e.result !== 'win' && e.result !== 'lose') {
      return normalizedHistory
    }

    return [
      ...normalizedHistory,
      {
        round: normalizedHistory.length + 1,
        result: e.result,
      },
    ]
  }, [])
}

const normalizeStoredLegacyOpponents = (storedOpponents: unknown) => {
  if (!Array.isArray(storedOpponents)) {
    return []
  }

  return storedOpponents.reduce<
    Array<{
      id: string
      name: string
      initialHandicap: number
      history: Array<{ round: number; result: 'win' | 'lose' }>
    }>
  >((normalizedOpponents, opponent, index) => {
    if (!opponent || typeof opponent !== 'object') {
      return normalizedOpponents
    }

    const o = opponent as {
      id?: string
      name?: string
      initialHandicap?: unknown
      history?: unknown
    }

    return [
      ...normalizedOpponents,
      {
        id: typeof o.id === 'string' && o.id ? o.id : `opponent-${index + 1}`,
        name: normalizeParticipantName(o.name, `${DEFAULT_OPPONENT_NAME} ${index + 1}`),
        initialHandicap: normalizeHandicap(o.initialHandicap),
        history: normalizeStoredResultHistory(o.history),
      },
    ]
  }, [])
}

export const normalizeRoundHistory = (storedHistory: unknown, participants: Participant[]): RoundEntry[] => {
  if (!Array.isArray(storedHistory) || participants.length < MIN_PARTICIPANTS) {
    return []
  }

  const participantIds = new Set(participants.map((participant) => participant.id))

  return storedHistory.reduce<RoundEntry[]>((normalizedHistory, entry) => {
    if (!entry || typeof entry !== 'object') {
      return normalizedHistory
    }

    const e = entry as {
      scores?: unknown
      result?: string
      winnerId?: string
      loserId?: string
      isDraw?: boolean
      courseName?: string
    }

    const courseName = normalizeCourseName(e.courseName)
    const withCourseName = <T extends RoundEntry>(roundEntry: T) =>
      courseName ? { ...roundEntry, courseName } : roundEntry

    if (Array.isArray(e.scores)) {
      const scores = normalizeScoreEntries(e.scores, participantIds)
      const scoreParticipantIds = new Set(scores.map((score) => score.participantId))

      if (!participants.every((participant) => scoreParticipantIds.has(participant.id))) {
        return normalizedHistory
      }

      const outcome = getStrokeRoundOutcome(scores)

      return [
        ...normalizedHistory,
        withCourseName({
          round: normalizedHistory.length + 1,
          scores,
          isDraw: outcome.isDraw,
          loserId: outcome.loserId,
          winnerId: outcome.winnerId,
        }),
      ]
    }

    if (e.result === 'win' || e.result === 'lose') {
      const winnerId = e.result === 'win' ? participants[0].id : participants[1].id
      const loserId = e.result === 'win' ? participants[1].id : participants[0].id

      return [
        ...normalizedHistory,
        withCourseName({
          round: normalizedHistory.length + 1,
          winnerId,
          loserId,
        }),
      ]
    }

    if (
      typeof e.winnerId !== 'string' ||
      typeof e.loserId !== 'string' ||
      e.winnerId === e.loserId ||
      !participantIds.has(e.winnerId) ||
      !participantIds.has(e.loserId)
    ) {
      return normalizedHistory
    }

    return [
      ...normalizedHistory,
      withCourseName({
        round: normalizedHistory.length + 1,
        winnerId: e.winnerId,
        loserId: e.loserId,
      }),
    ]
  }, [])
}

const calculateLegacyParticipantCosts = (session: Record<string, unknown>) => {
  const normalizedDinnerPrice = normalizeDinnerPrice(session.dinnerPrice)
  const normalizedMyShare = normalizeShare(session.myShare)
  const normalizedOpponentShare = normalizeShare(session.opponentShare)
  const totalShare = normalizedMyShare + normalizedOpponentShare || 1
  const myCost = Math.round(normalizedDinnerPrice * (normalizedMyShare / totalShare))

  return [
    {
      name: DEFAULT_MY_NAME,
      share: normalizedMyShare,
      cost: myCost,
      handicap: Math.max(HANDICAP_MIN, Math.round(Number(session.handicap) || DEFAULT_INITIAL_HANDICAP)),
    },
    {
      name: normalizeParticipantName(session.opponentName),
      share: normalizedOpponentShare,
      cost: normalizedDinnerPrice - myCost,
      handicap: 0,
    },
  ]
}

const normalizeSavedSessionParticipants = (session: Record<string, unknown>) => {
  if (Array.isArray(session.participants) && session.participants.length > 0) {
    return (session.participants as Array<Record<string, unknown>>)
      .filter((participant) => participant && typeof participant === 'object')
      .map((participant, index) => ({
        name: normalizeParticipantName(participant.name, `${DEFAULT_OPPONENT_NAME} ${index + 1}`),
        share: normalizeShare(participant.share),
        cost: Math.max(0, Math.round(Number(participant.cost) || 0)),
        handicap: Math.max(HANDICAP_MIN, Math.round(Number(participant.handicap) || 0)),
      }))
  }

  return calculateLegacyParticipantCosts(session)
}

const normalizeSavedSessions = (savedSessions: unknown): SavedSession[] => {
  if (!Array.isArray(savedSessions)) {
    return []
  }

  return savedSessions
    .filter((session) => session && typeof session === 'object')
    .slice(0, MAX_SAVED_SESSIONS)
    .map((session) => {
      const s = session as Record<string, unknown>
      const participants = normalizeSavedSessionParticipants(s)

      return {
        id: typeof s.id === 'string' && s.id ? s.id : createSessionId(),
        title: normalizeSessionTitle(s.title),
        date: typeof s.date === 'string' && s.date ? s.date : getTodayDateValue(),
        dinnerPrice: normalizeDinnerPrice(s.dinnerPrice),
        participantCount: Math.max(
          MIN_PARTICIPANTS,
          Math.round(Number(s.participantCount) || participants.length),
        ),
        historyLength: Math.max(0, Math.round(Number(s.historyLength ?? s.rounds) || 0)),
        participants,
        savedAt: typeof s.savedAt === 'string' && s.savedAt ? s.savedAt : new Date().toISOString(),
      }
    })
}

export const createDefaultMatch = ({
  title,
  date,
  dinnerPrice,
  participants,
  history,
}: {
  title?: unknown
  date?: string
  dinnerPrice?: unknown
  participants?: Participant[]
  history?: RoundEntry[]
} = {}): Match => {
  const session = createDefaultSession()

  return {
    id: session.id,
    title: normalizeSessionTitle(title ?? session.title),
    date: date ?? session.date,
    dinnerPrice: normalizeDinnerPrice(dinnerPrice ?? session.dinnerPrice),
    participants: participants ?? [],
    history: history ?? [],
    updatedAt: new Date().toISOString(),
  }
}

const normalizeStoredMatch = (storedMatch: unknown): Match | null => {
  if (!storedMatch || typeof storedMatch !== 'object') {
    return null
  }

  const match = storedMatch as Partial<Match>
  const participants = normalizeStoredParticipants(match.participants)
  const session = normalizeStoredSession(match)

  return {
    id: session.id,
    title: session.title,
    date: session.date,
    dinnerPrice: session.dinnerPrice,
    participants,
    history: normalizeRoundHistory(match.history, participants),
    updatedAt:
      typeof match.updatedAt === 'string' && match.updatedAt ? match.updatedAt : new Date().toISOString(),
  }
}

const normalizeStoredMatches = (storedMatches: unknown): Match[] => {
  if (!Array.isArray(storedMatches)) {
    return []
  }

  return storedMatches
    .map((storedMatch) => normalizeStoredMatch(storedMatch))
    .filter((match): match is Match => match !== null)
    .slice(0, MAX_MATCHES)
}

const createDefaultAppState = (history: RoundEntry[] = []): AppState => {
  const match = createDefaultMatch({
    history: normalizeRoundHistory(history, []),
  })

  return {
    matches: [match],
    activeMatchId: match.id,
  }
}

const createMatchFromLegacyBoard = ({
  participants,
  history,
  session,
}: {
  participants: Participant[]
  history: RoundEntry[]
  session: Session
}): Match => ({
  id: session.id,
  title: session.title,
  date: session.date,
  dinnerPrice: session.dinnerPrice,
  participants,
  history: normalizeRoundHistory(history, participants),
  updatedAt: new Date().toISOString(),
})

const migrateLegacyBoardState = (parsedValue: Record<string, unknown>): AppState => {
  const legacyOpponents = normalizeStoredLegacyOpponents(parsedValue?.opponents)

  if (legacyOpponents.length === 0) {
    const legacyHistory = Array.isArray(parsedValue?.history) ? parsedValue.history : []
    return createDefaultAppState(legacyHistory as RoundEntry[])
  }

  const activeOpponent =
    legacyOpponents.find((opponent) => opponent.id === parsedValue.activeOpponentId) ?? legacyOpponents[0]
  const participants = [
    createParticipant({
      name: DEFAULT_MY_NAME,
      initialHandicap: activeOpponent.initialHandicap,
    }),
    createParticipant({
      name: activeOpponent.name,
      initialHandicap: DEFAULT_INITIAL_HANDICAP,
    }),
  ]
  const match = createMatchFromLegacyBoard({
    participants,
    history: activeOpponent.history,
    session: normalizeStoredSession(parsedValue.currentSession),
  })

  return {
    matches: [match],
    activeMatchId: match.id,
  }
}

const migrateSingleBoardState = (parsedValue: Record<string, unknown>): AppState => {
  const participants = normalizeStoredParticipants(parsedValue.participants)
  const session = normalizeStoredSession(parsedValue.currentSession)
  const match = createMatchFromLegacyBoard({
    participants,
    history: parsedValue.history as RoundEntry[],
    session,
  })

  return {
    matches: [match],
    activeMatchId: match.id,
  }
}

const normalizeStoredAppState = (storedValue: string): AppState => {
  const parsedValue = JSON.parse(storedValue) as Record<string, unknown>

  if (parsedValue?.version === APP_VERSION) {
    const matches = normalizeStoredMatches(parsedValue.matches)

    if (matches.length === 0) {
      return createDefaultAppState()
    }

    const activeMatchId =
      typeof parsedValue.activeMatchId === 'string' &&
      matches.some((match) => match.id === parsedValue.activeMatchId)
        ? parsedValue.activeMatchId
        : matches[0].id

    return {
      matches,
      activeMatchId,
    }
  }

  if (parsedValue?.version === 5 || parsedValue?.version === 4) {
    return migrateSingleBoardState(parsedValue)
  }

  if (parsedValue?.version === 2 || parsedValue?.version === 3) {
    return migrateLegacyBoardState(parsedValue)
  }

  const legacyHistory = Array.isArray(parsedValue) ? parsedValue : (parsedValue?.history as RoundEntry[])

  return createDefaultAppState(legacyHistory)
}

export const loadStoredAppState = (): AppState => {
  if (!import.meta.client) {
    return createDefaultAppState()
  }

  try {
    const savedValue = localStorage.getItem('vsgolf:dinner-bet-history')

    if (!savedValue) {
      return createDefaultAppState()
    }

    return normalizeStoredAppState(savedValue)
  } catch (error) {
    console.warn('저장된 내기 정보를 불러오지 못했습니다.', error)

    return createDefaultAppState()
  }
}

export const serializeAppState = (state: AppState) =>
  JSON.stringify({
    version: APP_VERSION,
    activeMatchId: state.activeMatchId,
    matches: state.matches.map((match) => ({
      id: match.id,
      title: match.title,
      date: match.date,
      dinnerPrice: match.dinnerPrice,
      participants: match.participants.map((participant) => ({
        id: participant.id,
        name: participant.name,
        initialHandicap: participant.initialHandicap,
      })),
      history: normalizeRoundHistory(match.history, match.participants),
      updatedAt: match.updatedAt,
    })),
  })
