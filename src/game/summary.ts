import { advanceTo } from './tick'
import type { GameState, ResourceKey } from './types'

/**
 * Absences shorter than this pass without a word.
 *
 * Switching tabs to look something up is not an absence, and a dialog that
 * greets a thirty-second round trip with "you gained 0.4 wood" trains the
 * player to dismiss it unread — which is the one thing the summary cannot
 * afford, since it is where the Chronicle will eventually live.
 */
export const MIN_AWAY_MS = 60_000

/**
 * What the pā did while nobody was watching.
 *
 * Deltas rather than totals: the screen behind the dialog already shows what
 * the pā *has*, and what the player came back to learn is what moved. Food is
 * the one that can be negative — the pā eats whether or not anybody is
 * watching.
 */
export interface AwaySummary {
  awayMs: number
  resources: Record<ResourceKey, number>
  /**
   * Devotion *earned*, read off Mana rather than the balance, so a summary
   * cannot be quietly cancelled out by what was spent in the same span.
   */
  devotion: number
  /**
   * Births and deaths kept apart. A net figure would report a night that
   * buried four and raised six as "+2", which is the wrong story about the
   * same two numbers.
   */
  births: number
  deaths: number
  /** Villagers on return, so the report can say what it left the pā at. */
  population: number
  /** Whether the pā is still in a famine on return. */
  starving: boolean
}

/**
 * The report on an absence, or `null` when there is nothing worth reporting.
 *
 * A diff of two states rather than anything the sim narrates: `births` and
 * `deaths` are running totals, so subtracting the pair recovers what happened
 * between them without the tick having to record events. Step 13's Chronicle
 * replaces the diff with the log entries the sim emits; until then this is
 * the account the pā can give of itself.
 */
export function summarizeAbsence(
  before: GameState,
  after: GameState,
): AwaySummary | null {
  const awayMs = after.lastTick - before.lastTick
  if (awayMs < MIN_AWAY_MS) return null

  return {
    awayMs,
    resources: {
      food: after.resources.food - before.resources.food,
      wood: after.resources.wood - before.resources.wood,
      stone: after.resources.stone - before.resources.stone,
    },
    devotion: after.mana - before.mana,
    births: after.births - before.births,
    deaths: after.deaths - before.deaths,
    population: after.population,
    starving: after.starvation > 0,
  }
}

/**
 * Catches a state up to `now` and reports the gap in one call, so the two
 * always describe the same span — summarizing off a separately advanced state
 * is how a summary ends up covering time the player was actually watching.
 */
export function resumeFrom(
  state: GameState,
  now: number,
): { state: GameState; summary: AwaySummary | null } {
  const advanced = advanceTo(state, now)

  return { state: advanced, summary: summarizeAbsence(state, advanced) }
}

const DURATION_UNITS: readonly (readonly [ms: number, name: string])[] = [
  [86_400_000, 'day'],
  [3_600_000, 'hour'],
  [60_000, 'minute'],
]

/**
 * An absence in words, rounded down to its largest whole unit.
 *
 * Deliberately vague — "about 3 hours" is what the player remembers anyway,
 * and a precise figure invites them to check the arithmetic on numbers the
 * fixed-step catch-up only ever approximates to the second.
 */
export function formatDuration(ms: number): string {
  for (const [unitMs, name] of DURATION_UNITS) {
    const count = Math.floor(ms / unitMs)
    if (count >= 1) return `${count} ${name}${count === 1 ? '' : 's'}`
  }

  return 'a moment'
}
