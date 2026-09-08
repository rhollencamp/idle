import { describe, expect, it } from 'vitest'
import { createInitialState } from './initialState'
import { SAVE_VERSION } from './types'

describe('createInitialState', () => {
  it('starts a village with no faith and the current time as lastTick', () => {
    const before = Date.now()
    const state = createInitialState()

    expect(state.version).toBe(SAVE_VERSION)
    expect(state.faith.amount).toBe(0)
    expect(state.lifetimeFaith).toBe(0)
    expect(state.population).toBeGreaterThan(0)
    expect(state.lastTick).toBeGreaterThanOrEqual(before)
    expect(state.step).toBe(0)
    expect(Number.isFinite(state.seed)).toBe(true)
  })

  it('gives villages started a moment apart different seeds', () => {
    const now = 1_700_000_000_000

    expect(createInitialState(now).seed).not.toBe(
      createInitialState(now + 1).seed,
    )
  })

  it('is reproducible when given the same creation time', () => {
    const now = 1_700_000_000_000

    expect(createInitialState(now)).toEqual(createInitialState(now))
  })
})
