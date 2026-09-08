import type { GameState } from './types'

/**
 * The population/food loop's tuning constants and the pure rate helpers that
 * read them. The rules that *apply* them live in `simulateStep` (`tick.ts`);
 * this module exists so the UI can label a cap or a cost without reaching
 * into the tick.
 *
 * Every cap here is a fixed placeholder for a building that raises it later:
 * huts for the population cap, a granary for the food cap (step 11).
 */

/** Food each villager eats per second, whatever job they hold. */
export const FOOD_PER_VILLAGER = 0.05

/** Housing headroom. A birth needs room under this; huts raise it later. */
export const POPULATION_CAP = 10

/** Granary size. Food gathered past it is discarded. */
export const FOOD_CAP = 200

/** Food a birth consumes. Surplus food is how a village turns into people. */
export const BIRTH_FOOD_COST = 50

/**
 * How long an unfed village takes to lose one villager.
 *
 * Starvation is the failure state the player is meant to come back and fix,
 * so it is deliberately slow: a village that runs out of food shrinks toward
 * the size its yield can feed rather than collapsing. Coming back to a
 * poorer village is the intended cost of absence; coming back to a wiped one
 * is not.
 */
export const SECONDS_PER_STARVATION_DEATH = 60

/**
 * Starvation never takes the last villager.
 *
 * Once yields derive from jobs (step 4) an empty island can never gather
 * again, so a village at zero is a wipe with no way back — precisely the
 * outcome the design rules out. Leaving one alive keeps every absence
 * recoverable.
 */
export const MIN_POPULATION = 1

/** What the village eats per second at a given size. */
export function foodUpkeepPerSecond(population: number): number {
  return population * FOOD_PER_VILLAGER
}

/**
 * The rate the granary actually moves at: what is gathered less what is
 * eaten. Negative means the stores are draining.
 *
 * `resources.food.perSecond` is the gross yield alone — a stored placeholder
 * until step 4 derives it from foragers — so it is not the number to show a
 * player or to project a display from.
 */
export function netFoodPerSecond(state: GameState): number {
  return state.resources.food.perSecond - foodUpkeepPerSecond(state.population)
}

/**
 * Whether the village could feed one more mouth from what it gathers.
 *
 * A birth is gated on this as well as on stored food, so growth stops at the
 * size the foragers can sustain instead of overshooting and starving back.
 * The UI asks the same question, so a progress bar never fills toward a birth
 * the sim has already ruled out.
 */
export function canFeedAnother(state: GameState): boolean {
  return (
    foodUpkeepPerSecond(state.population + 1) < state.resources.food.perSecond
  )
}
