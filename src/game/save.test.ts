import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialState } from './initialState'
import {
  clearSave,
  loadState,
  migrate,
  parseSave,
  saveState,
  serializeSave,
} from './save'
import { SAVE_VERSION, type GameState } from './types'

const SAVE_KEY = `mate-atua:save:v${SAVE_VERSION}`
const LEGACY_V1_KEY = 'castaway-idle:save:v1'
const LEGACY_NAME_KEY = 'island-god:save:v2'

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

  it('fills in seed and step for a save written before they existed', () => {
    const { seed: _seed, step: _step, ...preSeed } = makeState()

    const migrated = migrate(preSeed)

    expect(migrated).not.toBeNull()
    expect(Number.isFinite(migrated?.seed)).toBe(true)
    expect(migrated?.step).toBe(0)
    // Derived from lastTick, so reloading the same save keeps the same seed.
    expect(migrate(preSeed)?.seed).toBe(migrated?.seed)
  })

  it('fills in starvation for a save written before famines existed', () => {
    const { starvation: _starvation, ...preFamine } = makeState()

    expect(migrate(preFamine)?.starvation).toBe(0)
  })

  it('keeps a stored seed and step rather than resetting them', () => {
    const state = makeState({ seed: 777, step: 42 })

    const migrated = migrate(JSON.parse(JSON.stringify(state)))

    expect(migrated?.seed).toBe(777)
    expect(migrated?.step).toBe(42)
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

  it('starts fresh from a save written under the old game name', () => {
    // The key carries the game's name, so a rename retires the old key. The
    // blob under it is structurally fine and simply has nowhere to go — the
    // point of the test is that it is cleared rather than left to sit in a
    // player's storage forever.
    const stranded = makeState({ lifetimeFaith: 500 })
    localStorage.setItem(LEGACY_NAME_KEY, JSON.stringify(stranded))

    expect(loadState().lifetimeFaith).toBe(0)
    expect(localStorage.getItem(LEGACY_NAME_KEY)).toBeNull()
  })
})

describe('clearSave', () => {
  it('removes the saved state', () => {
    saveState(makeState({ lifetimeFaith: 99 }))
    clearSave()

    expect(loadState().lifetimeFaith).toBe(0)
  })
})

describe('serializeSave / parseSave', () => {
  it('round-trips a save through text', () => {
    const state = makeState({ lifetimeFaith: 42 })

    expect(parseSave(serializeSave(state))).toEqual(state)
  })

  it('reads an export the same way a load would', () => {
    // The exported blob goes through `migrate`, so a save written before
    // `starvation` existed is repaired on import rather than rejected.
    const { starvation: _starvation, ...older } = makeState()

    expect(parseSave(JSON.stringify(older))?.starvation).toBe(0)
  })

  it('rejects text that is not a save', () => {
    expect(parseSave('not json at all')).toBeNull()
    expect(parseSave('{}')).toBeNull()
    expect(parseSave(JSON.stringify({ version: 1 }))).toBeNull()
  })
})
