import { makeSeed } from './rng'
import { noJobs } from './village'
import { SAVE_VERSION, type GameState } from './types'

/**
/**
 * The pā as it stands on the first morning: five villagers, two of them
 * working the gardens and three young enough to still be given a trade.
 *
 * Two gardeners feed five with room to spare, so the pā is not on a clock
 * while the player decides — an opening that starved you for thinking would
 * be a poor first impression. The three untrained are the first decision the
 * game asks for, and the only kind it will ever ask: a trade is given once,
 * at birth, and held for life.
 */
export function createInitialState(now: number = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    resources: { food: 20, wood: 0, stone: 0 },
    devotion: 0,
    mana: 0,
    population: 5,
    jobs: { ...noJobs(), gardener: 2 },
    starvation: 0,
    seed: makeSeed(now),
    step: 0,
    lastTick: now,
  }
}
