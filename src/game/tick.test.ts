import { describe, expect, it } from 'vitest'
import { advanceTo } from './tick'
import type { GameState } from './types'

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    resources: { water: { amount: 0, perSecond: 1 } },
    lastTick: 1000,
    ...overrides,
  }
}

describe('advanceTo', () => {
  it('accrues resources based on elapsed seconds', () => {
    const next = advanceTo(makeState(), 1000 + 2000)

    expect(next.resources.water.amount).toBe(2)
    expect(next.lastTick).toBe(3000)
  })

  it('catches up fully when now is far in the future (offline progress)', () => {
    const oneDayMs = 24 * 60 * 60 * 1000
    const next = advanceTo(makeState(), 1000 + oneDayMs)

    expect(next.resources.water.amount).toBe(oneDayMs / 1000)
  })

  it('returns the same state unchanged when time has not advanced', () => {
    const state = makeState()

    expect(advanceTo(state, state.lastTick)).toBe(state)
    expect(advanceTo(state, state.lastTick - 1)).toBe(state)
  })

  it('does not mutate the input state', () => {
    const state = makeState()
    advanceTo(state, 5000)

    expect(state.resources.water.amount).toBe(0)
    expect(state.lastTick).toBe(1000)
  })
})
