export interface ResourceState {
  amount: number
  perSecond: number
}

export type ResourceKey = 'water'

export interface GameState {
  resources: Record<ResourceKey, ResourceState>
  /** epoch ms of the last tick this state was advanced to */
  lastTick: number
}
