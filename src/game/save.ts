import { createInitialState } from './initialState'
import { makeSeed } from './rng'
import { JOB_KEYS, defaultJobs, noJobs, trimJobsTo } from './village'
import { SAVE_VERSION, type GameState, type JobKey } from './types'

const SAVE_KEY = `mate-atua:save:v${SAVE_VERSION}`

/**
 * Keys this game no longer writes, cleared on load so they don't linger in a
 * player's storage. A key retires either because the saved shape changed
 * incompatibly or because the game's name did — a renamed key is a fresh
 * start, since there is nothing to read the old blob back into.
 */
const LEGACY_SAVE_KEYS = ['castaway-idle:save:v1', 'island-god:save:v2']

/**
 * Reads a stored amount, whether it was written as a bare number or as the
 * `{ amount, perSecond }` pair stores used to be.
 *
 * Rates are derived from jobs now, so a saved `perSecond` is not just
 * redundant but wrong — it was measured against a village that no longer
 * exists. The amount is the only part worth keeping.
 */
function readAmount(value: unknown): number | null {
  if (Number.isFinite(value)) return value as number

  if (typeof value === 'object' && value !== null) {
    const amount = (value as { amount?: unknown }).amount
    if (Number.isFinite(amount)) return amount as number
  }

  return null
}

/** Reads a number that may have been stored under an earlier name. */
function readNumber(...candidates: unknown[]): number | null {
  for (const candidate of candidates) {
    const value = readAmount(candidate)
    if (value !== null) return value
  }

  return null
}

/**
 * Rebuilds a job sheet from a saved one, falling back to a default roster.
 *
 * A save from before jobs existed has nothing to read, so its villagers are
 * put to work as a new pā's would be rather than left idle — an absence
 * should not come back to a village that has stopped gathering. A sheet that
 * claims more workers than there are villagers is trimmed rather than
 * rejected, since the save is otherwise perfectly good.
 */
function readJobs(raw: unknown, population: number): Record<JobKey, number> {
  if (typeof raw !== 'object' || raw === null) return defaultJobs(population)

  const saved = raw as Partial<Record<JobKey, unknown>>
  const jobs = noJobs()
  for (const job of JOB_KEYS) {
    const count = saved[job]
    if (!Number.isFinite(count) || (count as number) < 0) {
      return defaultJobs(population)
    }
    jobs[job] = Math.floor(count as number)
  }

  trimJobsTo(jobs, population)
  return jobs
}

/**
 * Turns an unknown saved blob into a usable `GameState`, or `null` when it
 * cannot be salvaged.
 *
 * This is the seam for save compatibility: an additive change to `GameState`
 * should be handled here by filling in a default for the new field, and a
 * renamed one by reading the old name as a fallback, so old saves survive.
 * Reserve a `SAVE_VERSION` bump for reshapes that genuinely cannot be
 * repaired — bumping discards every existing save.
 */
export function migrate(raw: unknown): GameState | null {
  if (typeof raw !== 'object' || raw === null) return null

  const state = raw as Record<string, unknown>
  if (state.version !== SAVE_VERSION) return null

  const resources = state.resources as
    Record<string, unknown> | null | undefined
  if (!resources || typeof resources !== 'object') return null

  const food = readAmount(resources.food)
  const wood = readAmount(resources.wood)
  const stone = readAmount(resources.stone)
  // Devotion and Mana were once Faith and its lifetime total. The names
  // changed with the lore; the numbers they held did not.
  const devotion = readNumber(state.devotion, state.faith)
  const mana = readNumber(state.mana, state.lifetimeFaith)
  const population = readAmount(state.population)
  const lastTick = readAmount(state.lastTick)

  if (
    food === null ||
    wood === null ||
    stone === null ||
    devotion === null ||
    mana === null ||
    population === null ||
    lastTick === null
  ) {
    return null
  }

  return {
    version: SAVE_VERSION,
    resources: { food, wood, stone },
    devotion,
    mana,
    population,
    jobs: readJobs(state.jobs, population),
    starvation: readAmount(state.starvation) ?? 0,
    // `seed` and `step` arrived after the first saves were written, so default
    // them rather than discarding an otherwise fine save. Seeding from
    // `lastTick` keeps the derived seed stable across reloads.
    seed: readAmount(state.seed) ?? makeSeed(lastTick),
    step: readAmount(state.step) ?? 0,
    lastTick,
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
