import type { AppState } from '~/types/bet-board'
import { normalizeAppStateValue, serializeAppState } from './normalize'

const SUPABASE_BOARD_TABLE = 'bet_board_state'
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

const getSupabaseRestUrl = (config: SupabaseStoreConfig) =>
  `${trimTrailingSlash(config.url)}/rest/v1/${SUPABASE_BOARD_TABLE}`

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
  const params = new URLSearchParams({
    id: `eq.${config.boardId}`,
    limit: '1',
    select: 'state,updated_at',
  })
  const response = await fetch(`${getSupabaseRestUrl(config)}?${params.toString()}`, {
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
  const params = new URLSearchParams({
    on_conflict: 'id',
  })
  const response = await fetch(`${getSupabaseRestUrl(config)}?${params.toString()}`, {
    body: JSON.stringify({
      id: config.boardId,
      state: JSON.parse(serializeAppState(state)),
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
  let heartbeatTimer: ReturnType<typeof window.setInterval> | null = null
  let reconnectTimer: ReturnType<typeof window.setTimeout> | null = null
  let ref = 1
  let closed = false
  let socket: WebSocket | null = null
  const topic = `realtime:vsgolf-board-${config.boardId}`

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

  const send = (event: string, payload: Record<string, unknown>, topicName = topic) => {
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
            table: SUPABASE_BOARD_TABLE,
          },
        ],
        presence: { enabled: false },
        private: false,
      },
    })
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
          handlers.onError?.(new Error(message.payload.response?.reason ?? 'Supabase Realtime 구독 실패'))
          return
        }

        if (message.event !== 'postgres_changes') {
          return
        }

        const record = getPostgresChangeRecord(message)
        const boardState = record ? parseSupabaseRecord(record) : null

        if (boardState) {
          handlers.onChange(boardState)
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
