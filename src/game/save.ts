import { createInitialState } from './initialState'
import { makeSeed } from './rng'
import { SAVE_VERSION, type GameState, type ResourceState } from './types'

const SAVE_KEY = `island-god:save:v${SAVE_VERSION}`

/** Keys from earlier, incompatible shapes. Cleared on load so they don't linger. */
const LEGACY_SAVE_KEYS = ['castaway-idle:save:v1']

function isResourceState(value: unknown): value is ResourceState {
  if (typeof value !== 'object' || value === null) return false
  const resource = value as Partial<ResourceState>
  return Number.isFinite(resource.amount) && Number.isFinite(resource.perSecond)
}

/**
 * Turns an unknown saved blob into a usable `GameState`, or `null` when it
 * cannot be salvaged.
 *
 * This is the seam for save compatibility: an additive change to `GameState`
 * should be handled here by filling in a default for the new field, so old
 * saves survive. Reserve a `SAVE_VERSION` bump for reshapes that genuinely
 * cannot be repaired — bumping discards every existing save.
 */
export function migrate(raw: unknown): GameState | null {
  if (typeof raw !== 'object' || raw === null) return null

  const state = raw as Partial<GameState>
  if (state.version !== SAVE_VERSION) return null

  if (
    !state.resources ||
    !isResourceState(state.resources.food) ||
    !isResourceState(state.resources.wood) ||
    !isResourceState(state.resources.stone) ||
    !isResourceState(state.faith) ||
    !Number.isFinite(state.lifetimeFaith) ||
    !Number.isFinite(state.population) ||
    !Number.isFinite(state.lastTick)
  ) {
    return null
  }

  // `seed` and `step` arrived after the first saves were written, so default
  // them here rather than discarding an otherwise fine save. Seeding from
  // `lastTick` keeps the derived seed stable across reloads.
  return {
    ...(state as GameState),
    seed: Number.isFinite(state.seed)
      ? (state.seed as number)
      : makeSeed(state.lastTick as number),
    step: Number.isFinite(state.step) ? (state.step as number) : 0,
  }
}

export function loadState(): GameState {
  for (const key of LEGACY_SAVE_KEYS) localStorage.removeItem(key)

  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return createInitialState()

    return migrate(JSON.parse(raw)) ?? createInitialState()
  } catch {
    return createInitialState()
  }
}

export function saveState(state: GameState): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state))
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY)
}
