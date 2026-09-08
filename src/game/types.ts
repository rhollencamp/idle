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
  /** epoch ms of the last tick this state was advanced to */
  lastTick: number
}
