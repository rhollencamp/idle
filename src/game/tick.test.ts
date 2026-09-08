import { describe, expect, it } from 'vitest'
import { advanceTo } from './tick'
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
    lastTick: 1000,
    ...overrides,
  }
}

describe('advanceTo', () => {
  it('accrues each resource based on elapsed seconds', () => {
    const next = advanceTo(makeState(), 1000 + 2000)

    expect(next.resources.food.amount).toBe(2)
    expect(next.resources.wood.amount).toBe(4)
    expect(next.resources.stone.amount).toBe(0)
    expect(next.lastTick).toBe(3000)
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

    expect(next.resources.food.amount).toBe(oneDayMs / 1000)
  })

  it('returns the same state unchanged when time has not advanced', () => {
    const state = makeState()

    expect(advanceTo(state, state.lastTick)).toBe(state)
    expect(advanceTo(state, state.lastTick - 1)).toBe(state)
  })

  it('does not mutate the input state', () => {
    const state = makeState()
    advanceTo(state, 5000)

    expect(state.resources.food.amount).toBe(0)
    expect(state.faith.amount).toBe(0)
    expect(state.lifetimeFaith).toBe(0)
    expect(state.lastTick).toBe(1000)
  })
})
