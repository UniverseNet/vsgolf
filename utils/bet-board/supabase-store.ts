import type { AppState } from '~/types/bet-board'
import { normalizeAppStateValue, serializeAppState } from './normalize'

const SUPABASE_BOARD_TABLE = 'bet_boards'
const LEGACY_SUPABASE_BOARD_TABLE = 'bet_board_state'
const GET_BOARD_STATE_RPC = 'get_bet_board_state'
const SAVE_BOARD_STATE_RPC = 'save_bet_board_state'
const REALTIME_HEARTBEAT_MS = 20_000
const REALTIME_RECONNECT_MS = 3_000

export interface SupabaseStoreConfig {
  anonKey: string
  boardId: string
  url: string
}

export interface SupabaseBoardState {
  state: AppState
  updatedAt: string
}

interface SupabaseRealtimeHandlers {
  onChange: (boardState: SupabaseBoardState) => void
  onError?: (error: unknown) => void
  onStatus?: (status: string) => void
}

interface SupabaseRealtimeSubscription {
  close: () => void
}

interface SupabaseBoardRecord {
  id?: string
  state?: unknown
  updated_at?: string
}

type RealtimeMessage = {
  event?: string
  join_ref?: string
  payload?: {
    response?: {
      postgres_changes?: Array<{ id?: number | string }>
      reason?: string
    }
    status?: string
    data?: {
      record?: SupabaseBoardRecord
    }
    record?: SupabaseBoardRecord
  }
  ref?: string
  topic?: string
}

export const isSupabaseStoreConfigured = (config: SupabaseStoreConfig) =>
  Boolean(config.url.trim() && config.anonKey.trim() && config.boardId.trim())

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const getLegacySupabaseRestUrl = (config: SupabaseStoreConfig) =>
  `${trimTrailingSlash(config.url)}/rest/v1/${LEGACY_SUPABASE_BOARD_TABLE}`

const getSupabaseRpcUrl = (config: SupabaseStoreConfig, functionName: string) =>
  `${trimTrailingSlash(config.url)}/rest/v1/rpc/${functionName}`

const getSupabaseRealtimeUrl = (config: SupabaseStoreConfig) => {
  const realtimeUrl = trimTrailingSlash(config.url).replace(/^http/, 'ws')
  const params = new URLSearchParams({
    apikey: config.anonKey,
    vsn: '1.0.0',
  })

  return `${realtimeUrl}/realtime/v1/websocket?${params.toString()}`
}

const getSupabaseHeaders = (config: SupabaseStoreConfig) => ({
  apikey: config.anonKey,
  Authorization: `Bearer ${config.anonKey}`,
  'Content-Type': 'application/json',
})

const parseSupabaseRecord = (record: SupabaseBoardRecord): SupabaseBoardState | null => {
  if (!record.state) {
    return null
  }

  return {
    state: normalizeAppStateValue(record.state),
    updatedAt: record.updated_at ?? '',
  }
}

const parseSupabaseState = (state: unknown, updatedAt = ''): SupabaseBoardState => ({
  state: normalizeAppStateValue(state),
  updatedAt,
})

const isRpcMissingResponse = async (response: Response) => {
  if (response.status === 404) {
    return true
  }

  if (response.status !== 400) {
    return false
  }

  const responseText = await response.clone().text()

  return responseText.includes('Could not find the function') || responseText.includes('PGRST202')
}

const getPostgresChangeRecord = (message: RealtimeMessage): SupabaseBoardRecord | null =>
  message.payload?.data?.record ?? message.payload?.record ?? null

const createRealtimeMessage = (
  topic: string,
  event: string,
  payload: Record<string, unknown>,
  ref: string,
): RealtimeMessage => ({
  event,
  join_ref: ref,
  payload,
  ref,
  topic,
})

export const fetchSupabaseBoardState = async (
  config: SupabaseStoreConfig,
): Promise<SupabaseBoardState | null> => {
  const rpcResponse = await fetch(getSupabaseRpcUrl(config, GET_BOARD_STATE_RPC), {
    body: JSON.stringify({
      p_board_id: config.boardId,
    }),
    headers: getSupabaseHeaders(config),
    method: 'POST',
  })

  if (rpcResponse.ok) {
    const state = await rpcResponse.json()

    return state ? parseSupabaseState(state) : null
  }

  if (!(await isRpcMissingResponse(rpcResponse))) {
    throw new Error(`Supabase 조회 실패: ${rpcResponse.status}`)
  }

  const params = new URLSearchParams({
    id: `eq.${config.boardId}`,
    limit: '1',
    select: 'state,updated_at',
  })
  const response = await fetch(`${getLegacySupabaseRestUrl(config)}?${params.toString()}`, {
    headers: getSupabaseHeaders(config),
  })

  if (!response.ok) {
    throw new Error(`Supabase 조회 실패: ${response.status}`)
  }

  const records = (await response.json()) as SupabaseBoardRecord[]
  const record = records[0]

  return record ? parseSupabaseRecord(record) : null
}

export const saveSupabaseBoardState = async (
  config: SupabaseStoreConfig,
  state: AppState,
) => {
  const serializedState = JSON.parse(serializeAppState(state))
  const rpcResponse = await fetch(getSupabaseRpcUrl(config, SAVE_BOARD_STATE_RPC), {
    body: JSON.stringify({
      p_board_id: config.boardId,
      p_state: serializedState,
    }),
    headers: getSupabaseHeaders(config),
    method: 'POST',
  })

  if (rpcResponse.ok) {
    return
  }

  if (!(await isRpcMissingResponse(rpcResponse))) {
    throw new Error(`Supabase 저장 실패: ${rpcResponse.status}`)
  }

  const params = new URLSearchParams({
    on_conflict: 'id',
  })
  const response = await fetch(`${getLegacySupabaseRestUrl(config)}?${params.toString()}`, {
    body: JSON.stringify({
      id: config.boardId,
      state: serializedState,
    }),
    headers: {
      ...getSupabaseHeaders(config),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Supabase 저장 실패: ${response.status}`)
  }
}

export const subscribeSupabaseBoardState = (
  config: SupabaseStoreConfig,
  handlers: SupabaseRealtimeHandlers,
): SupabaseRealtimeSubscription => {
  let heartbeatTimer: number | null = null
  let reconnectTimer: number | null = null
  let ref = 1
  let closed = false
  let realtimeTable = SUPABASE_BOARD_TABLE
  let socket: WebSocket | null = null
  const getTopic = () => `realtime:vsgolf-board-${config.boardId}-${realtimeTable}`

  const nextRef = () => String(ref++)

  const clearTimers = () => {
    if (heartbeatTimer) {
      window.clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }

    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const send = (event: string, payload: Record<string, unknown>, topicName = getTopic()) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return
    }

    const messageRef = nextRef()
    socket.send(JSON.stringify(createRealtimeMessage(topicName, event, payload, messageRef)))
  }

  const scheduleReconnect = () => {
    if (closed || reconnectTimer) {
      return
    }

    handlers.onStatus?.('재연결 대기')
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null
      connect()
    }, REALTIME_RECONNECT_MS)
  }

  const joinChannel = () => {
    send('phx_join', {
      access_token: config.anonKey,
      config: {
        broadcast: { ack: false, self: false },
        postgres_changes: [
          {
            event: '*',
            filter: `id=eq.${config.boardId}`,
            schema: 'public',
            table: realtimeTable,
          },
        ],
        presence: { enabled: false },
        private: false,
      },
    })
  }

  const fallbackToLegacyRealtime = () => {
    if (realtimeTable === LEGACY_SUPABASE_BOARD_TABLE) {
      return false
    }

    realtimeTable = LEGACY_SUPABASE_BOARD_TABLE
    handlers.onStatus?.('기존 저장소 구독')
    socket?.close()

    return true
  }

  function connect() {
    clearTimers()
    handlers.onStatus?.('연결 중')
    socket = new WebSocket(getSupabaseRealtimeUrl(config))

    socket.addEventListener('open', () => {
      handlers.onStatus?.('연결됨')
      joinChannel()
      heartbeatTimer = window.setInterval(() => {
        send('heartbeat', {}, 'phoenix')
      }, REALTIME_HEARTBEAT_MS)
    })

    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(String(event.data)) as RealtimeMessage

        if (message.event === 'phx_reply' && message.payload?.status === 'error') {
          if (fallbackToLegacyRealtime()) {
            return
          }

          handlers.onError?.(new Error(message.payload.response?.reason ?? 'Supabase Realtime 구독 실패'))
          return
        }

        if (message.event !== 'postgres_changes') {
          return
        }

        const record = getPostgresChangeRecord(message)
        const boardState = record?.state
          ? parseSupabaseRecord(record)
          : record?.id
            ? null
            : null

        if (boardState) {
          handlers.onChange(boardState)
          return
        }

        if (record?.id) {
          void fetchSupabaseBoardState(config)
            .then((nextBoardState) => {
              if (nextBoardState) {
                handlers.onChange(nextBoardState)
              }
            })
            .catch((error) => {
              handlers.onError?.(error)
            })
        }
      } catch (error) {
        handlers.onError?.(error)
      }
    })

    socket.addEventListener('error', (error) => {
      handlers.onError?.(error)
    })

    socket.addEventListener('close', () => {
      if (heartbeatTimer) {
        window.clearInterval(heartbeatTimer)
        heartbeatTimer = null
      }

      if (!closed) {
        scheduleReconnect()
      }
    })
  }

  connect()

  return {
    close: () => {
      closed = true
      clearTimers()
      socket?.close()
      socket = null
    },
  }
}
