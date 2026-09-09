import { describe, expect, it } from 'vitest'
import { createInitialState } from './initialState'
import {
  DEVOTION_PER_TOHUNGA,
  FOOD_PER_VILLAGER,
  JOB_YIELD,
  POPULATION_CAP,
  TOA_FOOD_MULTIPLIER,
  assignedCount,
  canFeedAnother,
  defaultJobs,
  devotionPerSecond,
  foodUpkeepPerSecond,
  gatherRates,
  netFoodPerSecond,
  noJobs,
  trimJobsTo,
  unassignedCount,
} from './village'
import type { GameState, JobKey } from './types'

function withJobs(
  counts: Partial<Record<JobKey, number>>,
  population: number,
): GameState {
  return {
    ...createInitialState(1000),
    population,
    jobs: { ...noJobs(), ...counts },
  }
}

describe('gatherRates', () => {
  it('credits each store to the job that works it', () => {
    const rates = gatherRates(withJobs({ gardener: 2, quarrier: 3 }, 5))

    expect(rates.food).toBeCloseTo(2 * JOB_YIELD.gardener!.perSecond, 10)
    expect(rates.stone).toBeCloseTo(3 * JOB_YIELD.quarrier!.perSecond, 10)
    expect(rates.wood).toBe(0)
  })

  it('gives an idle pā nothing at all', () => {
    expect(gatherRates(withJobs({}, 5))).toEqual({ food: 0, wood: 0, stone: 0 })
  })
})

describe('devotionPerSecond', () => {
  it('comes from the tohunga and nobody else', () => {
    expect(devotionPerSecond(withJobs({ tohunga: 3 }, 5))).toBeCloseTo(
      3 * DEVOTION_PER_TOHUNGA,
      10,
    )
    expect(devotionPerSecond(withJobs({ gardener: 5 }, 5))).toBe(0)
  })
})

describe('foodUpkeepPerSecond', () => {
  it('charges every villager, working or idle', () => {
    expect(foodUpkeepPerSecond(withJobs({ gardener: 2 }, 6))).toBeCloseTo(
      6 * FOOD_PER_VILLAGER,
      10,
    )
  })

  it('charges a toa more than the rest', () => {
    const plain = foodUpkeepPerSecond(withJobs({ gardener: 5 }, 5))
    const guarded = foodUpkeepPerSecond(withJobs({ gardener: 4, toa: 1 }, 5))

    expect(guarded - plain).toBeCloseTo(
      FOOD_PER_VILLAGER * (TOA_FOOD_MULTIPLIER - 1),
      10,
    )
  })
})

describe('netFoodPerSecond', () => {
  it('is what the gardens bring in less what the pā eats', () => {
    const state = withJobs({ gardener: 4 }, 5)

    expect(netFoodPerSecond(state)).toBeCloseTo(
      4 * JOB_YIELD.gardener!.perSecond - 5 * FOOD_PER_VILLAGER,
      10,
    )
  })

  it('goes negative when the pā out-eats its gardens', () => {
    expect(netFoodPerSecond(withJobs({ gardener: 1 }, 10))).toBeLessThan(0)
  })
})

describe('canFeedAnother', () => {
  it('needs yield to spare, not merely yield to break even', () => {
    // One gardener brings in 0.25/s; four villagers eat 0.20 and five eat
    // 0.25. Breaking even is not to spare.
    expect(canFeedAnother(withJobs({ gardener: 1 }, 4))).toBe(false)
    expect(canFeedAnother(withJobs({ gardener: 2 }, 4))).toBe(true)
  })

  it("counts a toa's larger appetite against the answer", () => {
    const state = withJobs({ gardener: 2, toa: 3 }, 9)

    expect(canFeedAnother(state)).toBe(
      canFeedAnother({ ...state, jobs: { ...state.jobs, toa: 0 } }) &&
        canFeedAnother(state),
    )
    // Swapping a gardener for a toa can only ever make the answer worse.
    expect(canFeedAnother(withJobs({ gardener: 3, toa: 0 }, 5))).toBe(true)
    expect(canFeedAnother(withJobs({ gardener: 1, toa: 2 }, 5))).toBe(false)
  })
})

describe('the job sheet', () => {
  it('counts who is working and who is idle', () => {
    const state = withJobs({ gardener: 2, toa: 1 }, 5)

    expect(assignedCount(state.jobs)).toBe(3)
    expect(unassignedCount(state)).toBe(2)
  })

  it('opens with everyone working and nobody idle', () => {
    const jobs = defaultJobs(5)

    expect(assignedCount(jobs)).toBe(5)
    expect(jobs.gardener).toBe(3)
    expect(jobs.woodcutter).toBe(1)
    expect(jobs.quarrier).toBe(1)
  })

  it('puts a very small pā entirely in the gardens', () => {
    expect(defaultJobs(2)).toEqual({ ...noJobs(), gardener: 2 })
    expect(defaultJobs(0)).toEqual(noJobs())
  })
})

describe('trimJobsTo', () => {
  it('leaves a sheet alone when it already fits', () => {
    const jobs = { ...noJobs(), gardener: 3, toa: 1 }
    trimJobsTo(jobs, 5)

    expect(jobs).toEqual({ ...noJobs(), gardener: 3, toa: 1 })
  })

  it('takes from the largest job first', () => {
    const jobs = { ...noJobs(), gardener: 5, tohunga: 1 }
    trimJobsTo(jobs, 5)

    expect(jobs.gardener).toBe(4)
    expect(jobs.tohunga).toBe(1)
  })

  it('keeps trimming until the sheet fits the pā', () => {
    const jobs = { ...noJobs(), gardener: 4, woodcutter: 4 }
    trimJobsTo(jobs, 3)

    expect(assignedCount(jobs)).toBe(3)
  })

  it('gives up rather than looping when there is nobody left to take', () => {
    const jobs = noJobs()
    trimJobsTo(jobs, -5)

    expect(jobs).toEqual(noJobs())
  })
})

describe('the opening pā', () => {
  it('gathers more than it eats, at its starting size and at its cap', () => {
    const state = createInitialState()

    expect(netFoodPerSecond(state)).toBeGreaterThan(0)
    // Growing into every house must not be what starves it. Newborns garden,
    // so the check is against the roster the pā would actually have.
    const full = {
      ...state,
      population: POPULATION_CAP,
      jobs: {
        ...state.jobs,
        gardener: state.jobs.gardener + (POPULATION_CAP - state.population),
      },
    }
    expect(netFoodPerSecond(full)).toBeGreaterThan(0.01)
  })
})
