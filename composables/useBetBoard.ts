import type { AppState, Match, ParticipantWithCost } from '~/types/bet-board'
import {
  DEFAULT_DINNER_PRICE,
  DEFAULT_INITIAL_HANDICAP,
  MAX_MATCHES,
  MIN_PARTICIPANTS,
  ROUND_RULE_FIELD_AVERAGE,
  STORAGE_KEY,
} from '~/utils/bet-board/constants'
import {
  formatDateText,
  formatPriceInput,
  formatWon,
  getHistoryAdjustmentText,
  getHistoryScoreText,
  getLeaderText,
  getLeadingParticipant,
  getLowestBurdenParticipant,
  getLowestBurdenText,
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
  createDefaultMatch,
  createParticipant,
  getTodayDateValue,
  loadStoredAppState,
  normalizeCourseName,
  normalizeDinnerPrice,
  normalizeParticipantName,
  normalizeRoundHistory,
  normalizeSessionTitle,
  serializeAppState,
} from '~/utils/bet-board/normalize'

export const useBetBoard = () => {
  const appState = ref<AppState>(loadStoredAppState())
  const pendingDeleteParticipantId = ref<string | null>(null)
  const pendingDeleteMatchId = ref<string | null>(null)
  const roundScoreInputs = ref<Record<string, string>>({})
  const saveStatusText = ref('저장됨')
  const saveStatusAnimating = ref(false)
  const boardRoundFeedback = ref(false)

  const activeMatch = computed(
    () =>
      appState.value.matches.find((match) => match.id === appState.value.activeMatchId) ??
      appState.value.matches[0],
  )

  const matchList = computed(() =>
    [...appState.value.matches].sort(
      (leftMatch, rightMatch) =>
        new Date(rightMatch.updatedAt).getTime() - new Date(leftMatch.updatedAt).getTime(),
    ),
  )

  const dinnerPriceDisplay = ref(formatPriceInput(activeMatch.value?.dinnerPrice ?? DEFAULT_DINNER_PRICE))

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

  const matchState = computed(() =>
    buildMatchState({
      participants: activeMatch.value?.participants ?? [],
      history: activeMatch.value?.history ?? [],
    }),
  )

  const participantsWithCosts = computed(() => getParticipantsWithCosts(matchState.value, dinnerPrice.value))
  const leadingParticipant = computed(() => getLeadingParticipant(participantsWithCosts.value))
  const lowestBurdenParticipant = computed(() => getLowestBurdenParticipant(participantsWithCosts.value))
  const shareRatioText = computed(() => getShareRatioText(participantsWithCosts.value))
  const leaderText = computed(() => getLeaderText(participantsWithCosts.value))
  const lowestBurdenText = computed(() => getLowestBurdenText(participantsWithCosts.value))
  const handicapMax = computed(() => getHandicapMax(participantsWithCosts.value))

  const averageInitialHandicap = computed(() => {
    const participantCount = activeMatch.value?.participants.length ?? 0

    if (participantCount === 0) {
      return 0
    }

    const total = activeMatch.value!.participants.reduce((sum, participant) => sum + participant.initialHandicap, 0)
    return total / participantCount
  })

  const roundPreviewText = computed(() =>
    getRoundScoreSummary(
      matchState.value.participants,
      new Map(Object.entries(roundScoreInputs.value)),
    ).message,
  )

  const settlementSummary = computed(() => {
    const match = activeMatch.value

    if (!match) {
      return ''
    }

    return buildSettlementSummary({
      participants: participantsWithCosts.value,
      dinnerPrice: dinnerPrice.value,
      roundCount: matchState.value.history.length,
      session: {
        id: match.id,
        title: match.title,
        date: match.date,
        dinnerPrice: dinnerPrice.value,
      },
    })
  })

  const reversedHistory = computed(() => [...matchState.value.history].reverse())

  const clearRoundInputs = () => {
    roundScoreInputs.value = {}
    roundCourseName.value = ''
  }

  const updateActiveMatch = (updater: (match: Match) => Match) => {
    if (!activeMatch.value) {
      return
    }

    appState.value = {
      ...appState.value,
      matches: appState.value.matches.map((match) =>
        match.id === appState.value.activeMatchId
          ? { ...updater(match), updatedAt: new Date().toISOString() }
          : match,
      ),
    }
  }

  const syncDinnerPriceToActiveMatch = () => {
    updateActiveMatch((match) => ({
      ...match,
      dinnerPrice: dinnerPrice.value,
    }))
  }

  const syncDinnerPriceFromActiveMatch = () => {
    dinnerPriceDisplay.value = formatPriceInput(activeMatch.value?.dinnerPrice ?? DEFAULT_DINNER_PRICE)
  }

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

    syncDinnerPriceToActiveMatch()

    try {
      localStorage.setItem(STORAGE_KEY, serializeAppState(appState.value))
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

  onMounted(() => {
    syncDinnerPriceFromActiveMatch()
    persistState()
  })

  const addParticipant = () => {
    const fallbackName = `참가자 ${(activeMatch.value?.participants.length ?? 0) + 1}`
    const nextParticipant = createParticipant({
      name: normalizeParticipantName(newParticipantName.value, fallbackName),
      initialHandicap: newParticipantHandicap.value,
    })

    updateActiveMatch((match) => ({
      ...match,
      participants: [...match.participants, nextParticipant],
    }))

    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null
    newParticipantName.value = ''
    newParticipantHandicap.value = String(DEFAULT_INITIAL_HANDICAP)
    persistState()
  }

  const deleteParticipant = (participantId: string) => {
    if (!activeMatch.value?.participants.some((participant) => participant.id === participantId)) {
      return
    }

    if (pendingDeleteParticipantId.value !== participantId) {
      pendingDeleteParticipantId.value = participantId
      pendingDeleteMatchId.value = null
      return
    }

    updateActiveMatch((match) => {
      const nextParticipants = match.participants.filter((participant) => participant.id !== participantId)
      const filteredHistory = match.history.filter(
        (entry) =>
          entry.winnerId !== participantId &&
          entry.loserId !== participantId &&
          !entry.scores?.some((score) => score.participantId === participantId),
      )

      return {
        ...match,
        participants: nextParticipants,
        history: normalizeRoundHistory(filteredHistory, nextParticipants),
      }
    })

    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null
    persistState()
  }

  const applyRoundResult = () => {
    const summary = getRoundScoreSummary(
      matchState.value.participants,
      new Map(Object.entries(roundScoreInputs.value)),
    )

    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null

    if (!summary.isComplete) {
      flashSaveStatus(summary.message)
      return
    }

    const courseName = normalizeCourseName(roundCourseName.value)

    updateActiveMatch((match) => ({
      ...match,
      history: [
        ...match.history,
        {
          round: match.history.length + 1,
          scores: summary.scores,
          isDraw: summary.isDraw,
          loserId: summary.loserId ?? '',
          rule: summary.rule ?? ROUND_RULE_FIELD_AVERAGE,
          winnerId: summary.winnerId ?? '',
          ...(courseName ? { courseName } : {}),
        },
      ],
    }))

    clearRoundInputs()
    persistState(summary.isDraw ? '평균권 라운드 저장됨' : '평균 룰 저장됨')
    playRoundFeedback()
  }

  const undoLastResult = () => {
    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null
    updateActiveMatch((match) => ({
      ...match,
      history: match.history.slice(0, -1),
    }))
    persistState()
  }

  const resetBoard = () => {
    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null
    updateActiveMatch((match) => ({
      ...match,
      history: [],
      dinnerPrice: DEFAULT_DINNER_PRICE,
    }))
    clearRoundInputs()
    dinnerPriceDisplay.value = formatPriceInput(DEFAULT_DINNER_PRICE)
    persistState()
  }

  const createMatch = (): string | null => {
    if (appState.value.matches.length >= MAX_MATCHES) {
      flashSaveStatus(`경기는 최대 ${MAX_MATCHES}개까지`)
      return null
    }

    syncDinnerPriceToActiveMatch()
    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null

    const nextMatch = createDefaultMatch()
    appState.value = {
      matches: [nextMatch, ...appState.value.matches].slice(0, MAX_MATCHES),
      activeMatchId: nextMatch.id,
    }

    syncDinnerPriceFromActiveMatch()
    clearRoundInputs()
    newParticipantName.value = ''
    newParticipantHandicap.value = String(DEFAULT_INITIAL_HANDICAP)
    persistState('새 경기 생성됨')

    return nextMatch.id
  }

  const switchMatch = (matchId: string) => {
    if (matchId === appState.value.activeMatchId) {
      return
    }

    syncDinnerPriceToActiveMatch()
    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null
    appState.value = {
      ...appState.value,
      activeMatchId: matchId,
    }
    syncDinnerPriceFromActiveMatch()
    clearRoundInputs()
    persistState('경기 전환됨')
  }

  const deleteMatch = (matchId: string) => {
    if (!appState.value.matches.some((match) => match.id === matchId)) {
      return
    }

    if (appState.value.matches.length <= 1) {
      flashSaveStatus('마지막 경기는 삭제할 수 없습니다')
      return
    }

    if (pendingDeleteMatchId.value !== matchId) {
      pendingDeleteMatchId.value = matchId
      pendingDeleteParticipantId.value = null
      return
    }

    const nextMatches = appState.value.matches.filter((match) => match.id !== matchId)
    const nextActiveMatchId =
      appState.value.activeMatchId === matchId ? nextMatches[0].id : appState.value.activeMatchId

    pendingDeleteMatchId.value = null
    pendingDeleteParticipantId.value = null
    appState.value = {
      matches: nextMatches,
      activeMatchId: nextActiveMatchId,
    }
    syncDinnerPriceFromActiveMatch()
    clearRoundInputs()
    persistState('경기 삭제됨')
  }

  const updateSessionTitle = () => {
    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null
    updateActiveMatch((match) => ({
      ...match,
      title: normalizeSessionTitle(match.title),
    }))
    persistState()
  }

  const updateSessionDate = () => {
    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null
    updateActiveMatch((match) => ({
      ...match,
      date: match.date || getTodayDateValue(),
    }))
    persistState()
  }

  const updateDinnerPrice = () => {
    dinnerPriceDisplay.value = formatPriceInput(dinnerPriceDisplay.value)
    updateActiveMatch((match) => ({
      ...match,
      dinnerPrice: dinnerPrice.value,
    }))
    persistState()
  }

  const setQuickDinnerPrice = (price: number) => {
    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null
    const nextDinnerPrice = normalizeDinnerPrice(price)
    updateActiveMatch((match) => ({
      ...match,
      dinnerPrice: nextDinnerPrice,
    }))
    dinnerPriceDisplay.value = formatPriceInput(nextDinnerPrice)
    persistState()
  }

  const adjustDinnerPrice = (amount: number) => {
    setQuickDinnerPrice(Math.max(0, dinnerPrice.value + amount))
  }

  const copySettlementSummary = async () => {
    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null

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
    pendingDeleteMatchId.value = null
    updateActiveMatch((match) => ({
      ...match,
      history: normalizeRoundHistory(
        match.history.map((entry, index) =>
          index + 1 === round ? { ...entry, winnerId: entry.loserId, loserId: entry.winnerId } : entry,
        ),
        match.participants,
      ),
    }))
    persistState()
  }

  const deleteHistoryResult = (round: number) => {
    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null
    updateActiveMatch((match) => ({
      ...match,
      history: normalizeRoundHistory(
        match.history.filter((_, index) => index + 1 !== round),
        match.participants,
      ),
    }))
    persistState()
  }

  const getMatchSummaryText = (match: Match) => {
    const board = buildMatchState(match)
    const topParticipant = getLeadingParticipant(getParticipantsWithCosts(board, match.dinnerPrice))

    return `${match.participants.length}명 · ${board.history.length}라운드 · 최다 부담 ${topParticipant?.name ?? '-'}`
  }

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
    activeMatch,
    matchList,
    pendingDeleteParticipantId,
    pendingDeleteMatchId,
    saveStatusText,
    saveStatusAnimating,
    boardRoundFeedback,
    dinnerPriceDisplay,
    newParticipantName,
    newParticipantHandicap,
    roundCourseName,
    matchState,
    participantsWithCosts,
    leadingParticipant,
    lowestBurdenParticipant,
    shareRatioText,
    leaderText,
    lowestBurdenText,
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
    createMatch,
    switchMatch,
    deleteMatch,
    updateSessionTitle,
    updateSessionDate,
    updateDinnerPrice,
    setQuickDinnerPrice,
    adjustDinnerPrice,
    copySettlementSummary,
    swapHistoryResult,
    deleteHistoryResult,
    getScoreInput,
    setScoreInput,
    getMatchSummaryText,
    participantStyle,
    handicapMarkerStyle,
    splitSegmentStyle,
    getParticipantColor,
    getHandicapPercent,
    formatWon,
    formatDateText,
    getSessionMetaText,
    getHistoryScoreText,
    getHistoryAdjustmentText,
    MIN_PARTICIPANTS,
    MAX_MATCHES,
  }
}
