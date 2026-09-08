import { makeSeed } from './rng'
import { SAVE_VERSION, type GameState } from './types'

/**
 * The starting village. The `perSecond` rates are fixed placeholders — from
 * step 4 onward they become derived from job assignments rather than stored.
 *
 * Food's yield is set clear of what five villagers eat, and clear again of
 * what a full ten eat, so the starting village grows to its housing cap and
 * then keeps a surplus. A yield that merely tied the upkeep at the cap would
 * leave the granary balanced on a knife edge, one rounding error away from
 * reading as a famine.
 */
export function createInitialState(now: number = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    resources: {
      food: { amount: 20, perSecond: 0.8 },
      wood: { amount: 0, perSecond: 0.2 },
      stone: { amount: 0, perSecond: 0.1 },
    },
    faith: { amount: 0, perSecond: 0.5 },
    lifetimeFaith: 0,
    population: 5,
    starvation: 0,
    seed: makeSeed(now),
    step: 0,
    lastTick: now,
  }
}
