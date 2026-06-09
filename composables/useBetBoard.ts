import type { AppState, ParticipantWithCost, SavedSession } from '~/types/bet-board'
import { STORAGE_KEY } from '~/utils/bet-board/constants'
import {
  DEFAULT_DINNER_PRICE,
  DEFAULT_INITIAL_HANDICAP,
  MIN_PARTICIPANTS,
  MAX_SAVED_SESSIONS,
} from '~/utils/bet-board/constants'
import {
  formatDateText,
  formatPriceInput,
  formatWon,
  getHistoryScoreText,
  getLeaderText,
  getLeadingParticipant,
  getSessionMetaText,
  getShareRatioText,
} from '~/utils/bet-board/format'
import {
  buildMatchState,
  buildSettlementSummary,
  getHandicapMax,
  getHandicapPercent,
  getParticipantColor,
  getParticipantsWithCosts,
  getRoundScoreSummary,
} from '~/utils/bet-board/match'
import {
  createDefaultSession,
  createParticipant,
  createSessionId,
  getTodayDateValue,
  loadStoredAppState,
  normalizeDinnerPrice,
  normalizeCourseName,
  normalizeParticipantName,
  normalizeRoundHistory,
  normalizeSessionTitle,
  serializeAppState,
} from '~/utils/bet-board/normalize'

export const useBetBoard = () => {
  const appState = ref<AppState>(loadStoredAppState())
  const pendingDeleteParticipantId = ref<string | null>(null)
  const pendingNewSession = ref(false)
  const roundScoreInputs = ref<Record<string, string>>({})
  const saveStatusText = ref('저장됨')
  const saveStatusAnimating = ref(false)
  const boardRoundFeedback = ref(false)
  const dinnerPriceDisplay = ref(formatPriceInput(appState.value.currentSession.dinnerPrice))

  const newParticipantName = ref('')
  const newParticipantHandicap = ref(String(DEFAULT_INITIAL_HANDICAP))
  const roundCourseName = ref('')

  const dinnerPrice = computed(() => {
    const numericText = String(dinnerPriceDisplay.value).replace(/\D/g, '')
    const inputValue = Number(numericText)

    if (!numericText || !Number.isFinite(inputValue) || inputValue < 0) {
      return 0
    }

    return inputValue
  })

  const matchState = computed(() => buildMatchState(appState.value))
  const participantsWithCosts = computed(() => getParticipantsWithCosts(matchState.value, dinnerPrice.value))
  const myParticipant = computed(() => participantsWithCosts.value[0])
  const leadingParticipant = computed(() => getLeadingParticipant(participantsWithCosts.value))
  const shareRatioText = computed(() => getShareRatioText(participantsWithCosts.value))
  const leaderText = computed(() => getLeaderText(participantsWithCosts.value))
  const handicapMax = computed(() => getHandicapMax(participantsWithCosts.value))

  const averageInitialHandicap = computed(() => {
    const total = appState.value.participants.reduce((sum, p) => sum + p.initialHandicap, 0)
    return total / appState.value.participants.length
  })

  const roundPreviewText = computed(() =>
    getRoundScoreSummary(appState.value.participants, new Map(Object.entries(roundScoreInputs.value))).message,
  )

  const settlementSummary = computed(() =>
    buildSettlementSummary({
      participants: participantsWithCosts.value,
      dinnerPrice: dinnerPrice.value,
      roundCount: matchState.value.history.length,
      session: appState.value.currentSession,
    }),
  )

  const reversedHistory = computed(() => [...matchState.value.history].reverse())

  const flashSaveStatus = (text: string) => {
    saveStatusText.value = text
    saveStatusAnimating.value = true
    window.setTimeout(() => {
      saveStatusAnimating.value = false
    }, 700)
  }

  const persistState = (statusText = '저장됨') => {
    if (!import.meta.client) {
      return
    }

    try {
      localStorage.setItem(STORAGE_KEY, serializeAppState(appState.value, dinnerPrice.value))
      flashSaveStatus(statusText)
    } catch (error) {
      console.warn('내기 정보를 저장하지 못했습니다.', error)
      flashSaveStatus('저장 실패')
    }
  }

  const playRoundFeedback = () => {
    boardRoundFeedback.value = true
    window.setTimeout(() => {
      boardRoundFeedback.value = false
    }, 560)
  }

  const getScoreInput = (participantId: string) => roundScoreInputs.value[participantId] ?? ''

  const setScoreInput = (participantId: string, value: string) => {
    roundScoreInputs.value = { ...roundScoreInputs.value, [participantId]: value }
  }

  const syncDinnerPriceFromSession = () => {
    dinnerPriceDisplay.value = formatPriceInput(appState.value.currentSession.dinnerPrice)
  }

  onMounted(() => {
    syncDinnerPriceFromSession()
    persistState()
  })

  const addParticipant = () => {
    const fallbackName = `참가자 ${appState.value.participants.length + 1}`
    const nextParticipant = createParticipant({
      name: normalizeParticipantName(newParticipantName.value, fallbackName),
      initialHandicap: newParticipantHandicap.value,
    })

    appState.value = {
      ...appState.value,
      participants: [...appState.value.participants, nextParticipant],
    }

    pendingDeleteParticipantId.value = null
    pendingNewSession.value = false
    newParticipantName.value = ''
    newParticipantHandicap.value = String(DEFAULT_INITIAL_HANDICAP)
    persistState()
  }

  const deleteParticipant = (participantId: string) => {
    const isOwnerParticipant = appState.value.participants[0]?.id === participantId

    if (appState.value.participants.length <= MIN_PARTICIPANTS || isOwnerParticipant) {
      return
    }

    if (pendingDeleteParticipantId.value !== participantId) {
      pendingDeleteParticipantId.value = participantId
      pendingNewSession.value = false
      return
    }

    const nextParticipants = appState.value.participants.filter((p) => p.id !== participantId)
    const filteredHistory = appState.value.history.filter(
      (entry) =>
        entry.winnerId !== participantId &&
        entry.loserId !== participantId &&
        !entry.scores?.some((score) => score.participantId === participantId),
    )

    appState.value = {
      ...appState.value,
      participants: nextParticipants,
      history: normalizeRoundHistory(filteredHistory, nextParticipants),
    }

    pendingDeleteParticipantId.value = null
    pendingNewSession.value = false
    persistState()
  }

  const applyRoundResult = () => {
    const summary = getRoundScoreSummary(
      appState.value.participants,
      new Map(Object.entries(roundScoreInputs.value)),
    )

    pendingDeleteParticipantId.value = null
    pendingNewSession.value = false

    if (!summary.isComplete) {
      flashSaveStatus(summary.message)
      return
    }

    const courseName = normalizeCourseName(roundCourseName.value)
    const roundEntry = {
      round: appState.value.history.length + 1,
      scores: summary.scores,
      isDraw: summary.isDraw,
      loserId: summary.loserId ?? '',
      winnerId: summary.winnerId ?? '',
      ...(courseName ? { courseName } : {}),
    }

    appState.value = {
      ...appState.value,
      history: [...appState.value.history, roundEntry],
    }

    roundScoreInputs.value = {}
    roundCourseName.value = ''
    persistState(summary.isDraw ? '동점 라운드 저장됨' : '타수 결과 저장됨')
    playRoundFeedback()
  }

  const undoLastResult = () => {
    pendingDeleteParticipantId.value = null
    pendingNewSession.value = false
    appState.value = {
      ...appState.value,
      history: appState.value.history.slice(0, -1),
    }
    persistState()
  }

  const resetBoard = () => {
    pendingDeleteParticipantId.value = null
    pendingNewSession.value = false
    appState.value = {
      ...appState.value,
      history: [],
      currentSession: {
        ...appState.value.currentSession,
        dinnerPrice: DEFAULT_DINNER_PRICE,
      },
    }
    roundScoreInputs.value = {}
    roundCourseName.value = ''
    dinnerPriceDisplay.value = formatPriceInput(DEFAULT_DINNER_PRICE)
    persistState()
  }

  const startNewSession = () => {
    if (appState.value.history.length > 0 && !pendingNewSession.value) {
      pendingDeleteParticipantId.value = null
      pendingNewSession.value = true
      return
    }

    pendingDeleteParticipantId.value = null
    pendingNewSession.value = false
    appState.value = {
      ...appState.value,
      history: [],
      currentSession: createDefaultSession(),
    }
    roundScoreInputs.value = {}
    roundCourseName.value = ''
    dinnerPriceDisplay.value = formatPriceInput(DEFAULT_DINNER_PRICE)
    persistState()
  }

  const updateSessionTitle = () => {
    pendingDeleteParticipantId.value = null
    pendingNewSession.value = false
    appState.value = {
      ...appState.value,
      currentSession: {
        ...appState.value.currentSession,
        title: normalizeSessionTitle(appState.value.currentSession.title),
      },
    }
    persistState()
  }

  const updateSessionDate = () => {
    pendingDeleteParticipantId.value = null
    pendingNewSession.value = false
    appState.value = {
      ...appState.value,
      currentSession: {
        ...appState.value.currentSession,
        date: appState.value.currentSession.date || getTodayDateValue(),
      },
    }
    persistState()
  }

  const updateDinnerPrice = () => {
    dinnerPriceDisplay.value = formatPriceInput(dinnerPriceDisplay.value)
    appState.value = {
      ...appState.value,
      currentSession: {
        ...appState.value.currentSession,
        dinnerPrice: dinnerPrice.value,
      },
    }
    persistState()
  }

  const setQuickDinnerPrice = (price: number) => {
    pendingDeleteParticipantId.value = null
    pendingNewSession.value = false
    const nextDinnerPrice = normalizeDinnerPrice(price)
    appState.value = {
      ...appState.value,
      currentSession: {
        ...appState.value.currentSession,
        dinnerPrice: nextDinnerPrice,
      },
    }
    dinnerPriceDisplay.value = formatPriceInput(nextDinnerPrice)
    persistState()
  }

  const adjustDinnerPrice = (amount: number) => {
    setQuickDinnerPrice(Math.max(0, dinnerPrice.value + amount))
  }

  const createSavedSessionSnapshot = ({
    participants,
    dinnerPrice: price,
    roundCount,
  }: {
    participants: ParticipantWithCost[]
    dinnerPrice: number
    roundCount: number
  }): SavedSession => ({
    id: createSessionId(),
    title: normalizeSessionTitle(appState.value.currentSession.title),
    date: appState.value.currentSession.date || getTodayDateValue(),
    dinnerPrice: price,
    participantCount: participants.length,
    historyLength: roundCount,
    participants: participants.map((participant) => ({
      name: participant.name,
      share: participant.share,
      cost: participant.cost,
      handicap: participant.handicap,
    })),
    savedAt: new Date().toISOString(),
  })

  const saveCurrentSession = () => {
    const snapshot = createSavedSessionSnapshot({
      participants: participantsWithCosts.value,
      dinnerPrice: dinnerPrice.value,
      roundCount: matchState.value.history.length,
    })

    pendingDeleteParticipantId.value = null
    pendingNewSession.value = false
    appState.value = {
      ...appState.value,
      savedSessions: [snapshot, ...appState.value.savedSessions].slice(0, MAX_SAVED_SESSIONS),
    }
    persistState('세션 저장됨')
  }

  const copySettlementSummary = async () => {
    pendingDeleteParticipantId.value = null
    pendingNewSession.value = false

    try {
      await navigator.clipboard.writeText(settlementSummary.value)
      flashSaveStatus('요약 복사됨')
    } catch (error) {
      console.warn('정산 요약을 복사하지 못했습니다.', error)
      flashSaveStatus('복사 실패')
    }
  }

  const swapHistoryResult = (round: number) => {
    pendingDeleteParticipantId.value = null
    pendingNewSession.value = false
    appState.value = {
      ...appState.value,
      history: normalizeRoundHistory(
        appState.value.history.map((entry, index) =>
          index + 1 === round
            ? { ...entry, winnerId: entry.loserId, loserId: entry.winnerId }
            : entry,
        ),
        appState.value.participants,
      ),
    }
    persistState()
  }

  const deleteHistoryResult = (round: number) => {
    pendingDeleteParticipantId.value = null
    pendingNewSession.value = false
    appState.value = {
      ...appState.value,
      history: normalizeRoundHistory(
        appState.value.history.filter((_, index) => index + 1 !== round),
        appState.value.participants,
      ),
    }
    persistState()
  }

  const getSavedSessionTopParticipant = (session: SavedSession) =>
    session.participants.reduce(
      (leader, participant) => (participant.share > leader.share ? participant : leader),
      session.participants[0],
    )

  const participantStyle = (index: number) => {
    const color = getParticipantColor(index)
    return {
      '--participant-color-start': color.startColor,
      '--participant-color-end': color.endColor,
    } as Record<string, string>
  }

  const handicapMarkerStyle = (participant: ParticipantWithCost) => ({
    left: `${getHandicapPercent(participant, handicapMax.value)}%`,
    background: getParticipantColor(participant.colorIndex).gradient,
  })

  const splitSegmentStyle = (participant: ParticipantWithCost, index: number) => ({
    width: `${participant.percent}%`,
    background: getParticipantColor(index).gradient,
  })

  return {
    appState,
    pendingDeleteParticipantId,
    pendingNewSession,
    saveStatusText,
    saveStatusAnimating,
    boardRoundFeedback,
    dinnerPriceDisplay,
    newParticipantName,
    newParticipantHandicap,
    roundCourseName,
    matchState,
    participantsWithCosts,
    myParticipant,
    leadingParticipant,
    shareRatioText,
    leaderText,
    handicapMax,
    averageInitialHandicap,
    roundPreviewText,
    settlementSummary,
    reversedHistory,
    dinnerPrice,
    addParticipant,
    deleteParticipant,
    applyRoundResult,
    undoLastResult,
    resetBoard,
    startNewSession,
    updateSessionTitle,
    updateSessionDate,
    updateDinnerPrice,
    setQuickDinnerPrice,
    adjustDinnerPrice,
    saveCurrentSession,
    copySettlementSummary,
    swapHistoryResult,
    deleteHistoryResult,
    getScoreInput,
    setScoreInput,
    getSavedSessionTopParticipant,
    participantStyle,
    handicapMarkerStyle,
    splitSegmentStyle,
    getParticipantColor,
    getHandicapPercent,
    formatWon,
    formatDateText,
    getSessionMetaText,
    getHistoryScoreText,
    MIN_PARTICIPANTS,
  }
}
