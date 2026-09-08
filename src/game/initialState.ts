import { SAVE_VERSION, type GameState } from './types'

/**
 * The starting village. The `perSecond` rates are fixed placeholders — from
 * step 4 onward they become derived from job assignments rather than stored.
 */
export function createInitialState(): GameState {
  return {
    version: SAVE_VERSION,
    resources: {
      food: { amount: 20, perSecond: 0.5 },
      wood: { amount: 0, perSecond: 0.2 },
      stone: { amount: 0, perSecond: 0.1 },
    },
    faith: { amount: 0, perSecond: 0.5 },
    lifetimeFaith: 0,
    population: 5,
    lastTick: Date.now(),
  }
}
