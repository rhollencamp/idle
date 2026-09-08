import { beforeEach, describe, expect, it } from 'vitest'
import { clearSave, loadState, saveState } from './save'
import type { GameState } from './types'

const SAVE_KEY = 'castaway-idle:save:v1'

beforeEach(() => {
  localStorage.clear()
})

describe('loadState', () => {
  it('returns a fresh state when nothing is saved', () => {
    expect(loadState().resources.water.amount).toBe(0)
  })

  it('round-trips a saved state', () => {
    const state: GameState = {
      resources: { water: { amount: 12, perSecond: 2 } },
      lastTick: 500,
    }
    saveState(state)

    expect(loadState()).toEqual(state)
  })

  it('falls back to a fresh state on corrupt JSON', () => {
    localStorage.setItem(SAVE_KEY, '{not json')

    expect(loadState().resources.water.amount).toBe(0)
  })

  it('falls back to a fresh state when the saved shape is missing required fields', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ resources: {} }))

    expect(loadState().resources.water.amount).toBe(0)
  })
})

describe('clearSave', () => {
  it('removes the saved state', () => {
    saveState({
      resources: { water: { amount: 5, perSecond: 1 } },
      lastTick: 1,
    })
    clearSave()

    expect(loadState().resources.water.amount).toBe(0)
  })
})
