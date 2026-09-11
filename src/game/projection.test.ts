import { describe, expect, it } from 'vitest'
import { createInitialState } from './initialState'
import {
  MAX_PROJECTION_MS,
  projectAmount,
  projectFood,
  projectedGain,
} from './projection'
import { FOOD_CAP, noJobs } from './village'
import type { GameState } from './types'

const AMOUNT = 10
const RATE = 2

describe('projectAmount', () => {
  it('adds the accrual earned since the last simulated step', () => {
    expect(projectAmount(AMOUNT, RATE, 1000, 1500)).toBe(11)
  })

  it('shows the simulated amount exactly at a step boundary', () => {
    expect(projectAmount(AMOUNT, RATE, 1000, 1000)).toBe(10)
  })

  it('never runs backwards when the clock is behind lastTick', () => {
    expect(projectAmount(AMOUNT, RATE, 1000, 900)).toBe(10)
  })

  it('caps how far ahead it will guess', () => {
    const capped = projectAmount(AMOUNT, RATE, 0, MAX_PROJECTION_MS * 10)

    expect(capped).toBe(10 + (2 * MAX_PROJECTION_MS) / 1000)
  })
})

describe('projectedGain', () => {
  it('matches the delta projectAmount applies', () => {
    expect(projectedGain(RATE, 1000, 1500) + AMOUNT).toBe(
      projectAmount(AMOUNT, RATE, 1000, 1500),
    )
  })
})

describe('projectFood', () => {
  // Four gardeners bring in 1/s; ten mouths eat 0.5/s. Net half a unit.
  const state: GameState = {
    ...createInitialState(1000),
    resources: { food: 100, wood: 0, stone: 0 },
    population: 10,
    jobs: { ...noJobs(), gardener: 4 },
    lastTick: 1000,
  }

  it("projects at the net rate, not the gardeners' gross yield", () => {
    expect(projectFood(state, 1500)).toBeCloseTo(100.25, 10)
  })

  it('shows the stores draining when the pā is short', () => {
    const idle = { ...state, jobs: noJobs() }

    expect(projectFood(idle, 1500)).toBeCloseTo(99.75, 10)
  })

  it('never guesses past what the sim would allow', () => {
    const empty = {
      ...state,
      resources: { ...state.resources, food: 0 },
      jobs: noJobs(),
    }
    const full = {
      ...state,
      resources: { ...state.resources, food: FOOD_CAP },
      jobs: { ...noJobs(), gardener: 10 },
    }

    expect(projectFood(empty, 5000)).toBe(0)
    expect(projectFood(full, 5000)).toBe(FOOD_CAP)
  })
})
