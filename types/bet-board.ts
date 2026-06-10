export interface Participant {
  id: string
  name: string
  initialHandicap: number
}

export interface Session {
  id: string
  title: string
  date: string
  dinnerPrice: number
}

export interface ScoreEntry {
  participantId: string
  strokes: number
}

export interface RoundEntry {
  round: number
  scores?: ScoreEntry[]
  isDraw?: boolean
  loserId: string
  winnerId: string
  courseName?: string
}

export interface ParticipantState extends Participant {
  colorIndex: number
  share: number
  handicap: number
  wins: number
  losses: number
}

export interface ScoredRoundHistoryEntry {
  round: number
  isDraw: boolean
  courseName?: string
  loserId: string
  loserName: string
  loserShare: number
  loserHandicap: number
  scores: Array<{
    participantId: string
    participantName: string
    strokes: number
  }>
  winnerId: string
  winnerName: string
  winnerShare: number
  winnerHandicap: number
}

export interface ParticipantWithCost extends ParticipantState {
  cost: number
  percent: number
}

export interface SavedSessionParticipant {
  name: string
  share: number
  cost: number
  handicap: number
}

export interface SavedSession {
  id: string
  title: string
  date: string
  dinnerPrice: number
  participantCount: number
  historyLength: number
  participants: SavedSessionParticipant[]
  savedAt: string
}

export interface Match {
  id: string
  title: string
  date: string
  dinnerPrice: number
  participants: Participant[]
  history: RoundEntry[]
  updatedAt: string
}

export interface AppState {
  matches: Match[]
  activeMatchId: string
}

export interface RoundScoreSummary {
  isComplete: boolean
  isDraw?: boolean
  loserId?: string
  winnerId?: string
  message: string
  scores?: ScoreEntry[]
}

export interface MatchState {
  participants: ParticipantState[]
  history: ScoredRoundHistoryEntry[]
  totalShare: number
}
