import { describe, expect, it } from 'vitest'
import { createRng } from './rng'
import { advanceTo, MAX_STEPS_PER_ADVANCE, STEP_MS } from './tick'
import {
  BIRTH_FOOD_COST,
  DEVOTION_PER_TOHUNGA,
  FOOD_CAP,
  FOOD_PER_VILLAGER,
  JOB_YIELD,
  MIN_POPULATION,
  POPULATION_CAP,
  SECONDS_PER_STARVATION_DEATH,
  TOA_FOOD_MULTIPLIER,
  noJobs,
} from './village'
import { assignedCount } from './village'
import { SAVE_VERSION, type GameState, type JobKey } from './types'

const FOOD_PER_GARDENER = JOB_YIELD.gardener!.perSecond
const WOOD_PER_WOODCUTTER = JOB_YIELD.woodcutter!.perSecond

function jobs(counts: Partial<Record<JobKey, number>>): Record<JobKey, number> {
  return { ...noJobs(), ...counts }
}

/** Five villagers: four in the gardens, one in the trees. */
function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: SAVE_VERSION,
    resources: { food: 0, wood: 0, stone: 0 },
    devotion: 0,
    mana: 0,
    population: 5,
    jobs: jobs({ gardener: 4, woodcutter: 1 }),
    starvation: 0,
    seed: 424242,
    step: 0,
    lastTick: 1000,
    ...overrides,
  }
}

describe('advanceTo', () => {
  it('accrues each gathered store from the villagers working it', () => {
    const next = advanceTo(makeState(), 1000 + 2000)

    expect(next.resources.wood).toBeCloseTo(2 * WOOD_PER_WOODCUTTER, 10)
    // Nobody is at the quarry.
    expect(next.resources.stone).toBe(0)
    expect(next.lastTick).toBe(3000)
  })

  it('nets what the pā eats out of what its gardeners gather', () => {
    const next = advanceTo(makeState(), 1000 + 2000)

    const gathered = 4 * FOOD_PER_GARDENER * 2
    const eaten = 5 * FOOD_PER_VILLAGER * 2
    expect(next.resources.food).toBeCloseTo(gathered - eaten, 10)
  })

  it('accrues devotion into both the balance and the standing', () => {
    const praying = makeState({ jobs: jobs({ gardener: 3, tohunga: 2 }) })

    const next = advanceTo(praying, 1000 + 10_000)

    expect(next.devotion).toBeCloseTo(2 * DEVOTION_PER_TOHUNGA * 10, 10)
    expect(next.mana).toBeCloseTo(next.devotion, 10)
  })

  it('grows mana even when devotion has been spent down', () => {
    const spent = makeState({
      jobs: jobs({ gardener: 3, tohunga: 2 }),
      devotion: 0,
      mana: 100,
    })

    const next = advanceTo(spent, 1000 + 10_000)

    expect(next.devotion).toBeCloseTo(2, 10)
    expect(next.mana).toBeCloseTo(102, 10)
  })

  it('earns nothing at the shrine when no one keeps the karakia', () => {
    const next = advanceTo(makeState(), 1000 + 10_000)

    expect(next.devotion).toBe(0)
    expect(next.mana).toBe(0)
  })

  it('catches up fully when now is far in the future (offline progress)', () => {
    const oneDayMs = 24 * 60 * 60 * 1000
    const next = advanceTo(makeState(), 1000 + oneDayMs)

    expect(next.resources.wood).toBeCloseTo(
      (WOOD_PER_WOODCUTTER * oneDayMs) / 1000,
      6,
    )
  })

  it('returns the same state unchanged when time has not advanced', () => {
    const state = makeState()

    expect(advanceTo(state, state.lastTick)).toBe(state)
    expect(advanceTo(state, state.lastTick - 1)).toBe(state)
  })

  it('holds back a partial step rather than dropping or spending it', () => {
    const state = makeState()

    // Less than a step: nothing simulated, and lastTick does not move, so the
    // time is still owed.
    expect(advanceTo(state, state.lastTick + STEP_MS - 1)).toBe(state)

    // A step and a half: one step runs, the half stays on the clock.
    const next = advanceTo(state, state.lastTick + STEP_MS * 1.5)
    expect(next.step).toBe(1)
    expect(next.lastTick).toBe(state.lastTick + STEP_MS)
  })

  it('does not mutate the input state', () => {
    const state = makeState()
    advanceTo(state, 5000)

    expect(state.resources.food).toBe(0)
    expect(state.population).toBe(5)
    expect(state.jobs.gardener).toBe(4)
    expect(state.devotion).toBe(0)
    expect(state.mana).toBe(0)
    expect(state.lastTick).toBe(1000)
  })
})

describe('advanceTo determinism', () => {
  const oneHourMs = 60 * 60 * 1000

  function advanceInChunks(state: GameState, chunkMs: number, chunks: number) {
    let current = state
    for (let i = 1; i <= chunks; i += 1) {
      current = advanceTo(current, state.lastTick + chunkMs * i)
    }
    return current
  }

  it('resolves an hour identically however the time is divided', () => {
    const state = makeState()

    const inOneCall = advanceTo(state, state.lastTick + oneHourMs)
    const inMinutes = advanceInChunks(state, 60 * 1000, 60)
    const inSeconds = advanceInChunks(state, 1000, 3600)

    expect(inMinutes).toEqual(inOneCall)
    expect(inSeconds).toEqual(inOneCall)
  })

  it('leaves the PRNG at the same place however the time is divided', () => {
    const state = makeState()
    const stream = (result: GameState) => {
      const rng = createRng(result.seed, result.step, 'events')
      return [rng(), rng(), rng(), rng()]
    }

    const inOneCall = advanceTo(state, state.lastTick + oneHourMs)
    const inSeconds = advanceInChunks(state, 1000, 3600)

    expect(stream(inSeconds)).toEqual(stream(inOneCall))
  })

  it('carries the seed forward untouched', () => {
    const state = makeState()

    expect(advanceTo(state, state.lastTick + oneHourMs).seed).toBe(state.seed)
  })
})

describe('advanceTo step budget', () => {
  it('covers a multi-day absence without coarsening', () => {
    const fourDaysMs = 4 * 24 * 60 * 60 * 1000
    const state = makeState()

    const next = advanceTo(state, state.lastTick + fourDaysMs)

    // Every step is still the base width, so nothing about this span is
    // resolved more coarsely than it would be watching it happen.
    expect(next.step).toBe(fourDaysMs / STEP_MS)
    expect(next.lastTick).toBe(state.lastTick + fourDaysMs)
  })

  it('coarsens the step instead of running millions of them', () => {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    const state = makeState()

    const startedAt = performance.now()
    const next = advanceTo(state, state.lastTick + thirtyDaysMs)
    const elapsedMs = performance.now() - startedAt

    expect(next.step).toBeLessThanOrEqual(MAX_STEPS_PER_ADVANCE)
    // A guard against per-step cost regressing by an order of magnitude, not
    // a performance target. Measured on a slow container: ~95ms warm, and up
    // to ~150ms cold or under load. The bound is set well clear of that so a
    // busy runner never trips it — an actual regression shows up as
    // seconds, not as a hundred milliseconds.
    expect(elapsedMs).toBeLessThan(600)
    // A coarser step still covers the whole absence, so nothing accrues slowly.
    expect(next.resources.wood).toBeCloseTo(
      (WOOD_PER_WOODCUTTER * thirtyDaysMs) / 1000,
      3,
    )
  })

  it('keeps the clock consistent so a follow-up call has nothing to redo', () => {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    const state = makeState()
    const target = state.lastTick + thirtyDaysMs

    const next = advanceTo(state, target)
    // Flooring the coarse step can leave a remainder; it is still owed, never
    // simulated twice.
    expect(next.lastTick).toBeLessThanOrEqual(target)
    expect(advanceTo(next, target).lastTick).toBeLessThanOrEqual(target)
  })
})

describe('population growth', () => {
  const oneHourMs = 60 * 60 * 1000

  it('grows a well-fed pā to its housing cap and holds it there', () => {
    // Enough gardeners that the untrained never out-eat the gardens.
    const state = makeState({ jobs: jobs({ gardener: 5 }) })

    const grown = advanceTo(state, 1000 + oneHourMs)
    expect(grown.population).toBe(POPULATION_CAP)

    // Another hour with nowhere to put anyone changes nothing but the stores.
    const later = advanceTo(grown, grown.lastTick + oneHourMs)
    expect(later.population).toBe(POPULATION_CAP)
    expect(later.starvation).toBe(0)
  })

  it('leaves a newborn untrained, for the player to place', () => {
    const state = makeState({
      resources: { food: BIRTH_FOOD_COST, wood: 0, stone: 0 },
    })

    const next = advanceTo(state, state.lastTick + STEP_MS)

    expect(next.population).toBe(6)
    // The roster is untouched: a trade is given once, by the player, and a
    // birth during an absence keeps the choice rather than spending it.
    expect(next.jobs).toEqual(state.jobs)
    expect(next.population - assignedCount(next.jobs)).toBe(1)
  })

  it('stops giving births once the untrained cost more than the gardens bring in', () => {
    // Nobody trains the newborns, so each one is pure upkeep. The queue needs
    // no cap of its own: the pā stops breeding when it can no longer feed the
    // next mouth from what it already gathers.
    // Two gardeners bring in 0.5/s, which covers nine mouths and no more.
    const state = makeState({ population: 5, jobs: jobs({ gardener: 2 }) })

    const settled = advanceTo(state, state.lastTick + 24 * 60 * 60 * 1000)

    expect(settled.population).toBe(9)
    expect(settled.population).toBeLessThan(POPULATION_CAP)
    // It stopped short of the housing cap on food alone, and it never went
    // hungry doing it — the untrained are a brake, not a famine.
    expect(settled.jobs.gardener).toBe(2)
    expect(settled.starvation).toBe(0)
  })

  it('spends food on each birth', () => {
    const state = makeState({
      resources: { food: BIRTH_FOOD_COST, wood: 0, stone: 0 },
    })

    const next = advanceTo(state, state.lastTick + STEP_MS)

    // The stock paid for the villager; only the step's own surplus is left,
    // eaten into by the five who were alive to eat it. The newborn starts
    // costing food from the next step.
    const surplus = 4 * FOOD_PER_GARDENER - 5 * FOOD_PER_VILLAGER
    expect(next.resources.food).toBeCloseTo(surplus, 6)
  })

  it('stops growing at the size its gardens can feed, short of the cap', () => {
    // One gardener feeds four with a little to spare, but not five. The other
    // three are unassigned: they eat, and they bring in nothing.
    const state = makeState({
      population: 4,
      jobs: jobs({ gardener: 1 }),
    })

    const settled = advanceTo(state, state.lastTick + 12 * oneHourMs)

    expect(settled.population).toBe(4)
    expect(settled.population).toBeLessThan(POPULATION_CAP)
    // It banked plenty of food; what it could not do is feed a fifth mouth.
    expect(settled.resources.food).toBeGreaterThan(BIRTH_FOOD_COST)
    expect(settled.starvation).toBe(0)
  })

  it('discards food gathered past the pātaka', () => {
    const state = makeState({
      population: POPULATION_CAP,
      jobs: jobs({ gardener: POPULATION_CAP }),
      resources: { food: FOOD_CAP - 1, wood: 0, stone: 0 },
    })

    const next = advanceTo(state, state.lastTick + 60 * STEP_MS)

    expect(next.resources.food).toBe(FOOD_CAP)
  })
})

describe('toa', () => {
  it('gather nothing and eat more than everyone else', () => {
    // At the housing cap, so a birth cannot muddy the comparison.
    const working = makeState({
      population: POPULATION_CAP,
      jobs: jobs({ gardener: POPULATION_CAP }),
    })
    const guarded = makeState({
      population: POPULATION_CAP,
      jobs: jobs({ gardener: POPULATION_CAP - 1, toa: 1 }),
    })

    const oneMinuteMs = 60_000
    const a = advanceTo(working, working.lastTick + oneMinuteMs)
    const b = advanceTo(guarded, guarded.lastTick + oneMinuteMs)

    // One fewer gardener costs a gardener's yield, and the toa eats the
    // difference between an ordinary appetite and their own on top.
    const lostYield = FOOD_PER_GARDENER * 60
    const extraAppetite = FOOD_PER_VILLAGER * (TOA_FOOD_MULTIPLIER - 1) * 60
    expect(a.resources.food - b.resources.food).toBeCloseTo(
      lostYield + extraAppetite,
      6,
    )
  })
})

describe('starvation', () => {
  const oneMinuteMs = SECONDS_PER_STARVATION_DEATH * 1000

  /** Ten villagers and nobody in the gardens. */
  function makeFamine(overrides: Partial<GameState> = {}): GameState {
    return makeState({ population: 10, jobs: noJobs(), ...overrides })
  }

  it('takes one villager per starvation interval, and not before', () => {
    const state = makeFamine()

    expect(
      advanceTo(state, state.lastTick + oneMinuteMs - STEP_MS).population,
    ).toBe(10)
    expect(advanceTo(state, state.lastTick + oneMinuteMs).population).toBe(9)
    expect(advanceTo(state, state.lastTick + 5 * oneMinuteMs).population).toBe(
      5,
    )
  })

  it('never lets the pātaka go negative', () => {
    const state = makeFamine()

    expect(advanceTo(state, state.lastTick + oneMinuteMs).resources.food).toBe(
      0,
    )
  })

  it('takes the dead off the job sheet', () => {
    // Every villager is a toa, so each death has to come off that job or the
    // rates would go on counting people who are gone.
    const state = makeFamine({ jobs: jobs({ toa: 10 }) })

    const next = advanceTo(state, state.lastTick + 3 * oneMinuteMs)

    expect(next.population).toBe(7)
    expect(next.jobs.toa).toBe(7)
  })

  it('loses the unassigned before it loses anyone doing a job', () => {
    // Nine of the ten hold a job, so the first death costs the pā the idle
    // villager and no work at all. Slack is spent before the roster is.
    const state = makeFamine({ jobs: jobs({ woodcutter: 8, tohunga: 1 }) })

    const first = advanceTo(state, state.lastTick + oneMinuteMs)

    expect(first.population).toBe(9)
    expect(first.jobs.woodcutter).toBe(8)
    expect(first.jobs.tohunga).toBe(1)
  })

  it('then takes from the largest job rather than emptying a small one', () => {
    const state = makeFamine({ jobs: jobs({ woodcutter: 8, tohunga: 1 }) })

    const next = advanceTo(state, state.lastTick + 3 * oneMinuteMs)

    // Three dead: the idle one, then two woodcutters. The lone tohunga is
    // never the one taken while a bigger job has someone to give.
    expect(next.population).toBe(7)
    expect(next.jobs.woodcutter).toBe(6)
    expect(next.jobs.tohunga).toBe(1)
  })

  it('shrinks a pā toward what it can feed rather than emptying it', () => {
    // One gardener against ten mouths: most of them have to go, but the pā
    // stops shrinking once the gardens can cover who is left.
    const state = makeFamine({ jobs: jobs({ gardener: 1 }) })

    const settled = advanceTo(state, state.lastTick + 12 * 60 * oneMinuteMs)
    const muchLater = advanceTo(
      settled,
      settled.lastTick + 12 * 60 * oneMinuteMs,
    )

    expect(settled.population).toBeGreaterThan(MIN_POPULATION)
    // It found a floor and stayed there rather than dwindling away.
    expect(muchLater.population).toBe(settled.population)
    expect(muchLater.starvation).toBe(0)
    // The one gardener is never the villager starvation takes, because a
    // death comes off the largest job and they are alone in theirs.
    expect(muchLater.jobs.gardener).toBe(1)
  })

  it('eats through a warband before it touches the gardens, and recovers', () => {
    // Trades are permanent, so a famine that took the last gardener would
    // leave a pā that can never gather again — alive at the population floor
    // and finished. Instead the toa go first, and the pā rights itself.
    const state = makeFamine({ jobs: jobs({ gardener: 1, toa: 9 }) })

    const settled = advanceTo(state, state.lastTick + 12 * 60 * oneMinuteMs)

    expect(settled.jobs.gardener).toBe(1)
    expect(settled.jobs.toa).toBeLessThan(9)
    expect(settled.population).toBeGreaterThan(MIN_POPULATION)
    // The famine ended: the survivors are being fed and are banking food.
    expect(settled.starvation).toBe(0)
    expect(settled.resources.food).toBeGreaterThan(0)
  })

  it('forgives a shortfall that ends before it costs anyone', () => {
    const state = makeFamine()

    const hungry = advanceTo(state, state.lastTick + oneMinuteMs / 2)
    expect(hungry.population).toBe(10)
    expect(hungry.starvation).toBeCloseTo(0.5, 6)

    const relieved = advanceTo(
      { ...hungry, jobs: jobs({ gardener: 10 }) },
      hungry.lastTick + oneMinuteMs / 2,
    )
    expect(relieved.population).toBe(10)
    expect(relieved.starvation).toBe(0)
  })

  it('never takes the last villager, however long the famine runs', () => {
    const state = makeFamine()

    const oneYearMs = 365 * 24 * 60 * 60 * 1000
    const next = advanceTo(state, state.lastTick + oneYearMs)

    expect(next.population).toBe(MIN_POPULATION)
    // The clock is held at the brink rather than banking deaths it cannot
    // take, so relief clears it in one interval and not a century later.
    expect(next.starvation).toBeLessThanOrEqual(1)
  })

  it('runs at the same rate through a coarsened catch-up step', () => {
    const state = makeFamine()
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

    // Far past the step budget, so every step here is a wide one.
    const coarse = advanceTo(state, state.lastTick + thirtyDaysMs)

    expect(coarse.population).toBe(MIN_POPULATION)
  })
})
