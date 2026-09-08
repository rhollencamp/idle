import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialState } from './initialState'
import { clearSave, loadState, migrate, saveState } from './save'
import { SAVE_VERSION, type GameState } from './types'

const SAVE_KEY = `island-god:save:v${SAVE_VERSION}`
const LEGACY_V1_KEY = 'castaway-idle:save:v1'

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), lastTick: 500, ...overrides }
}

beforeEach(() => {
  localStorage.clear()
})

describe('migrate', () => {
  it('accepts a well-formed current save', () => {
    const state = makeState()

    expect(migrate(JSON.parse(JSON.stringify(state)))).toEqual(state)
  })

  it('rejects a v1 save', () => {
    const v1 = {
      resources: { water: { amount: 12, perSecond: 2 } },
      lastTick: 5,
    }

    expect(migrate(v1)).toBeNull()
  })

  it('rejects garbage', () => {
    expect(migrate(null)).toBeNull()
    expect(migrate('nope')).toBeNull()
    expect(migrate(42)).toBeNull()
    expect(migrate([])).toBeNull()
  })

  it('rejects a save missing required fields', () => {
    const { lifetimeFaith: _omitted, ...missingLifetimeFaith } = makeState()

    expect(migrate(missingLifetimeFaith)).toBeNull()
    expect(migrate({ ...makeState(), faith: null })).toBeNull()
    expect(migrate({ ...makeState(), resources: {} })).toBeNull()
  })

  it('rejects non-finite numbers rather than trusting them', () => {
    expect(migrate({ ...makeState(), lastTick: Number.NaN })).toBeNull()
    expect(
      migrate({ ...makeState(), population: Number.POSITIVE_INFINITY }),
    ).toBeNull()
  })
})

describe('loadState', () => {
  it('returns a fresh state when nothing is saved', () => {
    expect(loadState().lifetimeFaith).toBe(0)
  })

  it('round-trips a saved state', () => {
    const state = makeState({ lifetimeFaith: 42 })
    saveState(state)

    expect(loadState()).toEqual(state)
  })

  it('falls back to a fresh state on corrupt JSON', () => {
    localStorage.setItem(SAVE_KEY, '{not json')

    expect(loadState().lifetimeFaith).toBe(0)
  })

  it('falls back to a fresh state when the saved shape is unusable', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ resources: {} }))

    expect(loadState().lifetimeFaith).toBe(0)
  })

  it('discards a legacy v1 save instead of crashing on it', () => {
    localStorage.setItem(
      LEGACY_V1_KEY,
      JSON.stringify({
        resources: { water: { amount: 9, perSecond: 1 } },
        lastTick: 1,
      }),
    )

    expect(loadState().lifetimeFaith).toBe(0)
    expect(localStorage.getItem(LEGACY_V1_KEY)).toBeNull()
  })
})

describe('clearSave', () => {
  it('removes the saved state', () => {
    saveState(makeState({ lifetimeFaith: 99 }))
    clearSave()

    expect(loadState().lifetimeFaith).toBe(0)
  })
})
