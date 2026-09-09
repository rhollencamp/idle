/** Bumped when the saved shape changes in a way `migrate` cannot repair. */
export const SAVE_VERSION = 2

/** Materials the pā gathers and spends. Devotion is tracked separately. */
export type ResourceKey = 'food' | 'wood' | 'stone'

/**
 * What a villager can be put to. Every villager holds at most one job, and a
 * villager holding none is unassigned: still eating, producing nothing.
 */
export type JobKey = 'gardener' | 'woodcutter' | 'quarrier' | 'toa' | 'tohunga'

export interface GameState {
  version: typeof SAVE_VERSION
  /**
   * Stored amounts only. Rates are derived from `jobs` rather than stored
   * beside the amount, so moving a villager changes the rate on the same
   * frame instead of at the next step boundary.
   */
  resources: Record<ResourceKey, number>
  /**
   * The spendable balance, earned by tohunga keeping the karakia. It buys
   * permanent blessings and nothing else — there is no rite to cast.
   */
  devotion: number
  /**
   * The pā's standing. Accumulates alongside Devotion and is never spent or
   * reduced, so it can gate progression without spending stalling it: a
   * player who buys freely reaches the same tiers as one who hoards.
   */
  mana: number
  population: number
  /**
   * Everyone ever born into the pā, and everyone it has ever buried. Running
   * totals rather than a net figure: six born and four starved is a different
   * night from two born and none lost, and a population count cannot tell
   * them apart. They only ever rise, so any two snapshots subtract into an
   * account of what happened between them — which is what the return summary
   * reports, and what the Chronicle (step 13) will render properly once the
   * sim keeps a log rather than a tally.
   */
  births: number
  deaths: number
  /**
   * How many villagers hold each job. Sums to at most `population`; the
   * remainder are unassigned. It is never allowed to exceed the population,
   * which is what `trimJobsTo` in `village.ts` guarantees after a death.
   */
  jobs: Record<JobKey, number>
  /**
   * Progress toward the next starvation death, in [0, 1]. Held on state
   * rather than derived because it is a clock, not a level: it accumulates
   * only while food need goes unmet and unwinds when the pātaka recovers,
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
