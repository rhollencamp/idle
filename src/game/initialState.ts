import { makeSeed } from './rng'
import { defaultJobs } from './village'
import { SAVE_VERSION, type GameState } from './types'

/**
/**
 * The pā as it stands on the first morning: five villagers, three of them in
 * the gardens, a little food in the pātaka and no standing yet.
 *
 * Three gardeners feed five people with room to spare, so the pā grows if the
 * player never touches it — and the margin is wide enough that reaching the
 * housing cap is not what starves it. Moving those gardeners elsewhere is how
 * a player creates scarcity, which is the point.
 */
export function createInitialState(now: number = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    resources: { food: 20, wood: 0, stone: 0 },
    devotion: 0,
    mana: 0,
    population: 5,
    jobs: defaultJobs(5),
    starvation: 0,
    seed: makeSeed(now),
    step: 0,
    lastTick: now,
  }
}
