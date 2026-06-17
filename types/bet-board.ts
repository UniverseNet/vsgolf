export type RoundRule = 'stroke-extremes' | 'field-average'
export type RoundCompletionStatus = 'completed' | 'partial'
export type PartialRoundPolicy = 'exclude' | 'prorate'

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

export interface RoundScoreDetail extends ScoreEntry {
  participantName: string
  handicapBefore?: number
  handicapApplied?: number
  adjustedStrokes?: number
  differenceFromAverage?: number
  shareDelta?: number
  shareAfter?: number
  handicapDelta?: number
  handicapAfter?: number
}

export interface RoundEntry {
  round: number
  scores?: ScoreEntry[]
  isDraw?: boolean
  loserId: string
  rule?: RoundRule
  winnerId: string
  courseName?: string
  holesPlayed?: number
  completionStatus?: RoundCompletionStatus
  partialRoundPolicy?: PartialRoundPolicy
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
  rule?: RoundRule
  courseName?: string
  holesPlayed: number
  completionStatus: RoundCompletionStatus
  partialRoundPolicy?: PartialRoundPolicy
  isSettlementExcluded: boolean
  isSettlementApplied: boolean
  loserId: string
  loserName: string
  loserShare: number
  loserHandicap: number
  averageAdjustedStrokes?: number
  scores: RoundScoreDetail[]
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
  myParticipantId?: string
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
  message: string
  rule?: RoundRule
  holesPlayed?: number
  completionStatus?: RoundCompletionStatus
  partialRoundPolicy?: PartialRoundPolicy
  isSettlementExcluded?: boolean
  averageAdjustedStrokes?: number
  adjustments?: RoundScoreDetail[]
  winnerId?: string
  scores?: ScoreEntry[]
}

export interface MatchState {
  participants: ParticipantState[]
  history: ScoredRoundHistoryEntry[]
  totalShare: number
  recordedRoundCount: number
  settlementRoundCount: number
  partialRoundCount: number
  excludedRoundCount: number
}
