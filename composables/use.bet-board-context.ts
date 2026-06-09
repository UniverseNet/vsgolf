import type { InjectionKey } from 'vue'
import { useBetBoard } from '~/composables/useBetBoard'

export type BetBoardContext = ReturnType<typeof useBetBoard>

export const betBoardContextKey: InjectionKey<BetBoardContext> = Symbol('betBoard')

export const provideBetBoard = () => {
  const board = useBetBoard()
  provide(betBoardContextKey, board)
  return board
}

export const useBetBoardContext = () => {
  const context = inject(betBoardContextKey)

  if (!context) {
    throw new Error('useBetBoardContext must be used within a bet board provider')
  }

  return context
}
