import type { GameState } from './types'

export function createInitialState(): GameState {
  return {
    resources: {
      water: { amount: 0, perSecond: 0.5 },
    },
    lastTick: Date.now(),
  }
}
