import type { GameState, ResourceKey } from './types'

/** Advances state's resources to `now`, based on elapsed time since lastTick. */
export function advanceTo(state: GameState, now: number): GameState {
  const elapsedSeconds = (now - state.lastTick) / 1000
  if (elapsedSeconds <= 0) return state

  const resources = { ...state.resources }
  for (const key of Object.keys(resources) as ResourceKey[]) {
    const resource = resources[key]
    resources[key] = {
      ...resource,
      amount: resource.amount + resource.perSecond * elapsedSeconds,
    }
  }

  return { ...state, resources, lastTick: now }
}
