import type {
  AppState,
  FundRule,
  Match,
  PartialRoundPolicy,
  ParticipantWithCost,
  ScoredRoundHistoryEntry,
  RoundCompletionStatus,
  SettlementMode,
} from '~/types/bet-board'
import {
  DEFAULT_FUND_ROUND_AMOUNT,
  DEFAULT_DINNER_PRICE,
  DEFAULT_INITIAL_HANDICAP,
  DEFAULT_PARTICIPANT_SHARE,
  MAX_MATCHES,
  MIN_PARTICIPANTS,
  PARTIAL_ROUND_POLICY_PRORATE,
  ROUND_COMPLETION_STATUS_COMPLETED,
  ROUND_COMPLETION_STATUS_PARTIAL,
  ROUND_RULE_FIELD_AVERAGE,
  SETTLEMENT_MODE_RANK_FUND,
  SETTLEMENT_MODE_SHARE_RATIO,
  STORAGE_KEY,
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
  serializeAppState,
} from '~/utils/bet-board/normalize'
import {
  fetchSupabaseBoardState,
  isSupabaseStoreConfigured,
  saveSupabaseBoardState,
  subscribeSupabaseBoardState,
  type SupabaseStoreConfig,
} from '~/utils/bet-board/supabase-store'

interface ParticipantRoundChange {
  round: number
  label: string
  rank?: number
  strokes?: number
  adjustedStrokes?: number
  shareDelta: number
  handicapDelta: number
  costDelta: number
}

interface MyParticipantSummary {
  participant: ParticipantWithCost
  initialCost: number
  costDelta: number
  shareDelta: number
  handicapDelta: number
  latestChange: ParticipantRoundChange | null
}

export const useBetBoard = () => {
  const runtimeConfig = useRuntimeConfig()
  const supabaseStoreConfig: SupabaseStoreConfig = {
    anonKey: String(runtimeConfig.public.supabaseAnonKey || ''),
    boardId: String(runtimeConfig.public.supabaseBoardId || 'default'),
    url: String(runtimeConfig.public.supabaseUrl || ''),
  }
  const isRemoteStoreEnabled = isSupabaseStoreConfigured(supabaseStoreConfig)
  let remoteSubscription: ReturnType<typeof subscribeSupabaseBoardState> | null = null
  const appState = ref<AppState>(loadStoredAppState())
  const pendingDeleteParticipantId = ref<string | null>(null)
  const pendingDeleteMatchId = ref<string | null>(null)
  const roundScoreInputs = ref<Record<string, string>>({})
  const saveStatusText = ref('저장됨')
  const saveStatusAnimating = ref(false)
  const boardRoundFeedback = ref(false)
  const isRemoteStoreConnected = ref(false)
  const isStoreReady = ref(!isRemoteStoreEnabled)
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
  const leadingParticipant = computed(() => {
    if (!isRankFundMode.value) {
      return getLeadingParticipant(participantsWithCosts.value)
    }

    return participantsWithCosts.value.reduce<ParticipantWithCost | null>(
      (leadingParticipant, participant) =>
        !leadingParticipant || participant.cost > leadingParticipant.cost ? participant : leadingParticipant,
      null,
    )
  })
  const lowestBurdenParticipant = computed(() => {
    if (!isRankFundMode.value) {
      return getLowestBurdenParticipant(participantsWithCosts.value)
    }

    return participantsWithCosts.value.reduce<ParticipantWithCost | null>(
      (lowestParticipant, participant) =>
        !lowestParticipant || participant.cost < lowestParticipant.cost ? participant : lowestParticipant,
      null,
    )
  })
  const shareRatioText = computed(() => getShareRatioText(participantsWithCosts.value))
  const leaderText = computed(() => {
    if (!isRankFundMode.value) {
      return getLeaderText(participantsWithCosts.value)
    }

    if (participantsWithCosts.value.length === 0) {
      return '참가자 없음'
    }

    const highestCost = Math.max(...participantsWithCosts.value.map((participant) => participant.cost))

    return participantsWithCosts.value
      .filter((participant) => participant.cost === highestCost)
      .map((participant) => participant.name)
      .join(', ')
  })
  const lowestBurdenText = computed(() => {
    if (!isRankFundMode.value) {
      return getLowestBurdenText(participantsWithCosts.value)
    }

    if (participantsWithCosts.value.length === 0) {
      return '참가자 없음'
    }

    const lowestCost = Math.min(...participantsWithCosts.value.map((participant) => participant.cost))

    return participantsWithCosts.value
      .filter((participant) => participant.cost === lowestCost)
      .map((participant) => participant.name)
      .join(', ')
  })
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
  const getParticipantCostFromShares = (
    participantId: string,
    shares: Array<{ id: string; share: number }>,
  ) => {
    const totalShare = shares.reduce((total, participant) => total + participant.share, 0) || 1
    let allocatedCost = 0

    return shares.reduce((participantCost, participant, index) => {
      const isLastParticipant = index === shares.length - 1
      const cost = isLastParticipant
        ? Math.max(0, dinnerPrice.value - allocatedCost)
        : Math.round(dinnerPrice.value * (participant.share / totalShare))

      allocatedCost += cost

      return participant.id === participantId ? cost : participantCost
    }, 0)
  }

  const getRoundParticipantChange = (
    entry: ScoredRoundHistoryEntry,
    participantId: string,
  ): ParticipantRoundChange => {
    const score = entry.scores.find((roundScore) => roundScore.participantId === participantId)
    const hasDetailedShares = entry.scores.every(
      (roundScore) => typeof roundScore.shareAfter === 'number',
    )
    const label =
      entry.completionStatus === ROUND_COMPLETION_STATUS_PARTIAL
        ? `${entry.holesPlayed}홀 부분 반영`
        : `${entry.round}R 반영`

    if (score && entry.settlementMode === SETTLEMENT_MODE_RANK_FUND) {
      return {
        round: entry.round,
        label,
        rank: score.fundRank,
        strokes: score.strokes,
        adjustedStrokes: score.adjustedStrokes,
        shareDelta: 0,
        handicapDelta: score.handicapDelta ?? 0,
        costDelta: score.fundAmountDelta ?? 0,
      }
    }

    if (score && hasDetailedShares) {
      const beforeShares = entry.scores.map((roundScore) => ({
        id: roundScore.participantId,
        share: Math.max(0, (roundScore.shareAfter ?? DEFAULT_PARTICIPANT_SHARE) - (roundScore.shareDelta ?? 0)),
      }))
      const afterShares = entry.scores.map((roundScore) => ({
        id: roundScore.participantId,
        share: roundScore.shareAfter ?? DEFAULT_PARTICIPANT_SHARE,
      }))

      return {
        round: entry.round,
        label,
        strokes: score.strokes,
        adjustedStrokes: score.adjustedStrokes,
        shareDelta: score.shareDelta ?? 0,
        handicapDelta: score.handicapDelta ?? 0,
        costDelta:
          getParticipantCostFromShares(participantId, afterShares) -
          getParticipantCostFromShares(participantId, beforeShares),
      }
    }

    const afterShares = participantsWithCosts.value.map((participant) => ({
      id: participant.id,
      share: participant.share,
    }))
    const beforeShares = afterShares.map((participant) => {
      if (participant.id === entry.winnerId) {
        return { ...participant, share: participant.share + 1 }
      }

      if (participant.id === entry.loserId) {
        return { ...participant, share: Math.max(0, participant.share - 1) }
      }

      return participant
    })
    const shareDelta = participantId === entry.winnerId ? -1 : participantId === entry.loserId ? 1 : 0

    return {
      round: entry.round,
      label,
      strokes: score?.strokes,
      adjustedStrokes: score?.adjustedStrokes,
      shareDelta,
      handicapDelta: shareDelta,
      costDelta:
        getParticipantCostFromShares(participantId, afterShares) -
        getParticipantCostFromShares(participantId, beforeShares),
    }
  }
  const myParticipantSummary = computed<MyParticipantSummary | null>(() => {
    const participant = myParticipant.value

    if (!participant) {
      return null
    }

    const initialShares = matchState.value.participants.map((matchParticipant) => ({
      id: matchParticipant.id,
      share: DEFAULT_PARTICIPANT_SHARE,
    }))
    const latestSettlementRound = reversedHistory.value.find((entry) => entry.isSettlementApplied)
    const initialCost = isRankFundMode.value ? 0 : getParticipantCostFromShares(participant.id, initialShares)

    return {
      participant,
      initialCost,
      costDelta: participant.cost - initialCost,
      shareDelta: participant.share - DEFAULT_PARTICIPANT_SHARE,
      handicapDelta: participant.handicap - participant.initialHandicap,
      latestChange: latestSettlementRound
        ? getRoundParticipantChange(latestSettlementRound, participant.id)
        : null,
    }
  })

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

  const flashSaveStatus = (text: string) => {
    saveStatusText.value = text
    saveStatusAnimating.value = true
    window.setTimeout(() => {
      saveStatusAnimating.value = false
    }, 700)
  }

  const applyRemoteAppState = (nextState: AppState) => {
    const currentActiveMatchId = appState.value.activeMatchId
    const activeMatchId = nextState.matches.some((match) => match.id === currentActiveMatchId)
      ? currentActiveMatchId
      : nextState.activeMatchId

    appState.value = {
      ...nextState,
      activeMatchId,
    }
    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null
    syncDinnerPriceFromActiveMatch()
  }

  const persistState = (statusText = '저장됨') => {
    if (!import.meta.client) {
      return
    }

    syncDinnerPriceToActiveMatch()

    if (isRemoteStoreEnabled) {
      saveStatusText.value = '실시간 저장 중'
      void saveSupabaseBoardState(supabaseStoreConfig, appState.value)
        .then(() => {
          isRemoteStoreConnected.value = true
          flashSaveStatus(statusText === '저장됨' ? '실시간 저장됨' : statusText)
        })
        .catch((error) => {
          console.warn('Supabase에 내기 정보를 저장하지 못했습니다.', error)
          isRemoteStoreConnected.value = false
          flashSaveStatus('Supabase 저장 실패')
        })
      return
    }

    try {
      localStorage.setItem(STORAGE_KEY, serializeAppState(appState.value))
      flashSaveStatus(statusText)
    } catch (error) {
      console.warn('내기 정보를 저장하지 못했습니다.', error)
      flashSaveStatus('저장 실패')
    }
  }

  const initializeRemoteStore = async () => {
    if (!import.meta.client || !isRemoteStoreEnabled) {
      persistState()
      isStoreReady.value = true
      return
    }

    saveStatusText.value = 'Supabase 연결 중'

    try {
      const remoteBoardState = await fetchSupabaseBoardState(supabaseStoreConfig)

      if (remoteBoardState) {
        applyRemoteAppState(remoteBoardState.state)
        flashSaveStatus('실시간 동기화됨')
      } else {
        syncDinnerPriceToActiveMatch()
        await saveSupabaseBoardState(supabaseStoreConfig, appState.value)
        flashSaveStatus('공유 보드 생성됨')
      }

      isRemoteStoreConnected.value = true
      remoteSubscription = subscribeSupabaseBoardState(supabaseStoreConfig, {
        onChange: (boardState) => {
          applyRemoteAppState(boardState.state)
          isRemoteStoreConnected.value = true
          flashSaveStatus('실시간 업데이트')
        },
        onError: (error) => {
          console.warn('Supabase 실시간 구독 오류가 발생했습니다.', error)
          isRemoteStoreConnected.value = false
          flashSaveStatus('실시간 연결 확인 필요')
        },
        onStatus: (status) => {
          if (status === '연결됨') {
            isRemoteStoreConnected.value = true
          }
        },
      })

    } catch (error) {
      console.warn('Supabase에서 내기 정보를 불러오지 못했습니다.', error)
      isRemoteStoreConnected.value = false
      flashSaveStatus('Supabase 연결 실패')
    } finally {
      isStoreReady.value = true
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
    remoteSubscription?.close()
    remoteSubscription = null
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

  const getMatchSummaryText = (match: Match) => {
    const board = buildMatchState(match)
    const participants = getParticipantsWithCosts(board, match.dinnerPrice)
    const myParticipant =
      participants.find((participant) => participant.id === match.myParticipantId) ?? participants[0]
    const myParticipantText = myParticipant
      ? `내 기준 ${myParticipant.name} ${formatWon(myParticipant.cost)}`
      : '내 기준 -'
    const settlementText =
      board.settlementMode === SETTLEMENT_MODE_RANK_FUND
        ? `적립 ${formatWon(board.totalFundAmount)}`
        : `정산 ${board.settlementRoundCount}R`

    return `${match.participants.length}명 · 기록 ${board.recordedRoundCount}R · ${settlementText} · ${myParticipantText}`
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
