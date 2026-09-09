import { describe, expect, it } from 'vitest'
import { createInitialState } from './initialState'
import {
  FOOD_PER_VILLAGER,
  canFeedAnother,
  POPULATION_CAP,
  foodUpkeepPerSecond,
  netFoodPerSecond,
} from './village'

describe('foodUpkeepPerSecond', () => {
  it('charges every villager the same, whatever their job', () => {
    expect(foodUpkeepPerSecond(0)).toBe(0)
    expect(foodUpkeepPerSecond(8)).toBeCloseTo(8 * FOOD_PER_VILLAGER, 10)
  })
})

describe('netFoodPerSecond', () => {
  it('is what is gathered less what is eaten', () => {
    const state = createInitialState()
    state.resources.food.perSecond = 1
    state.population = 10

    expect(netFoodPerSecond(state)).toBeCloseTo(1 - 0.5, 10)
  })

  it('goes negative when the village out-eats its foragers', () => {
    const state = createInitialState()
    state.resources.food.perSecond = 0.1
    state.population = 10

    expect(netFoodPerSecond(state)).toBeLessThan(0)
  })
})

describe('the starting village', () => {
  it('gathers more than it eats, at its starting size and at its cap', () => {
    const state = createInitialState()

    expect(netFoodPerSecond(state)).toBeGreaterThan(0)
    // Growing into every hut must not be what starves it — and the margin is
    // a real surplus, not a rounding error away from one.
    expect(
      netFoodPerSecond({ ...state, population: POPULATION_CAP }),
    ).toBeGreaterThan(0.01)
  })
})

describe('canFeedAnother', () => {
  it('is true only with yield to spare for the larger village', () => {
    const state = createInitialState()
    state.resources.food.perSecond = 0.4
    // 0.4/s covers eight villagers exactly, which is not to spare: a village
    // living exactly at its means is one rounding error from a famine.
    expect(canFeedAnother({ ...state, population: 6 })).toBe(true)
    expect(canFeedAnother({ ...state, population: 7 })).toBe(false)
  })
})
