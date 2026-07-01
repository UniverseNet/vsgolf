import type { Ref } from 'vue'
import type { AppState } from '~/types/bet-board'
import { STORAGE_KEY } from '~/utils/bet-board/constants'
import { serializeAppState } from '~/utils/bet-board/normalize'
import {
  fetchSupabaseBoardState,
  isSupabaseStoreConfigured,
  saveSupabaseBoardState,
  subscribeSupabaseBoardState,
  type SupabaseStoreConfig,
} from '~/utils/bet-board/supabase-store'

interface UseBetBoardPersistenceOptions {
  appState: Ref<AppState>
  pendingDeleteMatchId: Ref<string | null>
  pendingDeleteParticipantId: Ref<string | null>
  syncDinnerPriceFromActiveMatch: () => void
  syncDinnerPriceToActiveMatch: () => void
}

/**
 * 내기 상태의 로컬 저장과 Supabase 실시간 동기화를 관리합니다.
 */
export const useBetBoardPersistence = ({
  appState,
  pendingDeleteMatchId,
  pendingDeleteParticipantId,
  syncDinnerPriceFromActiveMatch,
  syncDinnerPriceToActiveMatch,
}: UseBetBoardPersistenceOptions) => {
  const runtimeConfig = useRuntimeConfig()
  const supabaseStoreConfig: SupabaseStoreConfig = {
    anonKey: String(runtimeConfig.public.supabaseAnonKey || ''),
    boardId: String(runtimeConfig.public.supabaseBoardId || 'default'),
    url: String(runtimeConfig.public.supabaseUrl || ''),
  }
  const isRemoteStoreEnabled = isSupabaseStoreConfigured(supabaseStoreConfig)
  let remoteSubscription: ReturnType<typeof subscribeSupabaseBoardState> | null = null
  const saveStatusText = ref('저장됨')
  const saveStatusAnimating = ref(false)
  const isRemoteStoreConnected = ref(false)
  const isStoreReady = ref(!isRemoteStoreEnabled)

  const clearPendingDeleteState = () => {
    pendingDeleteParticipantId.value = null
    pendingDeleteMatchId.value = null
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
    clearPendingDeleteState()
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

  const closeRemoteStore = () => {
    remoteSubscription?.close()
    remoteSubscription = null
  }

  return {
    closeRemoteStore,
    flashSaveStatus,
    initializeRemoteStore,
    isRemoteStoreConnected,
    isRemoteStoreEnabled,
    isStoreReady,
    persistState,
    saveStatusAnimating,
    saveStatusText,
  }
}
