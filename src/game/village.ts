import type { GameState, JobKey, ResourceKey } from './types'

/**
 * The pā's tuning constants and the pure rate helpers that read them. The
 * rules that *apply* them live in `simulateStep` (`tick.ts`); this module
 * exists so the UI can label a cap, a cost, or a rate without reaching into
 * the tick.
 *
 * Every cap here is a fixed placeholder for a building that raises it later:
 * houses for the population cap, the pātaka for the food cap (step 14).
 */

/** Every job, in the order the UI lists them. Also the tie-break order. */
export const JOB_KEYS: readonly JobKey[] = [
  'gardener',
  'woodcutter',
  'quarrier',
  'toa',
  'tohunga',
]

/** What one villager in each gathering job brings in per second. */
export const JOB_YIELD: Readonly<
  Partial<Record<JobKey, { resource: ResourceKey; perSecond: number }>>
> = {
  gardener: { resource: 'food', perSecond: 0.25 },
  woodcutter: { resource: 'wood', perSecond: 0.15 },
  quarrier: { resource: 'stone', perSecond: 0.1 },
}

/**
 * The non-food yields, flattened once at module load for the tick's hot loop.
 *
 * `simulateStep` runs up to `MAX_STEPS_PER_ADVANCE` times in a single
 * catch-up, so walking `JOB_KEYS` and looking each job up in `JOB_YIELD` per
 * step is not free — it is a megamorphic property access and a fresh iterator
 * every time. Flattening it here costs nothing and keeps the tick reading a
 * dense array of plain numbers.
 */
export const GATHERED_YIELDS: readonly {
  job: JobKey
  resource: ResourceKey
  perSecond: number
}[] = JOB_KEYS.flatMap((job) => {
  const spec = JOB_YIELD[job]
  return spec && spec.resource !== 'food' ? [{ job, ...spec }] : []
})

/** Hoisted for the same reason: the tick reads it once per step. */
const FOOD_PER_GARDENER = JOB_YIELD.gardener?.perSecond ?? 0

/** Devotion one tohunga earns per second, before the shrine multiplier. */
export const DEVOTION_PER_TOHUNGA = 0.1

/** Raised by the shrine and its upgrades later; pinned at 1 for now. */
export const SHRINE_MULTIPLIER = 1

/** Food each villager eats per second. */
export const FOOD_PER_VILLAGER = 0.05

/**
 * What a toa eats, as a multiple of everyone else.
 *
 * A toa already costs the pā whatever they would have gathered; eating more
 * on top is what stops a large village from simply carrying a large warband
 * at no running cost, and what makes mustering only when a wave lands a real
 * alternative rather than a strictly worse one.
 */
export const TOA_FOOD_MULTIPLIER = 1.5

/** Housing headroom. A birth needs room under this; houses raise it later. */
export const POPULATION_CAP = 10

/** Pātaka size. Food gathered past it is discarded. */
export const FOOD_CAP = 200

/** Food a birth consumes. Surplus food is how a pā turns into people. */
export const BIRTH_FOOD_COST = 50

/**
 * How long an unfed pā takes to lose one villager.
 *
 * Starvation is the failure state the player is meant to come back and fix,
 * so it is deliberately slow: a pā that runs out of food shrinks toward the
 * size its gardens can feed rather than collapsing. Coming back to a poorer
 * village is the intended cost of absence; coming back to a wiped one is not.
 */
export const SECONDS_PER_STARVATION_DEATH = 60

/**
 * Starvation never takes the last villager.
 *
 * Yields derive from jobs, so an empty pā can never gather again: a village
 * at zero is a wipe with no way back, precisely the outcome the design rules
 * out. Leaving one alive keeps every absence recoverable.
 */
export const MIN_POPULATION = 1

/** An empty job sheet, for building one up. */
export function noJobs(): Record<JobKey, number> {
  return { gardener: 0, woodcutter: 0, quarrier: 0, toa: 0, tohunga: 0 }
}

/** How many villagers hold a job of any kind. */
export function assignedCount(jobs: Record<JobKey, number>): number {
  return JOB_KEYS.reduce((total, job) => total + jobs[job], 0)
}

/** Villagers holding no job. They still eat; they produce nothing. */
export function unassignedCount(state: GameState): number {
  return state.population - assignedCount(state.jobs)
}

/**
 * Puts a whole population to work: everyone gardens except one woodcutter and
 * one quarrier.
 *
 * This is for rebuilding a save that has no job sheet to read. It is not the
 * opening roster — a new pā starts with children waiting for a trade, which
 * is the game's first decision. A migrated village gets no such choice, and
 * leaving it untrained would only starve it.
 */
export function defaultJobs(population: number): Record<JobKey, number> {
  const jobs = noJobs()
  if (population <= 0) return jobs

  jobs.woodcutter = population >= 3 ? 1 : 0
  jobs.quarrier = population >= 3 ? 1 : 0
  jobs.gardener = population - jobs.woodcutter - jobs.quarrier
  return jobs
}

/**
 * Which trade loses someone next, or `null` when nobody is left to lose.
 *
 * Gardeners go last, and that is the rule keeping a famine survivable. A
 * trade is for life, so a pā that starved its way down to toa and tohunga
 * could never gather again — the population floor would keep it alive at one
 * villager forever, which is a wipe wearing a different hat. Taking the
 * others first means a starving pā trends toward being all gardeners, so the
 * famine ends itself.
 *
 * Among the rest it is the largest trade, which spreads the loss instead of
 * emptying a small specialist role on the first death. `JOB_KEYS` order
 * breaks ties, so nothing here depends on the RNG.
 */
function tradeToLose(jobs: Record<JobKey, number>): JobKey | null {
  let biggest: JobKey | null = null

  for (const job of JOB_KEYS) {
    if (job === 'gardener' || jobs[job] === 0) continue
    if (biggest === null || jobs[job] > jobs[biggest]) biggest = job
  }
  if (biggest !== null) return biggest

  return jobs.gardener > 0 ? 'gardener' : null
}

/**
 * Drops assignments until no more villagers are working than exist.
 *
 * Deaths do not choose who they take, so the job sheet has to be reconciled
 * afterwards or it would claim workers the pā no longer has — and every rate
 * derived from it would be a lie. Note that this only bites once the
 * untrained are gone: while any child is waiting for a trade, a death costs
 * the pā that child and no work at all.
 */
export function trimJobsTo(
  jobs: Record<JobKey, number>,
  population: number,
): void {
  let over = assignedCount(jobs) - Math.max(population, 0)

  while (over > 0) {
    const job = tradeToLose(jobs)
    // Nobody holds a trade, so there is nothing left to trim. Only reachable
    // from a malformed save, but looping forever on one is worse.
    if (job === null) return

    jobs[job] -= 1
    over -= 1
  }
}

/**
 * What each store gains per second from the villagers working it.
 *
 * This allocates, so it is for the UI and for tests. The tick reads the two
 * rates it needs — `foodYieldPerSecond` here, and the gathered stores by
 * walking `JOB_YIELD` directly — because a catch-up runs this hundreds of
 * thousands of times and an object per step is not free.
 */
export function gatherRates(state: GameState): Record<ResourceKey, number> {
  const rates: Record<ResourceKey, number> = { food: 0, wood: 0, stone: 0 }

  for (const job of JOB_KEYS) {
    const yieldSpec = JOB_YIELD[job]
    if (yieldSpec)
      rates[yieldSpec.resource] += state.jobs[job] * yieldSpec.perSecond
  }

  return rates
}

/** What the gardens bring in per second, without building a rate table. */
export function foodYieldPerSecond(state: GameState): number {
  return state.jobs.gardener * FOOD_PER_GARDENER
}

/** What the tohunga earn per second at the shrine. */
export function devotionPerSecond(state: GameState): number {
  return state.jobs.tohunga * DEVOTION_PER_TOHUNGA * SHRINE_MULTIPLIER
}

function upkeepFor(population: number, toa: number): number {
  const rest = Math.max(population - toa, 0)

  return (rest + toa * TOA_FOOD_MULTIPLIER) * FOOD_PER_VILLAGER
}

/** What the pā eats per second, given who is holding a spear. */
export function foodUpkeepPerSecond(state: GameState): number {
  return upkeepFor(state.population, state.jobs.toa)
}

/**
 * The rate the pātaka actually moves at: what the gardens bring in less what
 * the pā eats. Negative means the stores are draining.
 *
 * This, not the gardeners' gross yield, is the number to show a player or to
 * project a display from.
 */
export function netFoodPerSecond(state: GameState): number {
  return foodYieldPerSecond(state) - foodUpkeepPerSecond(state)
}

/**
 * Whether the pā could feed one more mouth from what it already gathers.
 *
 * A birth is gated on this as well as on stored food, so growth stops at the
 * size the gardens can sustain instead of overshooting and starving back. The
 * newcomer's own future work does not count toward it — the pā feeds a child
 * on today's harvest, not on the promise of the child's. The UI asks the same
 * question, so a progress bar never fills toward a birth the sim has ruled
 * out.
 */
export function canFeedAnother(state: GameState): boolean {
  return (
    upkeepFor(state.population + 1, state.jobs.toa) < foodYieldPerSecond(state)
  )
}
