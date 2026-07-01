import type {
  AppState,
  FundRule,
  Match,
  MyParticipantSummary,
  PartialRoundPolicy,
  ParticipantWithCost,
  RoundCompletionStatus,
  SettlementMode,
} from '~/types/bet-board'
import {
  DEFAULT_FUND_ROUND_AMOUNT,
  DEFAULT_DINNER_PRICE,
  DEFAULT_INITIAL_HANDICAP,
  MAX_MATCHES,
  MIN_PARTICIPANTS,
  PARTIAL_ROUND_POLICY_PRORATE,
  ROUND_COMPLETION_STATUS_COMPLETED,
  ROUND_COMPLETION_STATUS_PARTIAL,
  ROUND_RULE_FIELD_AVERAGE,
  SETTLEMENT_MODE_RANK_FUND,
  SETTLEMENT_MODE_SHARE_RATIO,
  TOTAL_ROUND_HOLES,
} from '~/utils/bet-board/constants'
import {
  formatDateText,
  formatHandicap,
  formatPriceInput,
  formatWon,
  getFundRankAllocationText,
  getHistoryAdjustmentText,
  getHistoryFundText,
  getHistoryScoreText,
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
  createDefaultFundRankAllocations,
  createParticipant,
  getTodayDateValue,
  loadStoredAppState,
  normalizeCourseName,
  normalizeDinnerPrice,
  normalizeFundAmount,
  normalizeFundRule,
  normalizeParticipantName,
  normalizeRoundHistory,
  normalizeSettlementMode,
  normalizeSessionTitle,
} from '~/utils/bet-board/normalize'
import {
  getAverageInitialHandicap,
  getLeaderTextBySettlementMode,
  getLeadingParticipantBySettlementMode,
  getLowestBurdenParticipantBySettlementMode,
  getLowestBurdenTextBySettlementMode,
  getMatchSummaryText,
  getMyParticipantSummary,
} from '~/utils/bet-board/summary'
import { useBetBoardPersistence } from '~/composables/bet-board/use.bet-board-persistence'

export const useBetBoard = () => {
  const appState = ref<AppState>(loadStoredAppState())
  const pendingDeleteParticipantId = ref<string | null>(null)
  const pendingDeleteMatchId = ref<string | null>(null)
  const roundScoreInputs = ref<Record<string, string>>({})
  const boardRoundFeedback = ref(false)
  const isPartialRound = ref(false)
  const holesPlayedInput = ref('9')
  const partialRoundPolicy = ref<PartialRoundPolicy>(PARTIAL_ROUND_POLICY_PRORATE)

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
  const roundHolesPlayed = computed(() => {
    if (!isPartialRound.value) {
      return TOTAL_ROUND_HOLES
    }

    const numericHolesPlayed = Number(holesPlayedInput.value)

    if (!Number.isFinite(numericHolesPlayed)) {
      return null
    }

    return Math.round(numericHolesPlayed)
  })

  const roundCalculationOptions = computed<{
    holesPlayed: number | null
    completionStatus: RoundCompletionStatus
    partialRoundPolicy?: PartialRoundPolicy
  }>(() => {
    if (isPartialRound.value) {
      return {
        holesPlayed: roundHolesPlayed.value,
        completionStatus: ROUND_COMPLETION_STATUS_PARTIAL,
        partialRoundPolicy: partialRoundPolicy.value,
      }
    }

    return {
      holesPlayed: TOTAL_ROUND_HOLES,
      completionStatus: ROUND_COMPLETION_STATUS_COMPLETED,
    }
  })

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
      settlementMode: activeMatch.value?.settlementMode,
      fundRule: activeMatch.value?.fundRule,
    }),
  )

  const settlementMode = computed<SettlementMode>(() => matchState.value.settlementMode)
  const isRankFundMode = computed(() => settlementMode.value === SETTLEMENT_MODE_RANK_FUND)
  const fundRule = computed<FundRule>(() => matchState.value.fundRule)
  const fundRankAllocationTotal = computed(() =>
    fundRule.value.rankAllocations.reduce((total, amount) => total + amount, 0),
  )
  const fundProgressPercent = computed(() => {
    if (dinnerPrice.value <= 0) {
      return 0
    }

    return Math.min(100, Math.max(0, (matchState.value.totalFundAmount / dinnerPrice.value) * 100))
  })
  const fundRemainingAmount = computed(() =>
    Math.max(0, dinnerPrice.value - matchState.value.totalFundAmount),
  )
  const fundEstimatedRemainingRoundCount = computed(() => {
    if (fundRemainingAmount.value <= 0) {
      return 0
    }

    if (fundRule.value.roundAmount <= 0) {
      return 0
    }

    return Math.ceil(fundRemainingAmount.value / fundRule.value.roundAmount)
  })
  const canEditSettlementRule = computed(() => matchState.value.recordedRoundCount === 0)
  const settlementModeText = computed(() => (isRankFundMode.value ? '순위 적립 방식' : '부담 비율 방식'))
  const fundRankAllocationText = computed(() => getFundRankAllocationText(fundRule.value.rankAllocations))

  const participantsWithCosts = computed(() => getParticipantsWithCosts(matchState.value, dinnerPrice.value))
  const myParticipantId = computed(() => {
    const match = activeMatch.value

    if (!match) {
      return ''
    }

    const savedParticipantId =
      typeof match.myParticipantId === 'string' &&
      participantsWithCosts.value.some((participant) => participant.id === match.myParticipantId)
        ? match.myParticipantId
        : ''

    return savedParticipantId || participantsWithCosts.value[0]?.id || ''
  })
  const myParticipant = computed(
    () => participantsWithCosts.value.find((participant) => participant.id === myParticipantId.value) ?? null,
  )
  const leadingParticipant = computed(() =>
    getLeadingParticipantBySettlementMode(participantsWithCosts.value, isRankFundMode.value),
  )
  const lowestBurdenParticipant = computed(() =>
    getLowestBurdenParticipantBySettlementMode(participantsWithCosts.value, isRankFundMode.value),
  )
  const shareRatioText = computed(() => getShareRatioText(participantsWithCosts.value))
  const leaderText = computed(() =>
    getLeaderTextBySettlementMode(participantsWithCosts.value, isRankFundMode.value),
  )
  const lowestBurdenText = computed(() =>
    getLowestBurdenTextBySettlementMode(participantsWithCosts.value, isRankFundMode.value),
  )
  const handicapMax = computed(() => getHandicapMax(participantsWithCosts.value))
  const averageInitialHandicap = computed(() => getAverageInitialHandicap(activeMatch.value))

  const roundPreviewText = computed(() =>
    getRoundScoreSummary(
      matchState.value.participants,
      new Map(Object.entries(roundScoreInputs.value)),
      {
        ...roundCalculationOptions.value,
        settlementMode: settlementMode.value,
        fundRule: fundRule.value,
      },
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
      roundCount: matchState.value.recordedRoundCount,
      settlementRoundCount: matchState.value.settlementRoundCount,
      excludedRoundCount: matchState.value.excludedRoundCount,
      settlementMode: settlementMode.value,
      totalFundAmount: matchState.value.totalFundAmount,
      session: {
        id: match.id,
        title: match.title,
        date: match.date,
        dinnerPrice: dinnerPrice.value,
      },
    })
  })

  const reversedHistory = computed(() => [...matchState.value.history].reverse())
  const myParticipantSummary = computed<MyParticipantSummary | null>(() =>
    getMyParticipantSummary({
      dinnerPrice: dinnerPrice.value,
      isRankFundMode: isRankFundMode.value,
      matchParticipants: matchState.value.participants,
      participant: myParticipant.value,
      participants: participantsWithCosts.value,
      reversedHistory: reversedHistory.value,
    }),
  )

  const clearRoundInputs = () => {
    roundScoreInputs.value = {}
    roundCourseName.value = ''
    isPartialRound.value = false
    holesPlayedInput.value = '9'
    partialRoundPolicy.value = PARTIAL_ROUND_POLICY_PRORATE
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

  const {
    closeRemoteStore,
    flashSaveStatus,
    initializeRemoteStore,
    isRemoteStoreConnected,
    isRemoteStoreEnabled,
    isStoreReady,
    persistState,
    saveStatusAnimating,
    saveStatusText,
  } = useBetBoardPersistence({
    appState,
    pendingDeleteMatchId,
    pendingDeleteParticipantId,
    syncDinnerPriceFromActiveMatch,
    syncDinnerPriceToActiveMatch,
  })

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

  const setMyParticipant = (participantId: string) => {
    if (!activeMatch.value?.participants.some((participant) => participant.id === participantId)) {
      return
    }

    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null
    updateActiveMatch((match) => ({
      ...match,
      myParticipantId: participantId,
    }))
    persistState('내 기준 변경됨')
  }

  const getEditableFundRule = (match: Match, participantCount = match.participants.length) =>
    normalizeFundRule(match.fundRule, participantCount)

  const getDefaultFundRuleForParticipantCount = (match: Match, participantCount = match.participants.length) => {
    const currentFundRule = getEditableFundRule(match, participantCount)

    return {
      roundAmount: currentFundRule.roundAmount,
      rankAllocations: createDefaultFundRankAllocations(currentFundRule.roundAmount, participantCount),
    }
  }

  const guardEditableSettlementRule = () => {
    if (canEditSettlementRule.value) {
      return true
    }

    flashSaveStatus('라운드 기록 후 변경 불가')
    return false
  }

  const setSettlementMode = (mode: SettlementMode) => {
    if (!guardEditableSettlementRule()) {
      return
    }

    const normalizedMode = normalizeSettlementMode(mode)

    if (settlementMode.value === normalizedMode) {
      return
    }

    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null
    updateActiveMatch((match) => ({
      ...match,
      settlementMode: normalizedMode,
      fundRule: normalizeFundRule(match.fundRule, match.participants.length),
    }))
    persistState(normalizedMode === SETTLEMENT_MODE_RANK_FUND ? '적립 방식 선택됨' : '비율 방식 선택됨')
  }

  const updateFundRoundAmount = (amount: unknown) => {
    if (!guardEditableSettlementRule()) {
      return
    }

    const nextRoundAmount = normalizeFundAmount(amount, DEFAULT_FUND_ROUND_AMOUNT)

    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null
    updateActiveMatch((match) => ({
      ...match,
      fundRule: {
        roundAmount: nextRoundAmount,
        rankAllocations: createDefaultFundRankAllocations(nextRoundAmount, match.participants.length),
      },
    }))
    persistState('적립금 저장됨')
  }

  const updateFundRankAllocation = (rankIndex: number, amount: unknown) => {
    if (!guardEditableSettlementRule()) {
      return
    }

    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null
    updateActiveMatch((match) => {
      const currentFundRule = getEditableFundRule(match)
      const rankAllocations = currentFundRule.rankAllocations.map((rankAmount, index) =>
        index === rankIndex ? normalizeFundAmount(amount, rankAmount) : rankAmount,
      )
      const roundAmount = rankAllocations.reduce((total, rankAmount) => total + rankAmount, 0)

      return {
        ...match,
        fundRule: {
          roundAmount,
          rankAllocations,
        },
      }
    })
    persistState('순위 배분 저장됨')
  }

  const resetFundRankAllocations = () => {
    if (!guardEditableSettlementRule()) {
      return
    }

    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null
    updateActiveMatch((match) => ({
      ...match,
      fundRule: getDefaultFundRuleForParticipantCount(match),
    }))
    persistState('기본 배분 적용됨')
  }

  onMounted(() => {
    syncDinnerPriceFromActiveMatch()
    void initializeRemoteStore()
  })

  onBeforeUnmount(() => {
    closeRemoteStore()
  })

  const addParticipant = () => {
    const fallbackName = `참가자 ${(activeMatch.value?.participants.length ?? 0) + 1}`
    const nextParticipant = createParticipant({
      name: normalizeParticipantName(newParticipantName.value, fallbackName),
      initialHandicap: newParticipantHandicap.value,
    })

    updateActiveMatch((match) => {
      const hasMyParticipant =
        typeof match.myParticipantId === 'string' &&
        match.participants.some((participant) => participant.id === match.myParticipantId)
      const nextParticipants = [...match.participants, nextParticipant]

      return {
        ...match,
        myParticipantId: hasMyParticipant ? match.myParticipantId : nextParticipant.id,
        participants: nextParticipants,
        fundRule: getDefaultFundRuleForParticipantCount(match, nextParticipants.length),
      }
    })

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
        ...(nextParticipants.length > 0
          ? {
              myParticipantId:
                match.myParticipantId && nextParticipants.some((participant) => participant.id === match.myParticipantId)
                  ? match.myParticipantId
                  : nextParticipants[0].id,
            }
          : { myParticipantId: undefined }),
        participants: nextParticipants,
        fundRule: getDefaultFundRuleForParticipantCount(match, nextParticipants.length),
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
      {
        ...roundCalculationOptions.value,
        settlementMode: settlementMode.value,
        fundRule: fundRule.value,
      },
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
          holesPlayed: summary.holesPlayed ?? TOTAL_ROUND_HOLES,
          completionStatus: summary.completionStatus ?? ROUND_COMPLETION_STATUS_COMPLETED,
          ...(summary.partialRoundPolicy ? { partialRoundPolicy: summary.partialRoundPolicy } : {}),
          ...(summary.fundRule ? { fundRule: summary.fundRule } : {}),
          ...(courseName ? { courseName } : {}),
        },
      ],
    }))

    clearRoundInputs()
    persistState(
      summary.isSettlementExcluded
        ? '중도 종료 기록됨'
        : summary.completionStatus === ROUND_COMPLETION_STATUS_PARTIAL
          ? '부분 반영 저장됨'
          : summary.isDraw
            ? '평균권 라운드 저장됨'
            : isRankFundMode.value
              ? '적립 룰 저장됨'
              : '평균 룰 저장됨',
    )
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
      fundRule: {
        roundAmount: DEFAULT_FUND_ROUND_AMOUNT,
        rankAllocations: createDefaultFundRankAllocations(DEFAULT_FUND_ROUND_AMOUNT, match.participants.length),
      },
    }))
    clearRoundInputs()
    dinnerPriceDisplay.value = formatPriceInput(DEFAULT_DINNER_PRICE)
    persistState()
  }

  const createMatch = (): string | null => {
    if (appState.value.matches.length >= MAX_MATCHES) {
      flashSaveStatus(`내기는 최대 ${MAX_MATCHES}개까지`)
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
    persistState('새 내기 생성됨')

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
    persistState('내기 전환됨')
  }

  const deleteMatch = (matchId: string) => {
    if (!appState.value.matches.some((match) => match.id === matchId)) {
      return
    }

    if (appState.value.matches.length <= 1) {
      flashSaveStatus('마지막 내기는 삭제할 수 없습니다')
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
    persistState('내기 삭제됨')
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
    isRemoteStoreEnabled,
    isRemoteStoreConnected,
    isStoreReady,
    isPartialRound,
    holesPlayedInput,
    partialRoundPolicy,
    roundHolesPlayed,
    dinnerPriceDisplay,
    newParticipantName,
    newParticipantHandicap,
    roundCourseName,
    matchState,
    settlementMode,
    isRankFundMode,
    fundRule,
    fundRankAllocationTotal,
    fundProgressPercent,
    fundRemainingAmount,
    fundEstimatedRemainingRoundCount,
    fundRankAllocationText,
    canEditSettlementRule,
    settlementModeText,
    participantsWithCosts,
    myParticipantId,
    myParticipant,
    myParticipantSummary,
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
    setMyParticipant,
    setSettlementMode,
    updateFundRoundAmount,
    updateFundRankAllocation,
    resetFundRankAllocations,
    getMatchSummaryText,
    participantStyle,
    handicapMarkerStyle,
    splitSegmentStyle,
    getParticipantColor,
    getHandicapPercent,
    formatWon,
    formatHandicap,
    formatDateText,
    getSessionMetaText,
    getHistoryScoreText,
    getHistoryAdjustmentText,
    getHistoryFundText,
    MIN_PARTICIPANTS,
    MAX_MATCHES,
    SETTLEMENT_MODE_SHARE_RATIO,
    SETTLEMENT_MODE_RANK_FUND,
  }
}
