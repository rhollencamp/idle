import { describe, expect, it } from 'vitest'
import { createInitialState } from './initialState'
import {
  MAX_PROJECTION_MS,
  projectAmount,
  projectFood,
  projectedGain,
} from './projection'
import { FOOD_CAP } from './village'

const resource = { amount: 10, perSecond: 2 }

describe('projectAmount', () => {
  it('adds the accrual earned since the last simulated step', () => {
    expect(projectAmount(resource, 1000, 1500)).toBe(11)
  })

  it('shows the simulated amount exactly at a step boundary', () => {
    expect(projectAmount(resource, 1000, 1000)).toBe(10)
  })

  it('never runs backwards when the clock is behind lastTick', () => {
    expect(projectAmount(resource, 1000, 900)).toBe(10)
  })

  it('caps how far ahead it will guess', () => {
    const capped = projectAmount(resource, 0, MAX_PROJECTION_MS * 10)

    expect(capped).toBe(10 + (2 * MAX_PROJECTION_MS) / 1000)
  })
})

describe('projectedGain', () => {
  it('matches the delta projectAmount applies', () => {
    expect(projectedGain(2, 1000, 1500) + resource.amount).toBe(
      projectAmount(resource, 1000, 1500),
    )
  })
})

describe('projectFood', () => {
  const state = {
    ...createInitialState(1000),
    resources: {
      food: { amount: 100, perSecond: 1 },
      wood: { amount: 0, perSecond: 0 },
      stone: { amount: 0, perSecond: 0 },
    },
    population: 10,
    lastTick: 1000,
  }

  it('projects at the net rate, not the gross yield', () => {
    // 1/s gathered, 0.5/s eaten: half a second earns a quarter of a unit.
    expect(projectFood(state, 1500)).toBeCloseTo(100.25, 10)
  })

  it('shows the stores draining when the village is short', () => {
    const short = {
      ...state,
      resources: { ...state.resources, food: { amount: 100, perSecond: 0 } },
    }

    expect(projectFood(short, 1500)).toBeCloseTo(99.75, 10)
  })

  it('never guesses past what the sim would allow', () => {
    const empty = {
      ...state,
      resources: { ...state.resources, food: { amount: 0, perSecond: 0 } },
    }
    const full = {
      ...state,
      resources: {
        ...state.resources,
        food: { amount: FOOD_CAP, perSecond: 10 },
      },
    }

    expect(projectFood(empty, 5000)).toBe(0)
    expect(projectFood(full, 5000)).toBe(FOOD_CAP)
  })
})
