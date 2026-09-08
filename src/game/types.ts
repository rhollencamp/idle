/** Bumped when the saved shape changes in a way `migrate` cannot repair. */
export const SAVE_VERSION = 2

export interface ResourceState {
  amount: number
  perSecond: number
}

/** Materials the village gathers and spends. Faith is tracked separately. */
export type ResourceKey = 'food' | 'wood' | 'stone'

export interface GameState {
  version: typeof SAVE_VERSION
  resources: Record<ResourceKey, ResourceState>
  /**
   * The spendable Faith balance and its income. Miracles and prayers draw
   * this down; progression does not key off it.
   */
  faith: ResourceState
  /**
   * Total Faith ever earned. Only ever increases, so spending freely never
   * stalls progression — every unlock is gated on this instead of `faith`.
   */
  lifetimeFaith: number
  population: number
  /**
   * Progress toward the next starvation death, in [0, 1]. Held on state
   * rather than derived because it is a clock, not a level: it accumulates
   * only while food need goes unmet and unwinds when the granary recovers,
   * so a brief shortfall costs nothing.
   */
  starvation: number
  /**
   * Seeds every random draw the sim makes. Fixed for the life of a save, so
   * the same absence always resolves the same way.
   */
  seed: number
  /**
   * How many fixed steps have been simulated. Combined with `seed` it indexes
   * the PRNG, which is why it is stored rather than derived from elapsed time.
   */
  step: number
  /**
   * epoch ms of the last simulated step boundary. Lags `now` by up to one
   * step: the leftover is carried rather than dropped, so no time is lost.
   */
  lastTick: number
}
