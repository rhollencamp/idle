import { describe, expect, it } from 'vitest'
import { createInitialState } from './initialState'

describe('createInitialState', () => {
  it('starts with zero resources and the current time as lastTick', () => {
    const before = Date.now()
    const state = createInitialState()

    expect(state.resources.water.amount).toBe(0)
    expect(state.lastTick).toBeGreaterThanOrEqual(before)
  })
})
