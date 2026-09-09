import { createInitialState } from './initialState'
import { makeSeed } from './rng'
import { SAVE_VERSION, type GameState, type ResourceState } from './types'

const SAVE_KEY = `mate-atua:save:v${SAVE_VERSION}`

/**
 * Keys this game no longer writes, cleared on load so they don't linger in a
 * player's storage. A key retires either because the saved shape changed
 * incompatibly or because the game's name did — a renamed key is a fresh
 * start, since there is nothing to read the old blob back into.
 */
const LEGACY_SAVE_KEYS = ['castaway-idle:save:v1', 'island-god:save:v2']

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

  // `seed`, `step`, and `starvation` all arrived after the first saves were
  // written, so default them here rather than discarding an otherwise fine
  // save. Seeding from `lastTick` keeps the derived seed stable across
  // reloads; a save from before famines existed was, by definition, not in
  // one.
  return {
    ...(state as GameState),
    starvation: Number.isFinite(state.starvation)
      ? (state.starvation as number)
      : 0,
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

/**
 * The save as text the player can keep. Deliberately the same JSON `saveState`
 * writes, pretty-printed: an export is a copy of the save, not a second format
 * that would need its own migration path.
 */
export function serializeSave(state: GameState): string {
  return JSON.stringify(state, null, 2)
}

/**
 * Reads back what `serializeSave` wrote, or `null` if the text is not a save
 * this build can use. Goes through `migrate`, so an imported file gets the
 * same repairs and the same rejections as one loaded from storage.
 */
export function parseSave(text: string): GameState | null {
  try {
    return migrate(JSON.parse(text))
  } catch {
    return null
  }
}
