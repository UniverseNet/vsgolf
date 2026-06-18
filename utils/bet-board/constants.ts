export const APP_VERSION = 9
export const DEFAULT_INITIAL_HANDICAP = 10
export const DEFAULT_PARTICIPANT_SHARE = 5
export const DEFAULT_MY_NAME = '나'
export const DEFAULT_OPPONENT_NAME = '상대'
export const DEFAULT_SESSION_TITLE = '오늘 내기'
export const DEFAULT_DINNER_PRICE = 100000
export const HANDICAP_MIN = 0
export const HANDICAP_INPUT_MAX = 99
export const HANDICAP_BASE_MAX = 20
export const MIN_PARTICIPANTS = 2
export const MAX_SAVED_SESSIONS = 8
export const MAX_MATCHES = 12
export const STORAGE_KEY = 'vsgolf:dinner-bet-history'
export const ROUND_RULE_STROKE_EXTREMES = 'stroke-extremes'
export const ROUND_RULE_FIELD_AVERAGE = 'field-average'
export const ROUND_COMPLETION_STATUS_COMPLETED = 'completed'
export const ROUND_COMPLETION_STATUS_PARTIAL = 'partial'
export const PARTIAL_ROUND_POLICY_EXCLUDE = 'exclude'
export const PARTIAL_ROUND_POLICY_PRORATE = 'prorate'
export const TOTAL_ROUND_HOLES = 18
export const FIELD_AVERAGE_MINOR_THRESHOLD = 3
export const FIELD_AVERAGE_MAJOR_THRESHOLD = 6

export const PARTICIPANT_COLORS = [
  ['#078987', '#38c98d'],
  ['#d35f4d', '#7a4c68'],
  ['#c79335', '#f1bf65'],
  ['#3267d6', '#5fc5f2'],
  ['#7a4fc2', '#c685e6'],
  ['#29745a', '#8fd19e'],
  ['#a95530', '#e59d6c'],
  ['#59606c', '#a8b0bb'],
] as const
