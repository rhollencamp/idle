import { describe, expect, it } from 'vitest'
import { createRng } from './rng'
import { advanceTo, MAX_STEPS_PER_ADVANCE, STEP_MS } from './tick'
import {
  BIRTH_FOOD_COST,
  FOOD_CAP,
  FOOD_PER_VILLAGER,
  MIN_POPULATION,
  POPULATION_CAP,
  SECONDS_PER_STARVATION_DEATH,
} from './village'
import { SAVE_VERSION, type GameState } from './types'

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: SAVE_VERSION,
    resources: {
      food: { amount: 0, perSecond: 1 },
      wood: { amount: 0, perSecond: 2 },
      stone: { amount: 0, perSecond: 0 },
    },
    faith: { amount: 0, perSecond: 0.5 },
    lifetimeFaith: 0,
    population: 5,
    starvation: 0,
    seed: 424242,
    step: 0,
    lastTick: 1000,
    ...overrides,
  }
}

describe('advanceTo', () => {
  it('accrues each gathered resource based on elapsed seconds', () => {
    const next = advanceTo(makeState(), 1000 + 2000)

    expect(next.resources.wood.amount).toBe(4)
    expect(next.resources.stone.amount).toBe(0)
    expect(next.lastTick).toBe(3000)
  })

  it('nets what the village eats out of what it gathers', () => {
    // 1/s gathered against five villagers eating 0.05/s each.
    const next = advanceTo(makeState(), 1000 + 2000)

    expect(next.resources.food.amount).toBeCloseTo(2 - 5 * 0.05 * 2, 10)
  })

  it('accrues faith into both the balance and the lifetime total', () => {
    const next = advanceTo(makeState(), 1000 + 10_000)

    expect(next.faith.amount).toBe(5)
    expect(next.lifetimeFaith).toBe(5)
  })

  it('grows lifetime faith even when the balance has been spent down', () => {
    const spent = makeState({
      faith: { amount: 0, perSecond: 0.5 },
      lifetimeFaith: 100,
    })
    const next = advanceTo(spent, 1000 + 10_000)

    expect(next.faith.amount).toBe(5)
    expect(next.lifetimeFaith).toBe(105)
  })

  it('catches up fully when now is far in the future (offline progress)', () => {
    const oneDayMs = 24 * 60 * 60 * 1000
    const next = advanceTo(makeState(), 1000 + oneDayMs)

    expect(next.resources.wood.amount).toBeCloseTo((2 * oneDayMs) / 1000, 6)
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

    expect(state.resources.food.amount).toBe(0)
    expect(state.population).toBe(5)
    expect(state.faith.amount).toBe(0)
    expect(state.lifetimeFaith).toBe(0)
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
    // A guard against per-step cost regressing, not a performance target:
    // this is ~10ms on a dev machine, so tripping it means a step got an
    // order of magnitude more expensive, not that a CI runner was busy.
    expect(elapsedMs).toBeLessThan(150)
    // A coarser step still covers the whole absence, so nothing accrues slowly.
    expect(next.resources.wood.amount).toBeCloseTo((2 * thirtyDaysMs) / 1000, 3)
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

  it('grows a well-fed village to its housing cap and holds it there', () => {
    // 1/s feeds twenty; housing is what binds.
    const state = makeState({ resources: makeState().resources })

    const grown = advanceTo(state, state.lastTick + oneHourMs)
    expect(grown.population).toBe(POPULATION_CAP)

    // Another hour with nowhere to put anyone changes nothing but the stores.
    const later = advanceTo(grown, grown.lastTick + oneHourMs)
    expect(later.population).toBe(POPULATION_CAP)
    expect(later.starvation).toBe(0)
  })

  it('spends food on each birth', () => {
    const state = makeState({
      resources: {
        food: { amount: BIRTH_FOOD_COST, perSecond: 1 },
        wood: { amount: 0, perSecond: 0 },
        stone: { amount: 0, perSecond: 0 },
      },
    })

    const next = advanceTo(state, state.lastTick + STEP_MS)

    expect(next.population).toBe(6)
    // The stock paid for the villager; only the step's own surplus is left,
    // eaten into by the five who were alive to eat it. The newcomer starts
    // costing food from the next step.
    expect(next.resources.food.amount).toBeCloseTo(1 - 5 * FOOD_PER_VILLAGER, 6)
  })

  it('stops growing at the size its yield can feed, short of the housing cap', () => {
    // 0.4/s covers seven villagers with something to spare, but not eight.
    const state = makeState({
      resources: {
        food: { amount: 0, perSecond: 0.4 },
        wood: { amount: 0, perSecond: 0 },
        stone: { amount: 0, perSecond: 0 },
      },
    })

    const settled = advanceTo(state, state.lastTick + 12 * oneHourMs)

    expect(settled.population).toBe(7)
    expect(settled.population).toBeLessThan(POPULATION_CAP)
    // Holding under its carrying capacity means it never goes hungry doing it.
    expect(settled.starvation).toBe(0)
  })

  it('discards food gathered past the granary', () => {
    const state = makeState({
      population: POPULATION_CAP,
      resources: {
        food: { amount: FOOD_CAP - 1, perSecond: 10 },
        wood: { amount: 0, perSecond: 0 },
        stone: { amount: 0, perSecond: 0 },
      },
    })

    const next = advanceTo(state, state.lastTick + 60 * STEP_MS)

    expect(next.resources.food.amount).toBe(FOOD_CAP)
  })
})

describe('starvation', () => {
  const oneMinuteMs = SECONDS_PER_STARVATION_DEATH * 1000

  /** A village of ten with nobody bringing food in. */
  function makeFamine(overrides: Partial<GameState> = {}): GameState {
    return makeState({
      population: 10,
      resources: {
        food: { amount: 0, perSecond: 0 },
        wood: { amount: 0, perSecond: 0 },
        stone: { amount: 0, perSecond: 0 },
      },
      ...overrides,
    })
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

  it('never lets the granary go negative', () => {
    const next = advanceTo(makeFamine(), makeFamine().lastTick + oneMinuteMs)

    expect(next.resources.food.amount).toBe(0)
  })

  it('shrinks a village to what its yield can feed rather than emptying it', () => {
    // 0.22/s keeps four alive. Six have to die, one per minute — slow enough
    // to be a village in trouble rather than a wipe.
    const state = makeFamine({
      resources: {
        food: { amount: 0, perSecond: 0.22 },
        wood: { amount: 0, perSecond: 0 },
        stone: { amount: 0, perSecond: 0 },
      },
    })

    const halfway = advanceTo(state, state.lastTick + 3 * oneMinuteMs)
    expect(halfway.population).toBe(7)

    const settled = advanceTo(state, state.lastTick + 12 * 60 * oneMinuteMs)
    expect(settled.population).toBe(4)
    // Fed again, the clock unwinds and the survivors start restocking.
    expect(settled.starvation).toBe(0)
    expect(settled.resources.food.amount).toBeGreaterThan(0)
  })

  it('forgives a shortfall that ends before it costs anyone', () => {
    const state = makeFamine()

    const hungry = advanceTo(state, state.lastTick + oneMinuteMs / 2)
    expect(hungry.population).toBe(10)
    expect(hungry.starvation).toBeCloseTo(0.5, 6)

    const relieved = advanceTo(
      {
        ...hungry,
        resources: { ...hungry.resources, food: { amount: 0, perSecond: 1 } },
      },
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
